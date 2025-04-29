import { EmailProvider } from '../../shared/schema';
import { ProviderType } from './provider-factory';

/**
 * OAuth Token Response
 * 
 * The response format from OAuth2 token endpoints.
 */
interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * OAuth Service
 * 
 * Handles OAuth2 authentication flows for email providers that support it.
 */
export class OAuthService {
  private static instance: OAuthService;
  private providerSettings: Map<ProviderType, EmailProvider> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of the OAuth service
   * @returns The OAuth service instance
   */
  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Set provider settings to be used for OAuth flows
   * @param settings An array of provider settings
   */
  setProviderSettings(settings: EmailProvider[]): void {
    this.providerSettings.clear();
    settings.forEach(setting => {
      if (setting.oauth_enabled) {
        this.providerSettings.set(setting.provider_type as ProviderType, setting);
      }
    });
  }

  /**
   * Get the OAuth2 authorization URL for a provider
   * @param providerType The type of email provider
   * @param redirectUri The redirect URI to use (override provider default)
   * @returns The authorization URL to redirect the user to
   */
  getAuthorizationUrl(providerType: ProviderType, redirectUri?: string): string | null {
    const providerSettings = this.providerSettings.get(providerType);
    
    if (!providerSettings || !providerSettings.oauth_enabled) {
      console.error(`Provider ${providerType} does not support OAuth or is not configured`);
      return null;
    }
    
    // Build authorization URL with query parameters
    try {
      const authUrl = new URL(providerSettings.oauth_auth_url);
      
      // Common OAuth parameters
      authUrl.searchParams.append('client_id', providerSettings.oauth_client_id);
      authUrl.searchParams.append('redirect_uri', redirectUri || providerSettings.oauth_redirect_uri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', providerSettings.oauth_scope);
      
      // Add state parameter for security
      authUrl.searchParams.append('state', this.generateStateParam());
      
      // Provider-specific parameters
      if (providerType === 'gmail') {
        authUrl.searchParams.append('access_type', 'offline');
        authUrl.searchParams.append('prompt', 'consent');
      }
      
      return authUrl.toString();
    } catch (error) {
      console.error(`Error building authorization URL for ${providerType}:`, error);
      return null;
    }
  }

  /**
   * Exchange an authorization code for access and refresh tokens
   * @param providerType The type of email provider
   * @param code The authorization code from the OAuth callback
   * @param redirectUri The redirect URI used in the authorization request
   * @returns The token response or null if an error occurred
   */
  async exchangeCodeForTokens(
    providerType: ProviderType,
    code: string,
    redirectUri?: string
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  } | null> {
    const providerSettings = this.providerSettings.get(providerType);
    
    if (!providerSettings || !providerSettings.oauth_enabled) {
      console.error(`Provider ${providerType} does not support OAuth or is not configured`);
      return null;
    }
    
    try {
      // Build token request body
      const body = new URLSearchParams();
      body.append('client_id', providerSettings.oauth_client_id);
      body.append('client_secret', providerSettings.oauth_client_secret);
      body.append('code', code);
      body.append('grant_type', 'authorization_code');
      body.append('redirect_uri', redirectUri || providerSettings.oauth_redirect_uri);
      
      // Send token request
      const response = await fetch(providerSettings.oauth_token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: body.toString()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      // Parse response
      const tokenResponse: OAuthTokenResponse = await response.json();
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);
      
      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || '',
        expiresAt
      };
    } catch (error) {
      console.error(`Error exchanging code for tokens for ${providerType}:`, error);
      return null;
    }
  }

  /**
   * Refresh an expired access token using the refresh token
   * @param providerType The type of email provider
   * @param refreshToken The refresh token to use
   * @returns The new access token and expiration date, or null if an error occurred
   */
  async refreshAccessToken(
    providerType: ProviderType,
    refreshToken: string
  ): Promise<{
    accessToken: string;
    expiresAt: Date;
  } | null> {
    const providerSettings = this.providerSettings.get(providerType);
    
    if (!providerSettings || !providerSettings.oauth_enabled) {
      console.error(`Provider ${providerType} does not support OAuth or is not configured`);
      return null;
    }
    
    try {
      // Build token request body
      const body = new URLSearchParams();
      body.append('client_id', providerSettings.oauth_client_id);
      body.append('client_secret', providerSettings.oauth_client_secret);
      body.append('refresh_token', refreshToken);
      body.append('grant_type', 'refresh_token');
      
      // Send token request
      const response = await fetch(providerSettings.oauth_token_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: body.toString()
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Refresh token request failed: ${response.status} ${response.statusText}\n${errorText}`);
      }
      
      // Parse response
      const tokenResponse: OAuthTokenResponse = await response.json();
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);
      
      return {
        accessToken: tokenResponse.access_token,
        expiresAt
      };
    } catch (error) {
      console.error(`Error refreshing token for ${providerType}:`, error);
      return null;
    }
  }

  /**
   * Generate a random state parameter for OAuth requests
   * @returns A random string to use as the state parameter
   */
  private generateStateParam(): string {
    const randomBytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}