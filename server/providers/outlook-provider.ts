import * as IMAP from 'node-imap';
import { simpleParser } from 'mailparser';
import * as nodemailer from 'nodemailer';
import { 
  ConnectionOptions,
  EmailMessage,
  FolderInfo
} from './provider-interface';
import { BaseEmailProvider } from './base-provider';

/**
 * Outlook Email Provider
 * 
 * Implementation of the email provider interface for Outlook and Office 365 accounts.
 * Supports both password and OAuth2 authentication methods.
 */
export class OutlookProvider extends BaseEmailProvider {
  private imapClient: IMAP | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;

  constructor() {
    super();
  }

  async connect(options: ConnectionOptions): Promise<boolean> {
    try {
      // Store connection options for potential reconnection
      this.connectionOptions = options;
      
      // Configure IMAP client based on auth method
      if (options.auth.type === 'oauth2') {
        if (!options.auth.accessToken) {
          this.setLastError(new Error('OAuth2 access token is required for Outlook with OAuth'));
          return false;
        }

        this.imapClient = new IMAP({
          user: options.user,
          host: options.host || 'outlook.office365.com',
          port: options.port || 993,
          tls: options.secure,
          tlsOptions: { rejectUnauthorized: true },
          authTimeout: 30000,
          auth: {
            user: options.user,
            xoauth2: options.auth.accessToken
          }
        });

        // Configure SMTP transporter with OAuth2
        this.smtpTransporter = nodemailer.createTransport({
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: {
            type: 'OAuth2',
            user: options.user,
            accessToken: options.auth.accessToken,
            expires: options.auth.expiry?.getTime() || 0
          }
        });
      } else if (options.auth.type === 'password' || options.auth.type === 'app_password') {
        // Standard password authentication
        this.imapClient = new IMAP({
          user: options.user,
          password: options.auth.value,
          host: options.host || 'outlook.office365.com',
          port: options.port || 993,
          tls: options.secure,
          tlsOptions: { rejectUnauthorized: true },
          authTimeout: 30000
        });

        // Configure SMTP transporter with password
        this.smtpTransporter = nodemailer.createTransport({
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: {
            user: options.user,
            pass: options.auth.value
          }
        });
      } else {
        this.setLastError(new Error('Unsupported authentication method for Outlook'));
        return false;
      }

      // Connect to the server
      return new Promise((resolve) => {
        if (!this.imapClient) {
          this.setLastError(new Error('IMAP client not initialized'));
          this.setConnectionState(false);
          resolve(false);
          return;
        }

        // Set up event handlers
        this.imapClient.once('ready', () => {
          this.setConnectionState(true);
          resolve(true);
        });

        this.imapClient.once('error', (err) => {
          this.setLastError(err);
          this.setConnectionState(false);
          resolve(false);
        });

        this.imapClient.once('end', () => {
          this.setConnectionState(false);
        });

        // Connect to the server
        this.imapClient.connect();
      });
    } catch (error) {
      this.setLastError(error instanceof Error ? error : new Error(String(error)));
      this.setConnectionState(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.imapClient && this.imapClient.state !== 'disconnected') {
        this.imapClient.once('end', () => {
          this.setConnectionState(false);
          resolve();
        });
        this.imapClient.end();
      } else {
        this.setConnectionState(false);
        resolve();
      }
    });
  }

  async listFolders(): Promise<FolderInfo[]> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return [];
    }

    return new Promise((resolve, reject) => {
      if (!this.imapClient) {
        reject(new Error('IMAP client not initialized'));
        return;
      }

      this.imapClient.getBoxes((err, boxes) => {
        if (err) {
          this.setLastError(err);
          reject(err);
          return;
        }

        const folders: FolderInfo[] = [];
        
        // Process the boxes object to create a flat list of folders
        const processBoxes = (boxObject: any, path = '') => {
          for (const name in boxObject) {
            const fullPath = path ? `${path}${this.imapClient?.delimiter || '/'}${name}` : name;
            folders.push({
              name: name,
              path: fullPath,
              messageCount: -1 // We don't know the count until we select the folder
            });

            if (boxObject[name].children) {
              processBoxes(boxObject[name].children, fullPath);
            }
          }
        };

        processBoxes(boxes);
        resolve(folders);
      });
    });
  }

  async selectFolder(folderPath: string): Promise<boolean> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return false;
    }

    return new Promise((resolve) => {
      if (!this.imapClient) {
        this.setLastError(new Error('IMAP client not initialized'));
        resolve(false);
        return;
      }

      this.imapClient.openBox(folderPath, false, (err) => {
        if (err) {
          this.setLastError(err);
          resolve(false);
          return;
        }
        this.currentFolder = folderPath;
        resolve(true);
      });
    });
  }

  async listMessages(folder?: string, options?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    since?: Date;
  }): Promise<EmailMessage[]> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return [];
    }

    // If a folder is specified and it's not the current folder, select it
    if (folder && folder !== this.currentFolder) {
      const selected = await this.selectFolder(folder);
      if (!selected) {
        return [];
      }
    }

    // Default options
    const limit = options?.limit || 10;
    const offset = options?.offset || 0;
    const unreadOnly = options?.unreadOnly || false;
    const since = options?.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default to 1 week ago

    return new Promise((resolve, reject) => {
      if (!this.imapClient) {
        reject(new Error('IMAP client not initialized'));
        return;
      }

      // Construct the search criteria
      const searchCriteria = [
        ['SINCE', since.toISOString().substring(0, 10)]
      ];

      if (unreadOnly) {
        searchCriteria.push('UNSEEN');
      }

      this.imapClient.search(searchCriteria, (err, results) => {
        if (err) {
          this.setLastError(err);
          reject(err);
          return;
        }

        // If no messages found, return empty array
        if (!results.length) {
          resolve([]);
          return;
        }

        // Sort results (newest first) and apply offset and limit
        results.sort((a, b) => b - a);
        const messageNumbers = results.slice(offset, offset + limit);

        // Fetch the messages
        const fetchOptions = {
          bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
          struct: true
        };

        const messages: EmailMessage[] = [];
        const fetch = this.imapClient.fetch(messageNumbers, fetchOptions);

        fetch.on('message', (msg, seqno) => {
          const message: any = {
            id: seqno.toString(),
            from: '',
            to: '',
            subject: '',
            text: '',
            date: new Date(),
            headers: {}
          };

          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });

            stream.once('end', () => {
              if (info.which.includes('HEADER')) {
                const header = IMAP.parseHeader(buffer);
                message.from = header.from?.[0] || '';
                message.to = header.to?.[0] || '';
                message.subject = header.subject?.[0] || '';
                message.date = header.date ? new Date(header.date[0]) : new Date();
                message.headers = header;
              } else {
                message.text = buffer;
              }
            });
          });

          msg.once('end', () => {
            messages.push(message as EmailMessage);
          });
        });

        fetch.once('error', (err) => {
          this.setLastError(err);
          reject(err);
        });

        fetch.once('end', () => {
          resolve(messages);
        });
      });
    });
  }

  async getMessage(id: string): Promise<EmailMessage | null> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return null;
    }

    return new Promise((resolve, reject) => {
      if (!this.imapClient) {
        reject(new Error('IMAP client not initialized'));
        return;
      }

      const fetchOptions = {
        bodies: [''],
        struct: true
      };

      const fetch = this.imapClient.fetch(id, fetchOptions);
      let messageBuffer = '';

      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            messageBuffer += chunk.toString('utf8');
          });
        });

        msg.once('end', () => {
          // Parse the raw message
          simpleParser(messageBuffer).then(parsed => {
            const message: EmailMessage = {
              id,
              from: parsed.from?.text || '',
              to: parsed.to?.text || '',
              subject: parsed.subject || '',
              text: parsed.text || '',
              html: parsed.html || undefined,
              date: parsed.date || new Date(),
              attachments: parsed.attachments?.map(att => ({
                filename: att.filename || 'attachment',
                contentType: att.contentType || 'application/octet-stream',
                content: att.content
              })),
              headers: parsed.headers as Record<string, string>
            };
            resolve(message);
          }).catch(err => {
            this.setLastError(err);
            reject(err);
          });
        });
      });

      fetch.once('error', (err) => {
        this.setLastError(err);
        reject(err);
      });
    });
  }

  async markAsRead(id: string): Promise<boolean> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return false;
    }

    return new Promise((resolve) => {
      if (!this.imapClient) {
        this.setLastError(new Error('IMAP client not initialized'));
        resolve(false);
        return;
      }

      this.imapClient.addFlags(id, '\\Seen', (err) => {
        if (err) {
          this.setLastError(err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  async deleteMessage(id: string): Promise<boolean> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return false;
    }

    return new Promise((resolve) => {
      if (!this.imapClient) {
        this.setLastError(new Error('IMAP client not initialized'));
        resolve(false);
        return;
      }

      // Outlook uses the standard delete flag, followed by an expunge operation
      this.imapClient.addFlags(id, '\\Deleted', (err) => {
        if (err) {
          this.setLastError(err);
          resolve(false);
          return;
        }

        this.imapClient?.expunge((err) => {
          if (err) {
            this.setLastError(err);
            resolve(false);
            return;
          }
          resolve(true);
        });
      });
    });
  }

  async sendMail(message: {
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
  }): Promise<boolean> {
    if (!this.smtpTransporter) {
      this.setLastError(new Error('SMTP transporter not initialized'));
      return false;
    }

    try {
      await this.smtpTransporter.sendMail(message);
      return true;
    } catch (error) {
      this.setLastError(error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  async moveMessage(messageId: string, targetFolder: string): Promise<boolean> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return false;
    }

    return new Promise((resolve) => {
      if (!this.imapClient) {
        this.setLastError(new Error('IMAP client not initialized'));
        resolve(false);
        return;
      }

      this.imapClient.move(messageId, targetFolder, (err) => {
        if (err) {
          this.setLastError(err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  async createFolder(folderPath: string): Promise<boolean> {
    if (!this.isConnected() || !this.imapClient) {
      this.setLastError(new Error('Not connected to server'));
      return false;
    }

    return new Promise((resolve) => {
      if (!this.imapClient) {
        this.setLastError(new Error('IMAP client not initialized'));
        resolve(false);
        return;
      }

      this.imapClient.addBox(folderPath, (err) => {
        if (err) {
          this.setLastError(err);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  getProviderCapabilities() {
    return {
      oauth: true,
      search: true,
      labels: false,
      filters: true,
      folderCreation: true,
      appendMessage: true
    };
  }
}