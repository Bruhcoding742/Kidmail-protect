import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User accounts (parent accounts)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Child email accounts to monitor
export const childAccounts = pgTable("child_accounts", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  app_password: text("app_password").notNull(), // App-specific password for iCloud
  display_name: text("display_name").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  last_check: timestamp("last_check"),
  last_forward: timestamp("last_forward"),
  check_interval: integer("check_interval").default(15).notNull(), // Minutes
  forwarding_email: text("forwarding_email").notNull(),
});

export const insertChildAccountSchema = createInsertSchema(childAccounts).pick({
  user_id: true,
  email: true,
  app_password: true,
  display_name: true,
  is_active: true,
  check_interval: true,
  forwarding_email: true,
});

export type InsertChildAccount = z.infer<typeof insertChildAccountSchema>;
export type ChildAccount = typeof childAccounts.$inferSelect;

// Filter words and phrases
export const filterRules = pgTable("filter_rules", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  child_account_id: integer("child_account_id").references(() => childAccounts.id),
  rule_text: text("rule_text").notNull(),
  is_regex: boolean("is_regex").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertFilterRuleSchema = createInsertSchema(filterRules).pick({
  user_id: true,
  child_account_id: true,
  rule_text: true,
  is_regex: true,
});

export type InsertFilterRule = z.infer<typeof insertFilterRuleSchema>;
export type FilterRule = typeof filterRules.$inferSelect;

// Activity logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  child_account_id: integer("child_account_id").references(() => childAccounts.id),
  activity_type: text("activity_type").notNull(), // 'check', 'forward', 'filter_match', 'error', etc.
  details: text("details"),
  sender_email: text("sender_email"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  user_id: true,
  child_account_id: true,
  activity_type: true,
  details: true,
  sender_email: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

// System status and settings
export const systemStatus = pgTable("system_status", {
  id: serial("id").primaryKey(),
  status: text("status").notNull(), // 'operational', 'degraded', 'down', etc.
  last_updated: timestamp("last_updated").defaultNow().notNull(),
  details: text("details"),
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).pick({
  status: true,
  details: true,
});

export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
export type SystemStatus = typeof systemStatus.$inferSelect;
