import { 
  users, type User, type InsertUser,
  childAccounts, type ChildAccount, type InsertChildAccount,
  filterRules, type FilterRule, type InsertFilterRule,
  activityLogs, type ActivityLog, type InsertActivityLog,
  systemStatus, type SystemStatus, type InsertSystemStatus,
  trustedSenders, type TrustedSender, type InsertTrustedSender,
  junkMailPreferences, type JunkMailPreferences, type InsertJunkMailPreferences,
  emailProviders, type EmailProvider, type InsertEmailProvider,
  emailProviderEnum,
  mlFeedback, type MlFeedback, type InsertMlFeedback
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Child account methods
  getChildAccount(id: number): Promise<ChildAccount | undefined>;
  getAllChildAccounts(): Promise<ChildAccount[]>;
  getChildAccountsByUserId(userId: number): Promise<ChildAccount[]>;
  createChildAccount(account: InsertChildAccount): Promise<ChildAccount>;
  updateChildAccount(id: number, data: Partial<InsertChildAccount>): Promise<ChildAccount>;
  deleteChildAccount(id: number): Promise<void>;
  
  // Filter rule methods
  getFilterRule(id: number): Promise<FilterRule | undefined>;
  getAllFilterRules(): Promise<FilterRule[]>;
  getFilterRules(userId?: number, childAccountId?: number): Promise<FilterRule[]>;
  createFilterRule(rule: InsertFilterRule): Promise<FilterRule>;
  deleteFilterRule(id: number): Promise<void>;
  
  // Activity log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLog(id: number): Promise<ActivityLog | undefined>;
  getActivityLogs(userId?: number, childAccountId?: number, limit?: number): Promise<ActivityLog[]>;
  
  // Trusted sender methods
  getTrustedSender(id: number): Promise<TrustedSender | undefined>;
  getTrustedSenders(userId?: number, childAccountId?: number): Promise<TrustedSender[]>;
  createTrustedSender(sender: InsertTrustedSender): Promise<TrustedSender>;
  deleteTrustedSender(id: number): Promise<void>;
  isEmailTrusted(email: string, userId: number, childAccountId?: number): Promise<boolean>;
  
  // Junk mail preferences methods
  getJunkMailPreferences(userId: number, childAccountId?: number): Promise<JunkMailPreferences | undefined>;
  createJunkMailPreferences(prefs: InsertJunkMailPreferences): Promise<JunkMailPreferences>;
  updateJunkMailPreferences(id: number, data: Partial<InsertJunkMailPreferences>): Promise<JunkMailPreferences>;
  
  // System status methods
  getSystemStatus(): Promise<SystemStatus>;
  updateSystemStatus(data: Partial<InsertSystemStatus>): Promise<SystemStatus>;
  
  // Email provider methods
  getEmailProvider(id: number): Promise<EmailProvider | undefined>;
  getEmailProviderByType(providerType: string): Promise<EmailProvider | undefined>;
  getAllEmailProviders(): Promise<EmailProvider[]>;
  createEmailProvider(provider: InsertEmailProvider): Promise<EmailProvider>;
  updateEmailProvider(id: number, data: Partial<InsertEmailProvider>): Promise<EmailProvider>;
  deleteEmailProvider(id: number): Promise<void>;
  
  // Machine learning feedback methods
  createMlFeedback(feedback: InsertMlFeedback): Promise<MlFeedback>;
  getMlFeedback(userId: number, childAccountId?: number): Promise<MlFeedback[]>;
  getMlFeedbackById(id: number): Promise<MlFeedback | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private childAccounts: Map<number, ChildAccount>;
  private filterRules: Map<number, FilterRule>;
  private activityLogs: Map<number, ActivityLog>;
  private trustedSenders: Map<number, TrustedSender>;
  private junkMailPreferences: Map<number, JunkMailPreferences>;
  private systemStatusData: SystemStatus | undefined;
  private emailProviderData: Map<number, EmailProvider>;
  private mlFeedbackData: Map<number, MlFeedback>;
  
  private userIdCounter: number;
  private childAccountIdCounter: number;
  private filterRuleIdCounter: number;
  private activityLogIdCounter: number;
  private trustedSenderIdCounter: number;
  private junkMailPreferencesIdCounter: number;
  private emailProviderIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.childAccounts = new Map();
    this.filterRules = new Map();
    this.activityLogs = new Map();
    this.trustedSenders = new Map();
    this.junkMailPreferences = new Map();
    this.emailProviderData = new Map();
    
    this.userIdCounter = 1;
    this.childAccountIdCounter = 1;
    this.filterRuleIdCounter = 1;
    this.activityLogIdCounter = 1;
    this.trustedSenderIdCounter = 1;
    this.junkMailPreferencesIdCounter = 1;
    this.emailProviderIdCounter = 1;
    
    // Initialize with a default system status
    this.systemStatusData = {
      id: 1,
      status: 'operational',
      last_updated: new Date(),
      details: 'System initialized and ready'
    };
    
    // Add some demo data
    this.setupDemoData();
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id, created_at: new Date() };
    this.users.set(id, user);
    return user;
  }
  
  // Child account methods
  async getChildAccount(id: number): Promise<ChildAccount | undefined> {
    return this.childAccounts.get(id);
  }
  
  async getAllChildAccounts(): Promise<ChildAccount[]> {
    return Array.from(this.childAccounts.values());
  }
  
  async getChildAccountsByUserId(userId: number): Promise<ChildAccount[]> {
    return Array.from(this.childAccounts.values())
      .filter(account => account.user_id === userId);
  }
  
  async createChildAccount(account: InsertChildAccount): Promise<ChildAccount> {
    const id = this.childAccountIdCounter++;
    const childAccount: ChildAccount = {
      ...account,
      id,
      created_at: new Date(),
      last_check: null,
      last_forward: null,
      is_active: account.is_active ?? true,
      check_interval: account.check_interval ?? 15
    };
    
    this.childAccounts.set(id, childAccount);
    
    // Log the account creation
    await this.createActivityLog({
      user_id: account.user_id,
      child_account_id: id,
      activity_type: 'account_added',
      details: `Added new account: ${account.display_name} (${account.email})`,
      sender_email: null
    });
    
    return childAccount;
  }
  
  async updateChildAccount(id: number, data: Partial<InsertChildAccount>): Promise<ChildAccount> {
    const account = this.childAccounts.get(id);
    if (!account) {
      throw new Error(`Child account with ID ${id} not found`);
    }
    
    const updatedAccount: ChildAccount = { ...account, ...data };
    this.childAccounts.set(id, updatedAccount);
    
    return updatedAccount;
  }
  
  async deleteChildAccount(id: number): Promise<void> {
    if (!this.childAccounts.has(id)) {
      throw new Error(`Child account with ID ${id} not found`);
    }
    
    this.childAccounts.delete(id);
  }
  
  // Filter rule methods
  async getFilterRule(id: number): Promise<FilterRule | undefined> {
    return this.filterRules.get(id);
  }
  
  async getAllFilterRules(): Promise<FilterRule[]> {
    return Array.from(this.filterRules.values());
  }
  
  async getFilterRules(userId?: number, childAccountId?: number): Promise<FilterRule[]> {
    return Array.from(this.filterRules.values())
      .filter(rule => {
        if (userId !== undefined && rule.user_id !== userId) {
          return false;
        }
        
        if (childAccountId !== undefined && rule.child_account_id !== childAccountId) {
          return false;
        }
        
        return true;
      });
  }
  
  async createFilterRule(rule: InsertFilterRule): Promise<FilterRule> {
    const id = this.filterRuleIdCounter++;
    const filterRule: FilterRule = {
      id,
      user_id: rule.user_id,
      child_account_id: rule.child_account_id ?? null,
      rule_text: rule.rule_text,
      is_regex: rule.is_regex ?? false,
      created_at: new Date()
    };
    
    this.filterRules.set(id, filterRule);
    
    return filterRule;
  }
  
  async deleteFilterRule(id: number): Promise<void> {
    if (!this.filterRules.has(id)) {
      throw new Error(`Filter rule with ID ${id} not found`);
    }
    
    this.filterRules.delete(id);
  }
  
  // Activity log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const activityLog: ActivityLog = {
      id,
      user_id: log.user_id,
      child_account_id: log.child_account_id ?? null,
      activity_type: log.activity_type,
      details: log.details ?? null,
      sender_email: log.sender_email ?? null,
      created_at: new Date()
    };
    
    this.activityLogs.set(id, activityLog);
    
    return activityLog;
  }
  
  async getActivityLog(id: number): Promise<ActivityLog | undefined> {
    return this.activityLogs.get(id);
  }

  async getActivityLogs(userId?: number, childAccountId?: number, limit = 20): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values())
      .filter(log => {
        if (userId !== undefined && log.user_id !== userId) {
          return false;
        }
        
        if (childAccountId !== undefined && log.child_account_id !== childAccountId) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
    
    return logs;
  }
  
  // Trusted sender methods
  async getTrustedSender(id: number): Promise<TrustedSender | undefined> {
    return this.trustedSenders.get(id);
  }
  
  async getTrustedSenders(userId?: number, childAccountId?: number): Promise<TrustedSender[]> {
    return Array.from(this.trustedSenders.values())
      .filter(sender => {
        if (userId !== undefined && sender.user_id !== userId) {
          return false;
        }
        
        if (childAccountId !== undefined && sender.child_account_id !== childAccountId) {
          return false;
        }
        
        return true;
      });
  }
  
  async createTrustedSender(sender: InsertTrustedSender): Promise<TrustedSender> {
    const id = this.trustedSenderIdCounter++;
    const trustedSender: TrustedSender = {
      id,
      user_id: sender.user_id,
      child_account_id: sender.child_account_id ?? null,
      email_address: sender.email_address,
      description: sender.description ?? null,
      created_at: new Date()
    };
    
    this.trustedSenders.set(id, trustedSender);
    
    // Log the trusted sender addition
    await this.createActivityLog({
      user_id: sender.user_id,
      child_account_id: sender.child_account_id,
      activity_type: 'trusted_sender_added',
      details: `Added trusted sender: ${sender.email_address}${sender.description ? ` (${sender.description})` : ''}`,
      sender_email: sender.email_address
    });
    
    return trustedSender;
  }
  
  async deleteTrustedSender(id: number): Promise<void> {
    const sender = this.trustedSenders.get(id);
    if (!sender) {
      throw new Error(`Trusted sender with ID ${id} not found`);
    }
    
    this.trustedSenders.delete(id);
    
    // Log the trusted sender deletion
    await this.createActivityLog({
      user_id: sender.user_id,
      child_account_id: sender.child_account_id,
      activity_type: 'trusted_sender_removed',
      details: `Removed trusted sender: ${sender.email_address}`,
      sender_email: sender.email_address
    });
  }
  
  async isEmailTrusted(email: string, userId: number, childAccountId?: number): Promise<boolean> {
    // Normalize the email for comparison
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if the sender is in the trusted senders list
    const isTrusted = Array.from(this.trustedSenders.values()).some(sender => {
      // First, check if this trusted sender applies to the current user
      if (sender.user_id !== userId) {
        return false;
      }
      
      // If a specific child account is provided, check if this trusted sender applies to that account
      if (childAccountId !== undefined && sender.child_account_id !== null && sender.child_account_id !== childAccountId) {
        return false;
      }
      
      // Now check if the email matches
      return sender.email_address.toLowerCase() === normalizedEmail;
    });
    
    return isTrusted;
  }
  
  // Junk mail preferences methods
  async getJunkMailPreferences(userId: number, childAccountId?: number): Promise<JunkMailPreferences | undefined> {
    return Array.from(this.junkMailPreferences.values()).find(prefs => {
      if (prefs.user_id !== userId) {
        return false;
      }
      
      if (childAccountId !== undefined && prefs.child_account_id !== childAccountId) {
        return false;
      }
      
      return true;
    });
  }
  
  async createJunkMailPreferences(prefs: InsertJunkMailPreferences): Promise<JunkMailPreferences> {
    const id = this.junkMailPreferencesIdCounter++;
    const junkMailPrefs: JunkMailPreferences = {
      id,
      user_id: prefs.user_id,
      child_account_id: prefs.child_account_id ?? null,
      keep_newsletters: prefs.keep_newsletters ?? false,
      keep_receipts: prefs.keep_receipts ?? false,
      keep_social_media: prefs.keep_social_media ?? false,
      auto_delete_all: prefs.auto_delete_all ?? true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.junkMailPreferences.set(id, junkMailPrefs);
    
    // Log the preferences creation
    await this.createActivityLog({
      user_id: prefs.user_id,
      child_account_id: prefs.child_account_id,
      activity_type: 'junk_preferences_created',
      details: 'Created junk mail preferences',
      sender_email: null
    });
    
    return junkMailPrefs;
  }
  
  async updateJunkMailPreferences(id: number, data: Partial<InsertJunkMailPreferences>): Promise<JunkMailPreferences> {
    const prefs = this.junkMailPreferences.get(id);
    if (!prefs) {
      throw new Error(`Junk mail preferences with ID ${id} not found`);
    }
    
    const updatedPrefs: JunkMailPreferences = {
      ...prefs,
      ...data,
      updated_at: new Date()
    };
    
    this.junkMailPreferences.set(id, updatedPrefs);
    
    // Log the preferences update
    await this.createActivityLog({
      user_id: prefs.user_id,
      child_account_id: prefs.child_account_id,
      activity_type: 'junk_preferences_updated',
      details: 'Updated junk mail preferences',
      sender_email: null
    });
    
    return updatedPrefs;
  }
  
  // System status methods
  async getSystemStatus(): Promise<SystemStatus> {
    if (!this.systemStatusData) {
      // Initialize with default status if none exists
      this.systemStatusData = {
        id: 1,
        status: 'operational',
        details: 'System initialized and ready',
        last_updated: new Date()
      };
    }
    return this.systemStatusData;
  }
  
  async updateSystemStatus(data: InsertSystemStatus): Promise<SystemStatus> {
    if (!this.systemStatusData) {
      this.systemStatusData = {
        id: 1,
        status: data.status,
        details: data.details ?? null,
        last_updated: new Date()
      };
    } else {
      this.systemStatusData = {
        ...this.systemStatusData,
        status: data.status ?? this.systemStatusData.status,
        details: data.details ?? this.systemStatusData.details,
        last_updated: new Date()
      };
    }
    
    return this.systemStatusData;
  }
  
  // Setup demo data for testing
  private setupDemoData() {
    // Create a test user
    const user: User = {
      id: 1,
      username: 'parent',
      password: 'password',
      email: 'parent@example.com',
      created_at: new Date()
    };
    this.users.set(user.id, user);
    
    // Create a couple of child accounts
    const childAccount1: ChildAccount = {
      id: 1,
      user_id: 1,
      email: 'child1@icloud.com',
      app_password: 'app-password-1',
      password: null,
      display_name: 'Child One',
      is_active: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      last_check: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      last_forward: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      check_interval: 15,
      forwarding_email: 'parent@example.com',
      provider_id: 1, // iCloud
      auth_method: 'app_password',
      oauth_token: null,
      oauth_refresh_token: null,
      oauth_token_expires: null,
      custom_junk_folder: null,
      custom_host: null,
      custom_port: null,
      notes: 'Demo account for iCloud',
      filter_level: 'medium'
    };
    
    const childAccount2: ChildAccount = {
      id: 2,
      user_id: 1,
      email: 'child2@gmail.com',
      app_password: null,
      password: null,
      display_name: 'Child Two',
      is_active: true,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      last_check: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      last_forward: null,
      check_interval: 30,
      forwarding_email: 'parent@example.com',
      provider_id: 2, // Gmail
      auth_method: 'oauth2',
      oauth_token: 'fake-oauth-token',
      oauth_refresh_token: 'fake-oauth-refresh-token',
      oauth_token_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      custom_junk_folder: null,
      custom_host: null,
      custom_port: null,
      notes: 'Demo account for Gmail',
      filter_level: 'high'
    };
    
    this.childAccounts.set(childAccount1.id, childAccount1);
    this.childAccounts.set(childAccount2.id, childAccount2);
    this.childAccountIdCounter = 3;
    
    // Create some filter rules
    const filterRule1: FilterRule = {
      id: 1,
      user_id: 1,
      child_account_id: null, // Applies to all children
      rule_text: 'custom-bad-word',
      is_regex: false,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
    };
    
    const filterRule2: FilterRule = {
      id: 2,
      user_id: 1,
      child_account_id: 1, // Only for first child
      rule_text: '\\bbet\\b',
      is_regex: true,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    };
    
    this.filterRules.set(filterRule1.id, filterRule1);
    this.filterRules.set(filterRule2.id, filterRule2);
    this.filterRuleIdCounter = 3;
    
    // Create some trusted senders
    const trustedSender1: TrustedSender = {
      id: 1,
      user_id: 1,
      child_account_id: null, // Applies to all children
      email_address: 'school@example.edu',
      description: 'School email',
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
    };
    
    const trustedSender2: TrustedSender = {
      id: 2,
      user_id: 1,
      child_account_id: 1, // Only for first child
      email_address: 'coach@sportsteam.com',
      description: 'Soccer coach',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    };
    
    this.trustedSenders.set(trustedSender1.id, trustedSender1);
    this.trustedSenders.set(trustedSender2.id, trustedSender2);
    this.trustedSenderIdCounter = 3;
    
    // Create junk mail preferences
    const junkPrefs1: JunkMailPreferences = {
      id: 1,
      user_id: 1,
      child_account_id: null, // Default for all accounts
      keep_newsletters: true,
      keep_receipts: true,
      keep_social_media: false,
      auto_delete_all: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    };
    
    const junkPrefs2: JunkMailPreferences = {
      id: 2,
      user_id: 1,
      child_account_id: 2, // Custom for second child
      keep_newsletters: false,
      keep_receipts: true,
      keep_social_media: true,
      auto_delete_all: true,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
    };
    
    this.junkMailPreferences.set(junkPrefs1.id, junkPrefs1);
    this.junkMailPreferences.set(junkPrefs2.id, junkPrefs2);
    this.junkMailPreferencesIdCounter = 3;
    
    // Create some activity logs
    const logs: ActivityLog[] = [
      {
        id: 1,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'account_added',
        details: 'Added new account: Child One (child1@icloud.com)',
        sender_email: null,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        id: 2,
        user_id: 1,
        child_account_id: 2,
        activity_type: 'account_added',
        details: 'Added new account: Child Two (child2@gmail.com)',
        sender_email: null,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        id: 3,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'check',
        details: 'Checking for new junk emails',
        sender_email: null,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        id: 4,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'filter_match',
        details: 'Inappropriate email detected: Contains blocked term: gambling',
        sender_email: 'spam@example.com',
        created_at: new Date(Date.now() - 23 * 60 * 60 * 1000) // 23 hours ago
      },
      {
        id: 5,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'forward',
        details: 'Email forwarded to parent@example.com',
        sender_email: 'spam@example.com',
        created_at: new Date(Date.now() - 23 * 60 * 60 * 1000) // 23 hours ago
      },
      {
        id: 6,
        user_id: 1,
        child_account_id: 2,
        activity_type: 'check',
        details: 'Checking for new junk emails',
        sender_email: null,
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
      },
      {
        id: 7,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'check',
        details: 'Checking for new junk emails',
        sender_email: null,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      },
      {
        id: 8,
        user_id: 1,
        child_account_id: 2,
        activity_type: 'check',
        details: 'Checking for new junk emails',
        sender_email: null,
        created_at: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      },
      {
        id: 9,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'trusted_sender_added',
        details: 'Added trusted sender: school@example.edu (School email)',
        sender_email: 'school@example.edu',
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) // 6 days ago
      },
      {
        id: 10,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'trusted_sender_added',
        details: 'Added trusted sender: coach@sportsteam.com (Soccer coach)',
        sender_email: 'coach@sportsteam.com',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        id: 11,
        user_id: 1,
        child_account_id: null,
        activity_type: 'junk_preferences_created',
        details: 'Created junk mail preferences',
        sender_email: null,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      },
      {
        id: 12,
        user_id: 1,
        child_account_id: 2,
        activity_type: 'junk_preferences_created',
        details: 'Created junk mail preferences',
        sender_email: null,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        id: 13,
        user_id: 1,
        child_account_id: 1,
        activity_type: 'kept',
        details: 'Kept junk email (newsletter): Weekly School Newsletter',
        sender_email: 'newsletter@school.edu',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        id: 14,
        user_id: 1,
        child_account_id: 2,
        activity_type: 'kept',
        details: 'Kept junk email (social media): Your Instagram notifications',
        sender_email: 'notifications@instagram.com',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      }
    ];
    
    logs.forEach(log => {
      this.activityLogs.set(log.id, log);
    });
    this.activityLogIdCounter = logs.length + 1;
    
    // Setup default email providers
    const providers: EmailProvider[] = [
      {
        id: 1,
        name: 'iCloud Mail',
        provider_type: 'icloud',
        host: 'imap.mail.me.com',
        port: 993,
        smtp_host: 'smtp.mail.me.com',
        smtp_port: 587,
        oauth_client_id: null,
        oauth_client_secret: null,
        oauth_redirect_uri: null,
        oauth_auth_url: null,
        oauth_token_url: null,
        oauth_scope: null,
        junk_folder_path: 'Junk',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'Gmail',
        provider_type: 'gmail',
        host: 'imap.gmail.com',
        port: 993,
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        oauth_client_id: null,
        oauth_client_secret: null,
        oauth_redirect_uri: 'http://localhost:5000/api/oauth/callback',
        oauth_auth_url: 'https://accounts.google.com/o/oauth2/auth',
        oauth_token_url: 'https://oauth2.googleapis.com/token',
        oauth_scope: 'https://mail.google.com/',
        junk_folder_path: '[Gmail]/Spam',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 3,
        name: 'Outlook',
        provider_type: 'outlook',
        host: 'outlook.office365.com',
        port: 993,
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        oauth_client_id: null,
        oauth_client_secret: null,
        oauth_redirect_uri: 'http://localhost:5000/api/oauth/callback',
        oauth_auth_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        oauth_token_url: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        oauth_scope: 'offline_access https://outlook.office.com/IMAP.AccessAsUser.All https://outlook.office.com/SMTP.Send',
        junk_folder_path: 'Junk Email',
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    providers.forEach(provider => {
      this.emailProviderData.set(provider.id, provider);
    });
    this.emailProviderIdCounter = providers.length + 1;
  }
  
  // Email provider methods
  async getEmailProvider(id: number): Promise<EmailProvider | undefined> {
    return this.emailProviderData.get(id);
  }
  
  async getEmailProviderByType(providerType: string): Promise<EmailProvider | undefined> {
    return Array.from(this.emailProviderData.values()).find(
      (provider) => provider.provider_type === providerType
    );
  }
  
  async getAllEmailProviders(): Promise<EmailProvider[]> {
    return Array.from(this.emailProviderData.values());
  }
  
  async createEmailProvider(provider: InsertEmailProvider): Promise<EmailProvider> {
    const id = this.emailProviderIdCounter++;
    const emailProvider: EmailProvider = {
      ...provider,
      id,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.emailProviderData.set(id, emailProvider);
    
    // Log the provider creation
    await this.createActivityLog({
      user_id: 1, // System user
      child_account_id: null,
      activity_type: 'provider_created',
      details: `Added provider: ${provider.name} (${provider.provider_type})`,
      sender_email: null
    });
    
    return emailProvider;
  }
  
  async updateEmailProvider(id: number, data: Partial<InsertEmailProvider>): Promise<EmailProvider> {
    const provider = this.emailProviderData.get(id);
    if (!provider) {
      throw new Error(`Email provider with ID ${id} not found`);
    }
    
    const updatedProvider: EmailProvider = {
      ...provider,
      ...data,
      updated_at: new Date()
    };
    
    this.emailProviderData.set(id, updatedProvider);
    
    return updatedProvider;
  }
  
  async deleteEmailProvider(id: number): Promise<void> {
    const provider = this.emailProviderData.get(id);
    if (!provider) {
      throw new Error(`Email provider with ID ${id} not found`);
    }
    
    this.emailProviderData.delete(id);
    
    // Log the provider deletion
    await this.createActivityLog({
      user_id: 1, // System user
      child_account_id: null,
      activity_type: 'provider_deleted',
      details: `Deleted provider: ${provider.name} (${provider.provider_type})`,
      sender_email: null
    });
  }
}

export const storage = new MemStorage();
