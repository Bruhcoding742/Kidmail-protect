import { storage } from './storage';

type FilterResult = {
  isInappropriate: boolean;
  reason: string;
};

class ContentFilter {
  // Default filter list with common problematic terms
  private defaultFilters: string[] = [
    "viagra", "cialis", "adult content", "xxx",
    "casino", "gambling", "lottery", "bet",
    "penis", "enlargement", "breast", "sex",
    "dating", "hookup", "one night", "prostitute",
    "porn", "porno", "pornography", "nude",
    "naked", "sexy single", "hot girl", "webcam",
    "prescription", "medication", "pharmacy",
    "loan", "credit", "debt", "mortgage", "refinance",
    "weight loss", "diet pill", "slim", "burn fat"
  ];
  
  private defaultRegexFilters: RegExp[] = [
    /\bsex\b/i,
    /\bcasino\b/i,
    /\bxxx\b/i,
    /\bporn\b/i,
    /\bgambling\b/i
  ];
  
  private customFilters: Map<number, string[]> = new Map();
  private customRegexFilters: Map<number, RegExp[]> = new Map();
  
  async loadCustomFilters() {
    try {
      // Load all filter rules
      const rules = await storage.getAllFilterRules();
      
      // Group rules by user_id
      const userRules = new Map<number, { text: string; isRegex: boolean }[]>();
      
      rules.forEach(rule => {
        if (!userRules.has(rule.user_id)) {
          userRules.set(rule.user_id, []);
        }
        userRules.get(rule.user_id)!.push({
          text: rule.rule_text,
          isRegex: rule.is_regex
        });
      });
      
      // Process each user's rules
      for (const [userId, rules] of userRules.entries()) {
        const textFilters: string[] = [];
        const regexFilters: RegExp[] = [];
        
        rules.forEach(rule => {
          if (rule.isRegex) {
            try {
              // Create RegExp from rule text
              const regex = new RegExp(rule.text, 'i');
              regexFilters.push(regex);
            } catch (e) {
              console.error(`Invalid regex pattern for user ${userId}:`, rule.text);
            }
          } else {
            textFilters.push(rule.text.toLowerCase());
          }
        });
        
        this.customFilters.set(userId, textFilters);
        this.customRegexFilters.set(userId, regexFilters);
      }
      
      console.log(`Loaded custom filters for ${userRules.size} users`);
    } catch (error) {
      console.error('Error loading custom filters:', error);
    }
  }
  
  async checkContent(subject: string, textContent: string, htmlContent: string, userId?: number, senderEmail?: string, childAccountId?: number): Promise<FilterResult> {
    // Skip filtering if the sender is trusted
    if (userId !== undefined && senderEmail) {
      const isTrusted = await storage.isEmailTrusted(senderEmail, userId, childAccountId);
      if (isTrusted) {
        return {
          isInappropriate: false,
          reason: 'Sender is trusted'
        };
      }
    }
    
    // Combine and normalize text for checking
    const allText = `${subject} ${textContent}`.toLowerCase();
    
    // First check default filters
    for (const filter of this.defaultFilters) {
      if (allText.includes(filter.toLowerCase())) {
        return {
          isInappropriate: true,
          reason: `Contains blocked term: ${filter}`
        };
      }
    }
    
    // Check default regex filters
    for (const regex of this.defaultRegexFilters) {
      if (regex.test(allText)) {
        return {
          isInappropriate: true,
          reason: `Matches blocked pattern: ${regex.source}`
        };
      }
    }
    
    // If user ID is provided, check user-specific filters
    if (userId !== undefined) {
      // Check custom text filters for this user
      const userFilters = this.customFilters.get(userId) || [];
      for (const filter of userFilters) {
        if (allText.includes(filter)) {
          return {
            isInappropriate: true,
            reason: `Contains custom blocked term: ${filter}`
          };
        }
      }
      
      // Check custom regex filters for this user
      const userRegexFilters = this.customRegexFilters.get(userId) || [];
      for (const regex of userRegexFilters) {
        if (regex.test(allText)) {
          return {
            isInappropriate: true,
            reason: `Matches custom blocked pattern: ${regex.source}`
          };
        }
      }
    }
    
    // Additional check for HTML content - look for common adult image keywords in alt tags
    if (htmlContent) {
      const lowerHtml = htmlContent.toLowerCase();
      const adultImageKeywords = ['nude', 'naked', 'xxx', 'porn', 'adult'];
      
      for (const keyword of adultImageKeywords) {
        if (lowerHtml.includes(`alt="${keyword}"`) || lowerHtml.includes(`alt='${keyword}'`)) {
          return {
            isInappropriate: true,
            reason: `Contains potentially inappropriate image (${keyword})`
          };
        }
      }
    }
    
    // If we get here, content is appropriate
    return {
      isInappropriate: false,
      reason: ''
    };
  }
  
  async addCustomFilter(userId: number, filterText: string, isRegex: boolean) {
    try {
      // Save to database
      await storage.createFilterRule({
        user_id: userId,
        rule_text: filterText,
        is_regex: isRegex
      });
      
      // Update in-memory filters
      if (isRegex) {
        try {
          const regex = new RegExp(filterText, 'i');
          const userRegexFilters = this.customRegexFilters.get(userId) || [];
          userRegexFilters.push(regex);
          this.customRegexFilters.set(userId, userRegexFilters);
        } catch (e) {
          console.error(`Invalid regex pattern:`, filterText);
          throw new Error(`Invalid regex pattern: ${filterText}`);
        }
      } else {
        const userFilters = this.customFilters.get(userId) || [];
        userFilters.push(filterText.toLowerCase());
        this.customFilters.set(userId, userFilters);
      }
    } catch (error) {
      console.error('Error adding custom filter:', error);
      throw error;
    }
  }
}

export const contentFilter = new ContentFilter();
