import { AxiosError, AxiosRequestConfig, AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';

const BASE_DELAY_MS = 250;
const MAX_DELAY_MS = 10_000;

interface RetryState {
  attempt: number;
}

/**
 * Client-side rate limiting helper driven by API response headers.
 */
export class ClientRateLimiter {
  private retryAfterMs: number | null = null;
  private remaining: number | null = null;

  /**
   * Update limiter state from HTTP response headers.
   */
  updateFromHeaders(headers?: AxiosResponseHeaders | RawAxiosResponseHeaders): void {
    if (!headers) {
      return;
    }

    this.retryAfterMs = parseRetryAfterMs(headers['retry-after']);
    this.remaining = parseRemaining(headers['x-ratelimit-remaining']);
  }

  /**
   * Resolve backoff delay for a retry attempt.
   */
  getDelayMs(attempt: number): number {
    const serverDelay = this.retryAfterMs ?? 0;
    const exponentialDelay = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    const jitter = Math.floor(Math.random() * BASE_DELAY_MS);
    return Math.max(serverDelay, exponentialDelay + jitter);
  }

  /**
   * Determine whether this request should be retried.
   */
  shouldRetry(error: AxiosError, maxRetries: number): boolean {
    const statusCode = error.response?.status;
    const retryable = statusCode === 429 || (statusCode !== undefined && statusCode >= 500);
    const nonRetryable4xx = statusCode !== undefined && statusCode >= 400 && statusCode < 500 && statusCode !== 429;

    if (nonRetryable4xx || !retryable) {
      return false;
    }

    const state = getRetryState(error.config);
    return state.attempt < maxRetries;
  }

  /**
   * Prepare request config for the next retry attempt.
   */
  nextRetryConfig(config: AxiosRequestConfig | undefined): AxiosRequestConfig {
    const safeConfig = config ?? {};
    const state = getRetryState(safeConfig);
    const nextAttempt = state.attempt + 1;

    return {
      ...safeConfig,
      __xeopsRetryState: {
        attempt: nextAttempt
      }
    } as AxiosRequestConfig;
  }
}

function getRetryState(config: AxiosRequestConfig | undefined): RetryState {
  const safeConfig = config as AxiosRequestConfig & { __xeopsRetryState?: RetryState };
  return safeConfig?.__xeopsRetryState ?? { attempt: 0 };
}

function parseRetryAfterMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const seconds = Number.parseInt(value, 10);
  if (!Number.isNaN(seconds)) {
    return Math.max(seconds * 1000, 0);
  }

  const dateTimeMs = Date.parse(value);
  if (Number.isNaN(dateTimeMs)) {
    return null;
  }

  return Math.max(dateTimeMs - Date.now(), 0);
}

function parseRemaining(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
