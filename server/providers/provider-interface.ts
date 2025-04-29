/**
 * Email Provider Interface
 * 
 * This interface defines the standard operations that all email provider implementations
 * must support, allowing the application to work with different email providers through
 * a consistent interface.
 */

export interface EmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  date: Date;
  attachments?: Array<{
    filename: string;
    contentType: string;
    content: Buffer;
  }>;
  headers?: Record<string, string>;
}

export interface FolderInfo {
  name: string;
  path: string;
  messageCount: number;
}

export interface ConnectionOptions {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  auth: {
    type: 'password' | 'oauth2' | 'app_password' | 'token';
    value: string;
    refreshToken?: string;
    accessToken?: string;
    expiry?: Date;
  };
}

export interface EmailProviderInterface {
  // Connection management
  connect(options: ConnectionOptions): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  refreshConnection(): Promise<boolean>;
  
  // Folder operations
  listFolders(): Promise<FolderInfo[]>;
  selectFolder(folderPath: string): Promise<boolean>;
  createFolder(folderPath: string): Promise<boolean>;
  deleteFolder(folderPath: string): Promise<boolean>;
  moveMessage(messageId: string, targetFolder: string): Promise<boolean>;
  
  // Message operations
  listMessages(folder?: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    since?: Date;
  }): Promise<EmailMessage[]>;
  
  getMessage(id: string): Promise<EmailMessage | null>;
  markAsRead(id: string): Promise<boolean>;
  deleteMessage(id: string): Promise<boolean>;
  
  // Email sending
  sendMail(message: {
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
  
  // Provider-specific features
  getProviderCapabilities(): {
    oauth: boolean;
    search: boolean;
    labels: boolean;
    filters: boolean;
    folderCreation: boolean;
    appendMessage: boolean;
  };
}