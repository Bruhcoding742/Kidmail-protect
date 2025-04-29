import { EmailProviderInterface } from './provider-interface';
import { ICloudProvider } from './icloud-provider';
import { GmailProvider } from './gmail-provider';
import { OutlookProvider } from './outlook-provider';

// Add more provider types as they are implemented
export type ProviderType = 'icloud' | 'gmail' | 'outlook' | 'yahoo' | 'aol' | 'protonmail' | 'zoho' | 'other';

/**
 * Email Provider Factory
 * 
 * A factory class that creates and returns the appropriate email provider
 * instance based on the provider type.
 */
export class EmailProviderFactory {
  // Cache provider instances to avoid recreating them
  private static providerInstances: Map<ProviderType, EmailProviderInterface> = new Map();

  /**
   * Create and return an email provider instance based on the provider type
   * @param providerType The type of email provider to create
   * @returns An instance of the appropriate email provider
   */
  static getProvider(providerType: ProviderType): EmailProviderInterface {
    // Check if we already have an instance for this provider type
    if (this.providerInstances.has(providerType)) {
      const provider = this.providerInstances.get(providerType);
      if (provider) {
        return provider;
      }
    }

    // Create a new instance based on the provider type
    let provider: EmailProviderInterface;

    switch (providerType) {
      case 'icloud':
        provider = new ICloudProvider();
        break;
      case 'gmail':
        provider = new GmailProvider();
        break;
      case 'outlook':
        provider = new OutlookProvider();
        break;
      // Add more cases as more providers are implemented
      case 'yahoo':
      case 'aol':
      case 'protonmail':
      case 'zoho':
      case 'other':
      default:
        // Default to ICloudProvider for now, we can implement more providers later
        console.warn(`Provider type '${providerType}' not fully implemented yet, falling back to iCloud provider`);
        provider = new ICloudProvider();
        break;
    }

    // Cache the instance for future use
    this.providerInstances.set(providerType, provider);
    return provider;
  }

  /**
   * Check if a provider type is supported
   * @param providerType The provider type to check
   * @returns True if the provider type is supported, false otherwise
   */
  static isProviderSupported(providerType: ProviderType): boolean {
    return ['icloud', 'gmail', 'outlook'].includes(providerType);
  }

  /**
   * Get a list of all supported provider types
   * @returns An array of supported provider types
   */
  static getSupportedProviders(): ProviderType[] {
    return ['icloud', 'gmail', 'outlook'];
  }

  /**
   * Get a list of all provider types that support OAuth2 authentication
   * @returns An array of provider types that support OAuth2 authentication
   */
  static getOAuth2Providers(): ProviderType[] {
    return ['gmail', 'outlook'];
  }
}