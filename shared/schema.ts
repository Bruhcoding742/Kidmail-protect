import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Email provider types
export const emailProviderEnum = pgEnum('email_provider_type', [
  'icloud',
  'gmail', 
  'outlook',
  'yahoo',
  'aol',
  'protonmail',
  'zoho',
  'other'
]);

// Authentication method types
export const authMethodEnum = pgEnum('auth_method_type', [
  'password',
  'oauth2',
  'app_password',
  'token'
]);

// Email provider configuration
export const emailProviders = pgTable("email_providers", {
  id: serial("id").primaryKey(),
  provider_type: emailProviderEnum("provider_type").notNull(),
  name: text("name").notNull(),
  imap_host: text("imap_host").notNull(),
  imap_port: integer("imap_port").notNull(),
  imap_secure: boolean("imap_secure").default(true).notNull(),
  smtp_host: text("smtp_host").notNull(),
  smtp_port: integer("smtp_port").notNull(),
  smtp_secure: boolean("smtp_secure").default(true).notNull(),
  oauth_enabled: boolean("oauth_enabled").default(false).notNull(),
  oauth_client_id: text("oauth_client_id"),
  oauth_client_secret: text("oauth_client_secret"),
  oauth_redirect_uri: text("oauth_redirect_uri"),
  oauth_auth_url: text("oauth_auth_url"),
  oauth_token_url: text("oauth_token_url"),
  oauth_scope: text("oauth_scope"),
  junk_folder_path: text("junk_folder_path").default("Junk").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailProviderSchema = createInsertSchema(emailProviders).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export type InsertEmailProvider = z.infer<typeof insertEmailProviderSchema>;
export type EmailProvider = typeof emailProviders.$inferSelect;

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
  display_name: text("display_name").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  
  // Email provider information
  provider_id: integer("provider_id").notNull().references(() => emailProviders.id),
  auth_method: authMethodEnum("auth_method").default('app_password').notNull(),
  
  // Authentication credentials (based on auth method)
  app_password: text("app_password"),
  password: text("password"),
  oauth_token: text("oauth_token"),
  oauth_refresh_token: text("oauth_refresh_token"),
  token_expiry: timestamp("token_expiry"),
  
  // Custom settings
  custom_junk_folder: text("custom_junk_folder"),
  
  // Checking configuration
  created_at: timestamp("created_at").defaultNow().notNull(),
  last_check: timestamp("last_check"),
  last_forward: timestamp("last_forward"),
  check_interval: integer("check_interval").default(15).notNull(), // Minutes
  check_start_time: text("check_start_time").default("00:00").notNull(), // 24h format HH:MM
  check_end_time: text("check_end_time").default("23:59").notNull(), // 24h format HH:MM
  forwarding_email: text("forwarding_email").notNull(),
  
  // Filtering settings  
  age_group: text("age_group").default("all").notNull(), // 'young_child', 'pre_teen', 'teen', 'all'
  filter_level: text("filter_level").default("medium").notNull(), // 'low', 'medium', 'high', 'custom'
});

export const insertChildAccountSchema = createInsertSchema(childAccounts).pick({
  user_id: true,
  email: true,
  display_name: true,
  is_active: true,
  provider_id: true,
  auth_method: true,
  app_password: true,
  password: true,
  oauth_token: true,
  oauth_refresh_token: true,
  token_expiry: true,
  custom_junk_folder: true,
  check_interval: true,
  check_start_time: true,
  check_end_time: true,
  forwarding_email: true,
  age_group: true,
  filter_level: true,
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

// Trusted senders whitelist
export const trustedSenders = pgTable("trusted_senders", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  child_account_id: integer("child_account_id").references(() => childAccounts.id),
  email_address: text("email_address").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrustedSenderSchema = createInsertSchema(trustedSenders).pick({
  user_id: true,
  child_account_id: true,
  email_address: true,
  description: true,
});

export type InsertTrustedSender = z.infer<typeof insertTrustedSenderSchema>;
export type TrustedSender = typeof trustedSenders.$inferSelect;

// Junk mail preferences
export const junkMailPreferences = pgTable("junk_mail_preferences", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  child_account_id: integer("child_account_id").references(() => childAccounts.id),
  keep_newsletters: boolean("keep_newsletters").default(false).notNull(),
  keep_receipts: boolean("keep_receipts").default(false).notNull(),
  keep_social_media: boolean("keep_social_media").default(false).notNull(),
  auto_delete_all: boolean("auto_delete_all").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertJunkMailPreferencesSchema = createInsertSchema(junkMailPreferences).pick({
  user_id: true,
  child_account_id: true,
  keep_newsletters: true,
  keep_receipts: true,
  keep_social_media: true,
  auto_delete_all: true,
});

export type InsertJunkMailPreferences = z.infer<typeof insertJunkMailPreferencesSchema>;
export type JunkMailPreferences = typeof junkMailPreferences.$inferSelect;

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
