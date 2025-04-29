// Export provider interfaces and types
export * from './provider-interface';
export * from './base-provider';

// Export provider implementations
export { ICloudProvider } from './icloud-provider';
export { GmailProvider } from './gmail-provider';
export { OutlookProvider } from './outlook-provider';

// Export factory and manager
import { EmailProviderFactory } from './provider-factory';
export { EmailProviderFactory };
export type { ProviderType } from './provider-factory';
export { EmailProviderManager } from './provider-manager';
export { OAuthService } from './oauth-service';

// Default export for convenience
import { EmailProviderManager } from './provider-manager';
export default EmailProviderManager;