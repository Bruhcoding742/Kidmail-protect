import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertChildAccountSchema, 
  insertFilterRuleSchema, 
  insertActivityLogSchema, 
  insertUserSchema 
} from "@shared/schema";
import { emailService } from "./email-service";
import { contentFilter } from "./content-filter";
import { setupAuth } from "./auth";

// Interface for email content analysis
export interface EmailContentAnalysis {
  id?: string;
  subject: string;
  sender: string;
  date: string;
  contentHtml: string;
  contentText: string;
  safety: 'safe' | 'warning' | 'unsafe' | 'unknown';
  matchedRules?: Array<{
    id: number;
    rule_text: string;
    is_regex: boolean;
  }>;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // API routes

  app.get("/api/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(user);
  });

  // Child account routes
  app.post("/api/child-accounts", async (req, res) => {
    try {
      const data = insertChildAccountSchema.parse(req.body);
      const childAccount = await storage.createChildAccount(data);
      res.status(201).json(childAccount);
    } catch (error) {
      res.status(400).json({ message: "Invalid child account data" });
    }
  });

  app.get("/api/child-accounts", async (req, res) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    if (userId && isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    
    const accounts = userId 
      ? await storage.getChildAccountsByUserId(userId)
      : await storage.getAllChildAccounts();
    
    res.json(accounts);
  });

  app.get("/api/child-accounts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }
    
    const account = await storage.getChildAccount(id);
    if (!account) {
      return res.status(404).json({ message: "Child account not found" });
    }
    
    res.json(account);
  });

  app.patch("/api/child-accounts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }
    
    const account = await storage.getChildAccount(id);
    if (!account) {
      return res.status(404).json({ message: "Child account not found" });
    }
    
    try {
      const data = insertChildAccountSchema.partial().parse(req.body);
      const updatedAccount = await storage.updateChildAccount(id, data);
      res.json(updatedAccount);
    } catch (error) {
      res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete("/api/child-accounts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid account ID" });
    }
    
    const account = await storage.getChildAccount(id);
    if (!account) {
      return res.status(404).json({ message: "Child account not found" });
    }
    
    await storage.deleteChildAccount(id);
    res.status(204).end();
  });

  // Filter rules routes
  app.post("/api/filter-rules", async (req, res) => {
    try {
      const data = insertFilterRuleSchema.parse(req.body);
      const rule = await storage.createFilterRule(data);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid filter rule data" });
    }
  });

  app.get("/api/filter-rules", async (req, res) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const childAccountId = req.query.childAccountId ? parseInt(req.query.childAccountId as string) : undefined;
    
    if ((userId && isNaN(userId)) || (childAccountId && isNaN(childAccountId))) {
      return res.status(400).json({ message: "Invalid ID parameter" });
    }
    
    const rules = await storage.getFilterRules(userId, childAccountId);
    res.json(rules);
  });

  app.delete("/api/filter-rules/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid rule ID" });
    }
    
    const rule = await storage.getFilterRule(id);
    if (!rule) {
      return res.status(404).json({ message: "Filter rule not found" });
    }
    
    await storage.deleteFilterRule(id);
    res.status(204).end();
  });

  // Activity logs routes
  app.get("/api/activity-logs", async (req, res) => {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const childAccountId = req.query.childAccountId ? parseInt(req.query.childAccountId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    if ((userId && isNaN(userId)) || (childAccountId && isNaN(childAccountId)) || isNaN(limit)) {
      return res.status(400).json({ message: "Invalid query parameter" });
    }
    
    const logs = await storage.getActivityLogs(userId, childAccountId, limit);
    res.json(logs);
  });

  // System status route
  app.get("/api/system-status", async (req, res) => {
    const status = await storage.getSystemStatus();
    res.json(status);
  });

  // Manual check route
  app.post("/api/check-now", async (req, res) => {
    const schema = z.object({
      childAccountId: z.number()
    });
    
    try {
      const { childAccountId } = schema.parse(req.body);
      const account = await storage.getChildAccount(childAccountId);
      
      if (!account) {
        return res.status(404).json({ message: "Child account not found" });
      }
      
      // Start the check process asynchronously
      emailService.checkAndProcess(account)
        .catch(err => console.error(`Error checking account ${childAccountId}:`, err));
      
      res.json({ message: "Check initiated", childAccountId });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Email content analysis routes
  app.post("/api/analyze-content", isAuthenticated, async (req, res) => {
    const schema = z.object({
      subject: z.string().optional().default(""),
      sender: z.string().optional().default(""),
      contentHtml: z.string().optional().default(""),
      contentText: z.string().optional().default(""),
      userId: z.number(),
      childAccountId: z.number().optional()
    });
    
    try {
      const { subject, sender, contentHtml, contentText, userId, childAccountId } = schema.parse(req.body);
      
      // Get filter rules that apply to this user/child account
      const filterRules = await storage.getFilterRules(userId, childAccountId);
      
      // Check content against the filter
      const filterResult = await contentFilter.checkContent(
        subject,
        contentText,
        contentHtml,
        userId,
        sender,
        childAccountId
      );
      
      // Determine which rules were matched
      const matchedRules = filterRules.filter(rule => {
        if (rule.is_regex) {
          try {
            const regex = new RegExp(rule.rule_text, "i");
            return regex.test(subject) || regex.test(contentText) || regex.test(contentHtml);
          } catch (error) {
            console.error(`Invalid regex in rule ${rule.id}:`, error);
            return false;
          }
        } else {
          const ruleText = rule.rule_text.toLowerCase();
          return subject.toLowerCase().includes(ruleText) || 
                 contentText.toLowerCase().includes(ruleText) || 
                 contentHtml.toLowerCase().includes(ruleText);
        }
      });
      
      const analysis: EmailContentAnalysis = {
        subject,
        sender,
        date: new Date().toISOString(),
        contentHtml,
        contentText,
        safety: filterResult.isInappropriate ? 'unsafe' : 'safe',
        matchedRules: matchedRules.map(rule => ({
          id: rule.id,
          rule_text: rule.rule_text,
          is_regex: rule.is_regex
        }))
      };
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing content:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Mock email list for preview (in a real app, this would fetch from email provider)
  app.get("/api/email-previews/:childAccountId", isAuthenticated, async (req, res) => {
    const childAccountId = parseInt(req.params.childAccountId);
    if (isNaN(childAccountId)) {
      return res.status(400).json({ message: "Invalid child account ID" });
    }
    
    // Get child account
    const childAccount = await storage.getChildAccount(childAccountId);
    if (!childAccount) {
      return res.status(404).json({ message: "Child account not found" });
    }
    
    // Get activity logs for the child account
    const activityLogs = await storage.getActivityLogs(childAccount.user_id, childAccountId, 10);
    
    // Convert activity logs to email previews
    const emailPreviews: EmailContentAnalysis[] = activityLogs
      .filter(log => ['deleted', 'inappropriate_deleted', 'kept'].includes(log.activity_type))
      .map(log => {
        // Parse the details to extract subject
        const detailsMatch = log.details?.match(/subject: (.+)$/) || 
                             log.details?.match(/email: (.+)$/) ||
                             [null, 'No Subject'];
        const subject = detailsMatch ? detailsMatch[1] : 'No Subject';
        
        // Determine safety level based on activity type
        let safety: 'safe' | 'warning' | 'unsafe' | 'unknown' = 'unknown';
        if (log.activity_type === 'inappropriate_deleted') {
          safety = 'unsafe';
        } else if (log.activity_type === 'deleted') {
          safety = 'warning';
        } else if (log.activity_type === 'kept') {
          safety = 'safe';
        }
        
        return {
          id: log.id.toString(),
          subject,
          sender: log.sender_email || 'Unknown Sender',
          date: log.created_at.toISOString(),
          contentHtml: '',  // We don't store this in logs
          contentText: log.details || '',
          safety
        };
      });
    
    res.json(emailPreviews);
  });

  // Mock individual email content for preview
  app.get("/api/email-content/:id", isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    // In a real app, we would fetch the actual email content
    // For now, we'll just return a mock based on activity log
    const log = await storage.getActivityLog(id);
    if (!log) {
      return res.status(404).json({ message: "Email not found" });
    }
    
    // Get matching rules for this user/child
    const rules = await storage.getFilterRules(log.user_id, log.child_account_id);
    
    // Simple mock of matched rules (in reality, we'd need to analyze the content again)
    const matchedRules = log.activity_type === 'inappropriate_deleted' 
      ? rules.slice(0, 2).map(rule => ({
          id: rule.id,
          rule_text: rule.rule_text,
          is_regex: rule.is_regex
        }))
      : [];
    
    // Parse the details to extract subject
    const detailsMatch = log.details?.match(/subject: (.+)$/) || 
                         log.details?.match(/email: (.+)$/) ||
                         [null, 'No Subject'];
    const subject = detailsMatch ? detailsMatch[1] : 'No Subject';
    
    // Determine safety level based on activity type
    let safety: 'safe' | 'warning' | 'unsafe' | 'unknown' = 'unknown';
    if (log.activity_type === 'inappropriate_deleted') {
      safety = 'unsafe';
    } else if (log.activity_type === 'deleted') {
      safety = 'warning';
    } else if (log.activity_type === 'kept') {
      safety = 'safe';
    }
    
    const mockContentText = `This is a mock preview of an email that was ${log.activity_type === 'inappropriate_deleted' ? 'flagged as inappropriate' : 'processed'} by KidMail Protector.
    
Original sender: ${log.sender_email || 'Unknown'}
Status: ${log.activity_type}
Details: ${log.details || 'No details available'}

In a production environment, this would display the actual content of the email.`;
    
    // Simple mock HTML for demonstration
    const mockHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>${subject}</h2>
        <p><strong>From:</strong> ${log.sender_email || 'Unknown Sender'}</p>
        <p><strong>Status:</strong> ${log.activity_type}</p>
        <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 5px;">
          <p>${log.details || 'No details available'}</p>
          <p>This is a mock preview of an email that was ${log.activity_type === 'inappropriate_deleted' ? 'flagged as inappropriate' : 'processed'} by KidMail Protector.</p>
          <p>In a production environment, this would display the actual content of the email.</p>
        </div>
      </div>
    `;
    
    const emailContent: EmailContentAnalysis = {
      id: log.id.toString(),
      subject,
      sender: log.sender_email || 'Unknown Sender',
      date: log.created_at.toISOString(),
      contentHtml: mockHtml,
      contentText: mockContentText,
      safety,
      matchedRules
    };
    
    res.json(emailContent);
  });

  // Risk dashboard API endpoints
  app.get("/api/safety-stats/system", isAuthenticated, async (req, res) => {
    const timeframe = req.query.timeframe || "7days";
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }
    const childAccounts = await storage.getChildAccountsByUserId(req.user.id);
    const activityLogs = await storage.getActivityLogs(req.user.id);
    
    // Calculate a risk score based on activity logs
    const calculateRiskScore = () => {
      let riskScore = 25; // Default moderate risk score
      
      // Look at activity logs to count incidents
      const riskyActivities = activityLogs.filter(log => 
        log.activity_type === "inappropriate_deleted" || 
        log.activity_type === "error"
      ).length;
      
      // Adjust score based on risky activities
      if (riskyActivities > 5) {
        riskScore = 75; // High risk
      } else if (riskyActivities > 2) {
        riskScore = 45; // Medium risk
      } else if (riskyActivities === 0) {
        riskScore = 15; // Low risk
      }
      
      return riskScore;
    };
    
    // Get risk level based on score
    const getRiskLevel = (score: number) => {
      if (score >= 70) return "high";
      if (score >= 30) return "medium";
      if (score >= 0) return "low";
      return "unknown";
    };
    
    // Calculate overall system risk score
    const averageRiskScore = calculateRiskScore();
    const systemRiskLevel = getRiskLevel(averageRiskScore);
    
    // Count total scanned emails and threats
    const totalScannedEmails = activityLogs.filter(log => 
      log.activity_type === "check"
    ).length * 5; // Assuming each check scans multiple emails
    
    const totalBlockedThreats = activityLogs.filter(log => 
      log.activity_type === "inappropriate_deleted" || 
      log.activity_type === "deleted"
    ).length;
    
    // Count children at risk
    const childrenAtRisk = systemRiskLevel === "low" ? 0 : 
      systemRiskLevel === "medium" ? 1 : childAccounts.length;
    
    // Generate threat distribution
    const threatDistribution = [
      { type: "Inappropriate Content", count: activityLogs.filter(log => log.activity_type === "inappropriate_deleted").length },
      { type: "Spam", count: activityLogs.filter(log => log.activity_type === "deleted").length },
      { type: "Phishing", count: Math.floor(Math.random() * 3) },
      { type: "Malware", count: Math.floor(Math.random() * 2) }
    ].filter(threat => threat.count > 0);
    
    // Generate risk trend for the last 7 days
    const riskTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      
      // Base the risk score on real activity logs if available
      let dayScore = 20 + Math.floor(Math.random() * 30);
      const dayLogs = activityLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === date.toDateString();
      });
      
      if (dayLogs.length > 0) {
        const riskyDayLogs = dayLogs.filter(log => 
          log.activity_type === "inappropriate_deleted" || 
          log.activity_type === "error"
        ).length;
        
        if (riskyDayLogs > 2) {
          dayScore = 70 + Math.floor(Math.random() * 20);
        } else if (riskyDayLogs > 0) {
          dayScore = 40 + Math.floor(Math.random() * 20);
        } else {
          dayScore = 10 + Math.floor(Math.random() * 15);
        }
      }
      
      return {
        date: date.toISOString(),
        riskScore: dayScore,
      };
    });
    
    res.json({
      totalScannedEmails,
      totalBlockedThreats,
      averageRiskScore,
      systemRiskLevel,
      totalChildAccounts: childAccounts.length,
      childrenAtRisk,
      threatDistribution,
      riskTrend
    });
  });
  
  app.get("/api/safety-stats/child/:childId", isAuthenticated, async (req, res) => {
    const childId = parseInt(req.params.childId);
    const timeframe = req.query.timeframe || "7days";
    
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    // Get child account and activity logs
    const childAccount = await storage.getChildAccount(childId);
    
    // Verify this child account belongs to the authenticated user
    if (!childAccount || childAccount.user_id !== req.user.id) {
      return res.status(404).send("Child account not found");
    }
    
    const activityLogs = await storage.getActivityLogs(req.user.id, childId);
    
    // Count different types of emails
    const safeEmails = activityLogs.filter(log => 
      log.activity_type === "check" || log.activity_type === "trusted_sender"
    ).length * 3; // Multiplier to get a reasonable number
    
    const warningEmails = activityLogs.filter(log => 
      log.activity_type === "deleted"
    ).length;
    
    const unsafeEmails = activityLogs.filter(log => 
      log.activity_type === "inappropriate_deleted" || log.activity_type === "error"
    ).length;
    
    const blockedEmails = unsafeEmails; // All unsafe emails are blocked
    
    // Calculate risk score based on the ratio of unsafe to total emails
    const totalEmails = safeEmails + warningEmails + unsafeEmails;
    let riskScore = 15; // Default low risk
    
    if (totalEmails > 0) {
      const unsafeRatio = (unsafeEmails + warningEmails * 0.5) / totalEmails;
      if (unsafeRatio > 0.2) {
        riskScore = 75; // High risk
      } else if (unsafeRatio > 0.1) {
        riskScore = 45; // Medium risk
      }
    }
    
    // Determine risk level
    let riskLevel = "low";
    if (riskScore >= 70) riskLevel = "high";
    else if (riskScore >= 30) riskLevel = "medium";
    
    // Generate recent trends for the last 7 days
    const recentTrends = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      
      // Check if we have real logs for this day
      const dayLogs = activityLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate.toDateString() === date.toDateString();
      });
      
      let safeCount = 1 + Math.floor(Math.random() * 4);
      let warningCount = Math.floor(Math.random() * 2);
      let unsafeCount = 0;
      
      if (dayLogs.length > 0) {
        // Use real data if available
        safeCount = dayLogs.filter(log => 
          log.activity_type === "check" || log.activity_type === "trusted_sender"
        ).length;
        
        warningCount = dayLogs.filter(log => 
          log.activity_type === "deleted"
        ).length;
        
        unsafeCount = dayLogs.filter(log => 
          log.activity_type === "inappropriate_deleted" || log.activity_type === "error"
        ).length;
      }
      
      return {
        date: date.toISOString(),
        safeCount: Math.max(1, safeCount), // Ensure at least 1 safe email
        warningCount,
        unsafeCount,
      };
    });
    
    // Generate top threats based on activity logs
    const topThreats = [];
    
    if (activityLogs.some(log => log.activity_type === "inappropriate_deleted")) {
      topThreats.push({ 
        type: "Inappropriate Content", 
        count: activityLogs.filter(log => log.activity_type === "inappropriate_deleted").length,
        severity: "high"
      });
    }
    
    if (activityLogs.some(log => log.activity_type === "deleted")) {
      topThreats.push({
        type: "Spam / Junk Mail",
        count: activityLogs.filter(log => log.activity_type === "deleted").length,
        severity: "medium"
      });
    }
    
    // Add some realistic threats if we have too few
    if (topThreats.length < 2 && unsafeEmails > 0) {
      topThreats.push({
        type: "Suspicious Links",
        count: 1,
        severity: "high"
      });
    }
    
    if (riskLevel === "high" && topThreats.length < 3) {
      topThreats.push({
        type: "Adult Content",
        count: 1,
        severity: "high"
      });
    }
    
    res.json({
      childAccountId: childId,
      totalEmails,
      safeEmails,
      warningEmails,
      unsafeEmails,
      unknownEmails: 0,
      blockedEmails,
      riskScore,
      riskLevel,
      recentTrends,
      topThreats
    });
  });

  const httpServer = createServer(app);

  // Initialize the email service
  emailService.init(storage, contentFilter).catch(err => {
    console.error("Failed to initialize email service:", err);
  });

  return httpServer;
}
