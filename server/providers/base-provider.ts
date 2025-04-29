import { 
  EmailProviderInterface,
  ConnectionOptions,
  EmailMessage,
  FolderInfo
} from './provider-interface';

/**
 * Base Email Provider
 * 
 * Abstract base class that implements common functionality across all email providers.
 * Specific providers will extend this class to provide their implementation details.
 */
export abstract class BaseEmailProvider implements EmailProviderInterface {
  protected connectionState: boolean = false;
  protected connectionOptions?: ConnectionOptions;
  protected currentFolder?: string;
  protected lastError?: Error;

  constructor() {}

  // Abstract methods that must be implemented by each provider
  abstract connect(options: ConnectionOptions): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract listFolders(): Promise<FolderInfo[]>;
  abstract selectFolder(folderPath: string): Promise<boolean>;
  abstract listMessages(folder?: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    since?: Date;
  }): Promise<EmailMessage[]>;
  abstract getMessage(id: string): Promise<EmailMessage | null>;
  abstract markAsRead(id: string): Promise<boolean>;
  abstract deleteMessage(id: string): Promise<boolean>;
  abstract sendMail(message: {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }): Promise<boolean>;
  abstract getProviderCapabilities(): {
    oauth: boolean;
    search: boolean;
    labels: boolean;
    filters: boolean;
    folderCreation: boolean;
    appendMessage: boolean;
  };

  // Common implementations
  isConnected(): boolean {
    return this.connectionState;
  }

  async refreshConnection(): Promise<boolean> {
    if (!this.connectionOptions) {
      this.lastError = new Error('No connection options available for refresh');
      return false;
    }

    try {
      await this.disconnect();
      return await this.connect(this.connectionOptions);
    } catch (error) {
      this.lastError = error instanceof Error ? error : new Error(String(error));
      return false;
    }
  }

  // Default implementations that can be overridden
  async createFolder(folderPath: string): Promise<boolean> {
    this.lastError = new Error('Operation not supported by this provider');
    return false;
  }

  async deleteFolder(folderPath: string): Promise<boolean> {
    this.lastError = new Error('Operation not supported by this provider');
    return false;
  }

  async moveMessage(messageId: string, targetFolder: string): Promise<boolean> {
    this.lastError = new Error('Operation not supported by this provider');
    return false;
  }

  // Helper methods
  protected setConnectionState(state: boolean): void {
    this.connectionState = state;
  }

  getLastError(): Error | undefined {
    return this.lastError;
  }

  protected setLastError(error: Error): void {
    this.lastError = error;
  }
}