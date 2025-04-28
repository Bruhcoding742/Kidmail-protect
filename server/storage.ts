import { 
  users, type User, type InsertUser,
  childAccounts, type ChildAccount, type InsertChildAccount,
  filterRules, type FilterRule, type InsertFilterRule,
  activityLogs, type ActivityLog, type InsertActivityLog,
  systemStatus, type SystemStatus, type InsertSystemStatus
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
  getActivityLogs(userId?: number, childAccountId?: number, limit?: number): Promise<ActivityLog[]>;
  
  // System status methods
  getSystemStatus(): Promise<SystemStatus | undefined>;
  updateSystemStatus(data: InsertSystemStatus): Promise<SystemStatus>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private childAccounts: Map<number, ChildAccount>;
  private filterRules: Map<number, FilterRule>;
  private activityLogs: Map<number, ActivityLog>;
  private systemStatusData: SystemStatus | undefined;
  
  private userIdCounter: number;
  private childAccountIdCounter: number;
  private filterRuleIdCounter: number;
  private activityLogIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.childAccounts = new Map();
    this.filterRules = new Map();
    this.activityLogs = new Map();
    
    this.userIdCounter = 1;
    this.childAccountIdCounter = 1;
    this.filterRuleIdCounter = 1;
    this.activityLogIdCounter = 1;
    
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
      display_name: 'Child One',
      is_active: true,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      last_check: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      last_forward: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      check_interval: 15,
      forwarding_email: 'parent@example.com'
    };
    
    const childAccount2: ChildAccount = {
      id: 2,
      user_id: 1,
      email: 'child2@icloud.com',
      app_password: 'app-password-2',
      display_name: 'Child Two',
      is_active: true,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      last_check: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      last_forward: null,
      check_interval: 30,
      forwarding_email: 'parent@example.com'
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
        details: 'Added new account: Child Two (child2@icloud.com)',
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
      }
    ];
    
    logs.forEach(log => {
      this.activityLogs.set(log.id, log);
    });
    this.activityLogIdCounter = logs.length + 1;
  }
}

export const storage = new MemStorage();
