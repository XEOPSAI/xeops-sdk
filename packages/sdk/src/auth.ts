import axios from 'axios';

export interface ApiKeyAuthConfig {
  type: 'apiKey';
  apiKey: string;
}

export interface OAuthClientCredentialsConfig {
  type: 'oauth';
  clientId: string;
  clientSecret: string;
  tokenUrl?: string;
  scope?: string | string[];
  audience?: string;
}

export type ScannerAuthConfig = ApiKeyAuthConfig | OAuthClientCredentialsConfig;

interface OAuthTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

interface CachedOAuthToken {
  accessToken: string;
  expiresAt: number;
}

export function normalizeApiKey(apiKey: string): string {
  return apiKey.trim();
}

export function buildApiKeyHeaders(apiKey: string): Record<string, string> {
  const normalized = normalizeApiKey(apiKey);
  if (!normalized) {
    throw new Error('API key is required');
  }

  return {
    'X-API-Key': normalized
  };
}

export function resolveAuthConfig(config: {
  apiKey?: string;
  auth?: ScannerAuthConfig;
}): ScannerAuthConfig {
  if (config.auth) {
    return config.auth;
  }

  if (config.apiKey) {
    return {
      type: 'apiKey',
      apiKey: config.apiKey
    };
  }

  throw new Error('Authentication is required. Provide apiKey or auth configuration.');
}

export class OAuthClientCredentialsProvider {
  private cachedToken?: CachedOAuthToken;

  constructor(
    private readonly config: OAuthClientCredentialsConfig,
    private readonly apiEndpoint: string,
    private readonly timeout: number
  ) {}

  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.accessToken;
    }

    const token = await this.fetchToken();
    this.cachedToken = token;
    return token.accessToken;
  }

  private async fetchToken(): Promise<CachedOAuthToken> {
    const tokenUrl = this.resolveTokenUrl();
    const scope = Array.isArray(this.config.scope)
      ? this.config.scope.join(' ')
      : this.config.scope;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret
    });

    if (scope) {
      body.set('scope', scope);
    }

    if (this.config.audience) {
      body.set('audience', this.config.audience);
    }

    const response = await axios.post<OAuthTokenResponse>(tokenUrl, body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: this.timeout
    });

    const accessToken = response.data?.access_token?.trim();
    if (!accessToken) {
      throw new Error('OAuth token response missing access_token');
    }

    const expiresIn = response.data.expires_in ?? 300;
    const safetyMarginSeconds = 30;

    return {
      accessToken,
      expiresAt: Date.now() + Math.max(1, expiresIn - safetyMarginSeconds) * 1000
    };
  }

  private resolveTokenUrl(): string {
    if (this.config.tokenUrl) {
      return this.config.tokenUrl;
    }

    return `${this.apiEndpoint.replace(/\/$/, '')}/oauth/token`;
  }
}
