import type { Express } from "express";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

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
      emailService.checkAndForward(account)
        .catch(err => console.error(`Error checking account ${childAccountId}:`, err));
      
      res.json({ message: "Check initiated", childAccountId });
    } catch (error) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  const httpServer = createServer(app);

  // Initialize the email service
  emailService.init(storage, contentFilter).catch(err => {
    console.error("Failed to initialize email service:", err);
  });

  return httpServer;
}
