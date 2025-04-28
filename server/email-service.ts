import nodemailer from 'nodemailer';
import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { storage } from './storage';
import { ChildAccount, InsertActivityLog } from '@shared/schema';
import { contentFilter } from './content-filter';

class EmailService {
  private checkIntervals: Map<number, NodeJS.Timeout> = new Map();
  private storageService: typeof storage | null = null;
  private contentFilterService: typeof contentFilter | null = null;
  
  async init(storageService: typeof storage, contentFilterService: typeof contentFilter) {
    this.storageService = storageService;
    this.contentFilterService = contentFilterService;
    
    // Load all active child accounts and schedule checks
    try {
      const accounts = await storageService.getAllChildAccounts();
      accounts.filter(account => account.is_active).forEach(account => {
        this.scheduleCheck(account);
      });
      console.log(`Scheduled checks for ${accounts.filter(account => account.is_active).length} accounts`);
    } catch (error) {
      console.error('Error initializing email service:', error);
    }
  }
  
  scheduleCheck(account: ChildAccount) {
    // Clear any existing interval for this account
    if (this.checkIntervals.has(account.id)) {
      clearInterval(this.checkIntervals.get(account.id));
    }
    
    // Set new interval
    const intervalMinutes = account.check_interval || 15;
    const interval = setInterval(() => {
      this.checkAndForward(account).catch(err => {
        console.error(`Error checking account ${account.id}:`, err);
        this.logActivity({
          user_id: account.user_id,
          child_account_id: account.id,
          activity_type: 'error',
          details: `Error checking emails: ${err.message}`
        });
      });
    }, intervalMinutes * 60 * 1000);
    
    this.checkIntervals.set(account.id, interval);
    console.log(`Scheduled check for account ${account.id} every ${intervalMinutes} minutes`);
  }
  
  async checkAndForward(account: ChildAccount) {
    if (!this.storageService || !this.contentFilterService) {
      throw new Error('Email service not initialized');
    }
    
    console.log(`Checking emails for ${account.email}`);
    
    try {
      // Update last check time
      await this.storageService.updateChildAccount(account.id, {
        last_check: new Date()
      });
      
      // Log the check
      await this.logActivity({
        user_id: account.user_id,
        child_account_id: account.id,
        activity_type: 'check',
        details: 'Checking for new junk emails'
      });
      
      // Connect to iCloud via IMAP
      const imapConfig = {
        user: account.email,
        password: account.app_password,
        host: 'imap.mail.me.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: true }
      };
      
      const imap = new Imap(imapConfig);
      
      await new Promise((resolve, reject) => {
        imap.once('ready', resolve);
        imap.once('error', reject);
        imap.connect();
      });
      
      await new Promise((resolve, reject) => {
        imap.openBox('Junk', true, (err, box) => { // Open in readwrite mode to allow deletion
          if (err) {
            reject(err);
            return;
          }
          
          // Search for unread messages in the Junk folder
          imap.search(['UNSEEN'], async (err, results) => {
            if (err) {
              reject(err);
              return;
            }
            
            if (results.length === 0) {
              console.log('No new messages');
              resolve(null);
              return;
            }
            
            console.log(`Found ${results.length} new junk messages`);
            
            // Messages to be deleted (all filtered emails will be deleted)
            const messagesToDelete: number[] = [];
            let messagesProcessed = 0;
            
            const fetch = imap.fetch(results, { bodies: '' });
            
            fetch.on('message', (msg, seqno) => {
              let uid: number;
              
              msg.on('attributes', (attrs) => {
                uid = attrs.uid;
              });
              
              msg.on('body', async (stream) => {
                try {
                  // Parse the email
                  const parsed = await simpleParser(stream);
                  
                  // Check if the content is inappropriate
                  const filterResult = this.contentFilterService!.checkContent(
                    parsed.subject || '',
                    parsed.text || '',
                    parsed.html || '',
                    account.user_id
                  );
                  
                  if (filterResult.isInappropriate) {
                    console.log(`Inappropriate content detected: ${filterResult.reason}`);
                    
                    // Mark for deletion
                    messagesToDelete.push(seqno);
                    
                    // Forward the email to the parent
                    await this.forwardEmail(
                      account, 
                      parsed.from?.text || 'Unknown Sender',
                      parsed.subject || 'No Subject',
                      parsed.text || '',
                      parsed.html || '',
                      filterResult.reason
                    );
                    
                    // Log the forwarded email
                    await this.logActivity({
                      user_id: account.user_id,
                      child_account_id: account.id,
                      activity_type: 'filter_match',
                      details: `Inappropriate email detected: ${filterResult.reason}`,
                      sender_email: parsed.from?.text || 'Unknown Sender'
                    });
                  } else {
                    // Since the user wants to delete all junk mail whether it's inappropriate or not
                    messagesToDelete.push(seqno);
                    
                    // Log the deletion of non-inappropriate junk
                    await this.logActivity({
                      user_id: account.user_id,
                      child_account_id: account.id,
                      activity_type: 'deleted',
                      details: `Deleted junk email with subject: ${parsed.subject || 'No Subject'}`,
                      sender_email: parsed.from?.text || 'Unknown Sender'
                    });
                  }
                  
                  messagesProcessed++;
                  
                  // If all messages have been processed, delete them
                  if (messagesProcessed === results.length && messagesToDelete.length > 0) {
                    console.log(`Deleting ${messagesToDelete.length} messages`);
                    imap.addFlags(messagesToDelete, '\\Deleted', (err) => {
                      if (err) {
                        console.error('Error marking messages for deletion:', err);
                      } else {
                        // Expunge actually removes the messages
                        imap.expunge((err) => {
                          if (err) {
                            console.error('Error expunging messages:', err);
                          } else {
                            console.log(`Successfully deleted ${messagesToDelete.length} messages`);
                          }
                        });
                      }
                    });
                  }
                } catch (err) {
                  console.error('Error processing message:', err);
                  messagesProcessed++;
                }
              });
            });
            
            fetch.once('end', () => {
              imap.end();
              resolve(null);
            });
          });
        });
      });
      
      console.log(`Finished checking emails for ${account.email}`);
      
    } catch (error) {
      console.error(`Error checking emails for ${account.email}:`, error);
      await this.logActivity({
        user_id: account.user_id,
        child_account_id: account.id,
        activity_type: 'error',
        details: `Error checking emails: ${error instanceof Error ? error.message : String(error)}`
      });
      throw error;
    }
  }
  
  async forwardEmail(
    account: ChildAccount,
    fromAddress: string,
    subject: string,
    text: string,
    html: string,
    filterReason: string
  ) {
    try {
      // Create a transporter using SMTP
      const transporter = nodemailer.createTransport({
        host: 'smtp.mail.me.com',
        port: 587,
        secure: false,
        auth: {
          user: account.email,
          pass: account.app_password
        }
      });
      
      // Prepare sanitized content
      const sanitizedText = `
        [FORWARDED BY KIDMAIL PROTECTOR]
        
        This email was sent to ${account.email} and filtered for inappropriate content.
        
        Filter match reason: ${filterReason}
        
        Original sender: ${fromAddress}
        
        --- ORIGINAL MESSAGE ---
        
        ${text}
      `;
      
      const sanitizedHtml = `
        <div style="background-color:#f8f9fa;padding:20px;margin-bottom:20px;border-radius:5px;">
          <h3 style="color:#1976d2;margin-top:0;">FORWARDED BY KIDMAIL PROTECTOR</h3>
          <p>This email was sent to <strong>${account.email}</strong> and filtered for inappropriate content.</p>
          <p><strong>Filter match reason:</strong> ${filterReason}</p>
          <p><strong>Original sender:</strong> ${fromAddress}</p>
        </div>
        <div style="border-left:4px solid #ddd;padding-left:15px;">
          ${html}
        </div>
      `;
      
      // Send the email
      await transporter.sendMail({
        from: `"KidMail Protector" <${account.email}>`,
        to: account.forwarding_email,
        subject: `[KIDMAIL ALERT] ${subject}`,
        text: sanitizedText,
        html: sanitizedHtml
      });
      
      console.log(`Email forwarded to ${account.forwarding_email}`);
      
      // Update last forward time
      await this.storageService!.updateChildAccount(account.id, {
        last_forward: new Date()
      });
      
      // Log the forward
      await this.logActivity({
        user_id: account.user_id,
        child_account_id: account.id,
        activity_type: 'forward',
        details: `Email forwarded to ${account.forwarding_email}`,
        sender_email: fromAddress
      });
      
    } catch (error) {
      console.error('Error forwarding email:', error);
      throw error;
    }
  }
  
  async logActivity(logData: InsertActivityLog) {
    if (!this.storageService) {
      console.error('Cannot log activity: email service not initialized');
      return;
    }
    
    try {
      await this.storageService.createActivityLog(logData);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }
  
  stopAllChecks() {
    this.checkIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.checkIntervals.clear();
    console.log('All email checks stopped');
  }
}

export const emailService = new EmailService();
