import { storage } from './storage';
import { ChildAccount, InsertActivityLog, EmailProvider } from '@shared/schema';
import { contentFilter } from './content-filter';
import { 
  EmailProviderManager, 
  EmailProviderFactory, 
  ProviderType,
  OAuthService
} from './providers';

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
      // Get junk mail preferences for this account
      const junkPreferences = await this.storageService.getJunkMailPreferences(account.user_id, account.id);
      
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
      
      // Get provider settings for this account
      const providerSettings = await this.storageService.getEmailProvider(account.provider_id);
      if (!providerSettings) {
        throw new Error(`No provider settings found for provider ID ${account.provider_id}`);
      }
      
      // Get a provider manager instance
      const providerManager = EmailProviderManager.getInstance();
      
      // Load provider settings into the manager
      const allProviders = await this.storageService.getAllEmailProviders();
      providerManager.setProviderSettings(allProviders);
      
      // Get a provider instance for this account
      const provider = await providerManager.getProviderForAccount(account);
      if (!provider) {
        throw new Error(`Failed to get provider for account ${account.id}`);
      }
      
      // Determine the junk folder path
      const junkFolderPath = account.custom_junk_folder || providerSettings.junk_folder_path || 'Junk';
      
      // Select the junk folder
      const folderSelected = await provider.selectFolder(junkFolderPath);
      if (!folderSelected) {
        throw new Error(`Failed to select folder ${junkFolderPath}`);
      }
      
      // List unread messages in the junk folder
      const messages = await provider.listMessages(junkFolderPath, {
        unreadOnly: true,
        limit: 50
      });
      
      if (messages.length === 0) {
        console.log('No new messages');
        return;
      }
      
      console.log(`Found ${messages.length} new junk messages`);
      
      // Process each message
      const messagesToDelete: string[] = [];
      
      for (const message of messages) {
        try {
          const fromAddress = message.from || 'Unknown Sender';
          const subject = message.subject || 'No Subject';
          const textContent = message.text || '';
          const htmlContent = message.html || '';
          
          // Check if the sender is trusted
          const isTrusted = await this.storageService.isEmailTrusted(
            fromAddress, 
            account.user_id, 
            account.id
          );
          
          if (isTrusted) {
            // Skip processing for trusted senders
            await this.logActivity({
              user_id: account.user_id,
              child_account_id: account.id,
              activity_type: 'trusted_sender',
              details: `Kept email from trusted sender: ${fromAddress}`,
              sender_email: fromAddress
            });
            continue;
          }
          
          // Check if the email should be kept based on junk mail preferences
          let shouldKeep = false;
          let keepReason = '';
          
          if (junkPreferences) {
            // Check if it's a newsletter and we want to keep newsletters
            if (junkPreferences.keep_newsletters && 
                (subject.toLowerCase().includes('newsletter') || 
                 textContent.toLowerCase().includes('newsletter') || 
                 textContent.toLowerCase().includes('subscribe') || 
                 textContent.toLowerCase().includes('unsubscribe'))) {
              shouldKeep = true;
              keepReason = 'newsletter';
            }
            
            // Check if it's a receipt/order confirmation and we want to keep those
            if (junkPreferences.keep_receipts && 
                (subject.toLowerCase().includes('receipt') ||
                 subject.toLowerCase().includes('order') ||
                 subject.toLowerCase().includes('confirmation') ||
                 subject.toLowerCase().includes('invoice'))) {
              shouldKeep = true;
              keepReason = 'receipt/order';
            }
            
            // Check if it's from social media and we want to keep those
            if (junkPreferences.keep_social_media && 
                (fromAddress.toLowerCase().includes('facebook') || 
                 fromAddress.toLowerCase().includes('instagram') ||
                 fromAddress.toLowerCase().includes('twitter') ||
                 fromAddress.toLowerCase().includes('linkedin') ||
                 fromAddress.toLowerCase().includes('tiktok'))) {
              shouldKeep = true;
              keepReason = 'social media';
            }
          }
          
          if (shouldKeep) {
            // Log that we're keeping this junk mail
            await this.logActivity({
              user_id: account.user_id,
              child_account_id: account.id,
              activity_type: 'kept',
              details: `Kept junk email (${keepReason}): ${subject}`,
              sender_email: fromAddress
            });
            
            // Mark as read but don't delete
            await provider.markAsRead(message.id);
            continue;
          }
          
          // Check if the content is inappropriate
          const filterResult = await this.contentFilterService.checkContent(
            subject,
            textContent,
            htmlContent,
            account.user_id,
            fromAddress,
            account.id
          );
          
          if (filterResult.isInappropriate) {
            console.log(`Inappropriate content detected: ${filterResult.reason}`);
            
            // Mark for deletion
            messagesToDelete.push(message.id);
            
            // Forward the email to the parent
            await this.forwardEmail(
              account, 
              providerSettings,
              provider,
              fromAddress,
              subject,
              textContent,
              htmlContent,
              filterResult.reason
            );
            
            // Log the forwarded email
            await this.logActivity({
              user_id: account.user_id,
              child_account_id: account.id,
              activity_type: 'filter_match',
              details: `Inappropriate email detected: ${filterResult.reason}`,
              sender_email: fromAddress
            });
          } else if (junkPreferences && junkPreferences.auto_delete_all) {
            // Delete based on junk mail preferences
            messagesToDelete.push(message.id);
            
            // Log the deletion of non-inappropriate junk
            await this.logActivity({
              user_id: account.user_id,
              child_account_id: account.id,
              activity_type: 'deleted',
              details: `Deleted junk email with subject: ${subject}`,
              sender_email: fromAddress
            });
          }
        } catch (err) {
          console.error('Error processing message:', err);
        }
      }
      
      // Delete messages marked for deletion
      if (messagesToDelete.length > 0) {
        console.log(`Deleting ${messagesToDelete.length} messages`);
        
        for (const messageId of messagesToDelete) {
          try {
            await provider.deleteMessage(messageId);
          } catch (err) {
            console.error(`Error deleting message ${messageId}:`, err);
          }
        }
        
        console.log(`Finished deleting messages`);
      }
      
      // Disconnect from the provider
      await provider.disconnect();
      
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
    providerSettings: EmailProvider,
    provider: EmailProviderInterface,
    fromAddress: string,
    subject: string,
    text: string,
    html: string,
    filterReason: string
  ) {
    try {
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
      
      // Send the email using the provider
      const sent = await provider.sendMail({
        from: `"KidMail Protector" <${account.email}>`,
        to: account.forwarding_email,
        subject: `[KIDMAIL ALERT] ${subject}`,
        text: sanitizedText,
        html: sanitizedHtml
      });
      
      if (!sent) {
        console.error(`Failed to send email: ${provider.getLastError?.()?.message || 'Unknown error'}`);
        throw new Error('Failed to send forwarded email');
      }
      
      console.log(`Email forwarded to ${account.forwarding_email}`);
      
      // Update last forward time
      await this.storageService!.updateChildAccount(account.id, {
        last_forward: new Date()
      } as any); // Using 'as any' temporarily to bypass TS error
      
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
