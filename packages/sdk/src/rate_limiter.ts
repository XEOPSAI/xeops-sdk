const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30000;
const MILLISECONDS_PER_SECOND = 1000;

interface RateLimiterHeaders {
  [key: string]: unknown;
}

/**
 * Client-side rate limiter for retry/backoff behavior.
 */
export class ClientRateLimiter {
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly randomFn: () => number;

  constructor(options?: {
    baseDelayMs?: number;
    maxDelayMs?: number;
    randomFn?: () => number;
  }) {
    this.baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.randomFn = options?.randomFn ?? Math.random;
  }

  /**
   * Returns true when a request should be retried.
   */
  shouldRetry(statusCode?: number): boolean {
    if (!statusCode) {
      return true;
    }

    if (statusCode === 429) {
      return true;
    }

    return statusCode >= 500;
  }

  /**
   * Computes retry delay using Retry-After or exponential backoff with jitter.
   */
  getRetryDelay(attempt: number, headers?: RateLimiterHeaders): number {
    const retryAfterMs = this.parseRetryAfter(headers);
    if (retryAfterMs !== undefined) {
      return retryAfterMs;
    }

    const boundedAttempt = Math.max(attempt, 1);
    const exponentialDelay = this.baseDelayMs * Math.pow(2, boundedAttempt - 1);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    const jitter = Math.floor(this.randomFn() * this.baseDelayMs);

    return cappedDelay + jitter;
  }

  private parseRetryAfter(headers?: RateLimiterHeaders): number | undefined {
    if (!headers) {
      return undefined;
    }

    const rawRetryAfter = headers['retry-after'] ?? headers['Retry-After'];
    if (typeof rawRetryAfter !== 'string' && typeof rawRetryAfter !== 'number') {
      return undefined;
    }

    const value = String(rawRetryAfter).trim();
    const seconds = Number(value);
    if (Number.isFinite(seconds)) {
      return Math.max(0, Math.floor(seconds * MILLISECONDS_PER_SECOND));
    }

    const dateValue = Date.parse(value);
    if (Number.isNaN(dateValue)) {
      return undefined;
    }

    return Math.max(0, dateValue - Date.now());
  }
}
