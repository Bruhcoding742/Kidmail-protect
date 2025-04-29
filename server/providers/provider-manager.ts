import { EmailProviderInterface, ConnectionOptions } from './provider-interface';
import { EmailProviderFactory, ProviderType } from './provider-factory';
import { ChildAccount, EmailProvider } from '../../shared/schema';

/**
 * Connection Pool Entry
 * 
 * Represents an entry in the connection pool, with the provider instance,
 * account information, and connection state.
 */
interface ConnectionPoolEntry {
  provider: EmailProviderInterface;
  accountId: number;
  providerType: ProviderType;
  lastUsed: Date;
  isConnected: boolean;
  connectionError?: Error;
}

/**
 * Email Provider Manager
 * 
 * Manages a pool of email provider connections and handles provider lifecycle
 * operations like connecting, disconnecting, and reconnecting.
 */
export class EmailProviderManager {
  private static instance: EmailProviderManager;
  private connectionPool: Map<number, ConnectionPoolEntry> = new Map();
  private providerSettings: Map<ProviderType, EmailProvider> = new Map();
  
  // Connection pool configuration
  private maxPoolSize: number = 20;
  private connectionTimeout: number = 30 * 1000; // 30 seconds
  private idleTimeout: number = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start the cleanup timer
    this.cleanupInterval = setInterval(() => this.cleanupIdleConnections(), this.idleTimeout);
  }

  /**
   * Get the singleton instance of the provider manager
   * @returns The provider manager instance
   */
  static getInstance(): EmailProviderManager {
    if (!EmailProviderManager.instance) {
      EmailProviderManager.instance = new EmailProviderManager();
    }
    return EmailProviderManager.instance;
  }

  /**
   * Set provider settings to be used when connecting to providers
   * @param settings An array of provider settings
   */
  setProviderSettings(settings: EmailProvider[]): void {
    this.providerSettings.clear();
    settings.forEach(setting => {
      this.providerSettings.set(setting.provider_type as ProviderType, setting);
    });
  }

  /**
   * Get a provider instance for an account, connecting if necessary
   * @param account The child account to get a provider for
   * @returns A connected email provider instance
   */
  async getProviderForAccount(account: ChildAccount): Promise<EmailProviderInterface | null> {
    const accountId = account.id;
    
    // Check if we already have a connection for this account
    if (this.connectionPool.has(accountId)) {
      const entry = this.connectionPool.get(accountId)!;
      
      // Update last used time
      entry.lastUsed = new Date();
      
      // If the provider is connected, return it
      if (entry.isConnected) {
        return entry.provider;
      }
      
      // If not connected, try to reconnect
      const connected = await this.connectProvider(account, entry.provider);
      if (connected) {
        entry.isConnected = true;
        entry.connectionError = undefined;
        return entry.provider;
      } else {
        // Connection failed, return null
        entry.connectionError = entry.provider.getLastError();
        return null;
      }
    }
    
    // No existing connection, create a new one
    return await this.createNewConnection(account);
  }

  /**
   * Disconnect and remove a provider connection from the pool
   * @param accountId The ID of the account to disconnect
   */
  async disconnectProvider(accountId: number): Promise<void> {
    if (this.connectionPool.has(accountId)) {
      const entry = this.connectionPool.get(accountId)!;
      
      if (entry.isConnected) {
        await entry.provider.disconnect();
        entry.isConnected = false;
      }
      
      this.connectionPool.delete(accountId);
    }
  }

  /**
   * Disconnect and remove all provider connections from the pool
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];
    
    for (const [accountId, entry] of this.connectionPool.entries()) {
      if (entry.isConnected) {
        disconnectPromises.push(entry.provider.disconnect());
      }
    }
    
    await Promise.all(disconnectPromises);
    this.connectionPool.clear();
  }

  /**
   * Create a new provider connection for an account
   * @param account The child account to create a connection for
   * @returns A connected email provider instance, or null if connection failed
   */
  private async createNewConnection(account: ChildAccount): Promise<EmailProviderInterface | null> {
    // Check if we need to clean up the connection pool first
    if (this.connectionPool.size >= this.maxPoolSize) {
      this.cleanupIdleConnections();
    }
    
    // If still at max capacity, disconnect the least recently used connection
    if (this.connectionPool.size >= this.maxPoolSize) {
      this.disconnectLeastRecentlyUsed();
    }
    
    // Determine the provider type from the account
    const providerType = account.provider as ProviderType || 'icloud';
    
    // Get a provider instance from the factory
    const provider = EmailProviderFactory.getProvider(providerType);
    
    // Connect to the provider
    const connected = await this.connectProvider(account, provider);
    
    if (connected) {
      // Add to the connection pool
      this.connectionPool.set(account.id, {
        provider,
        accountId: account.id,
        providerType,
        lastUsed: new Date(),
        isConnected: true
      });
      
      return provider;
    } else {
      // Connection failed
      this.connectionPool.set(account.id, {
        provider,
        accountId: account.id,
        providerType,
        lastUsed: new Date(),
        isConnected: false,
        connectionError: provider.getLastError()
      });
      
      return null;
    }
  }

  /**
   * Connect a provider to the email server
   * @param account The child account to connect with
   * @param provider The provider instance to connect
   * @returns True if connection successful, false otherwise
   */
  private async connectProvider(account: ChildAccount, provider: EmailProviderInterface): Promise<boolean> {
    // Get provider settings
    const providerType = account.provider as ProviderType || 'icloud';
    const providerSettings = this.providerSettings.get(providerType);
    
    if (!providerSettings) {
      console.error(`No provider settings found for provider type: ${providerType}`);
      return false;
    }
    
    try {
      // Prepare connection options
      const connectionOptions: ConnectionOptions = {
        host: providerSettings.imap_host,
        port: providerSettings.imap_port,
        secure: providerSettings.imap_secure,
        user: account.email,
        auth: {
          type: account.auth_method as any,
          value: ''
        }
      };
      
      // Set the auth value based on auth method
      switch (account.auth_method) {
        case 'password':
          connectionOptions.auth.value = account.password || '';
          break;
        case 'app_password':
          connectionOptions.auth.value = account.app_password || '';
          break;
        case 'oauth2':
          connectionOptions.auth.value = '';
          connectionOptions.auth.accessToken = account.oauth_token || '';
          connectionOptions.auth.refreshToken = account.oauth_refresh_token || '';
          connectionOptions.auth.expiry = account.token_expiry || new Date();
          break;
        default:
          console.error(`Unsupported auth method: ${account.auth_method}`);
          return false;
      }
      
      // Set a timeout for the connection attempt
      const connectionPromise = provider.connect(connectionOptions);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), this.connectionTimeout);
      });
      
      // Race the connection promise against the timeout
      return await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error connecting to provider:', error);
      return false;
    }
  }

  /**
   * Cleanup idle connections in the pool
   */
  private cleanupIdleConnections(): void {
    const now = new Date();
    const idsToDisconnect: number[] = [];
    
    // Find idle connections
    for (const [accountId, entry] of this.connectionPool.entries()) {
      const idleTime = now.getTime() - entry.lastUsed.getTime();
      
      if (idleTime > this.idleTimeout) {
        idsToDisconnect.push(accountId);
      }
    }
    
    // Disconnect idle connections
    idsToDisconnect.forEach(id => {
      this.disconnectProvider(id).catch(err => {
        console.error(`Error disconnecting provider for account ${id}:`, err);
      });
    });
  }

  /**
   * Disconnect the least recently used connection
   */
  private disconnectLeastRecentlyUsed(): void {
    let oldestId: number | null = null;
    let oldestTime = Date.now();
    
    // Find the least recently used connection
    for (const [accountId, entry] of this.connectionPool.entries()) {
      if (entry.lastUsed.getTime() < oldestTime) {
        oldestId = accountId;
        oldestTime = entry.lastUsed.getTime();
      }
    }
    
    // Disconnect it if found
    if (oldestId !== null) {
      this.disconnectProvider(oldestId).catch(err => {
        console.error(`Error disconnecting provider for account ${oldestId}:`, err);
      });
    }
  }

  /**
   * Get the status of the connection pool
   * @returns An object with connection pool statistics
   */
  getPoolStatus(): { 
    totalConnections: number; 
    activeConnections: number;
    inactiveConnections: number;
    providerBreakdown: Record<ProviderType, number>; 
  } {
    let activeConnections = 0;
    const providerBreakdown: Record<ProviderType, number> = {} as any;
    
    // Initialize provider breakdown
    EmailProviderFactory.getSupportedProviders().forEach(provider => {
      providerBreakdown[provider] = 0;
    });
    
    // Count connections
    for (const entry of this.connectionPool.values()) {
      if (entry.isConnected) {
        activeConnections++;
      }
      
      providerBreakdown[entry.providerType] = (providerBreakdown[entry.providerType] || 0) + 1;
    }
    
    return {
      totalConnections: this.connectionPool.size,
      activeConnections,
      inactiveConnections: this.connectionPool.size - activeConnections,
      providerBreakdown
    };
  }

  /**
   * Get errors for accounts that failed to connect
   * @returns A map of account IDs to connection errors
   */
  getConnectionErrors(): Map<number, Error | undefined> {
    const errors = new Map<number, Error | undefined>();
    
    for (const [accountId, entry] of this.connectionPool.entries()) {
      if (!entry.isConnected && entry.connectionError) {
        errors.set(accountId, entry.connectionError);
      }
    }
    
    return errors;
  }

  /**
   * Clean up resources when the manager is no longer needed
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.disconnectAll().catch(err => {
      console.error('Error disconnecting providers during destroy:', err);
    });
  }
}