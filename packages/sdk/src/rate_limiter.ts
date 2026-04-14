const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 250;
const DEFAULT_MAX_DELAY_MS = 5000;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export interface RateLimiterConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  random?: () => number;
}

/**
 * SDK-side rate limiter based on response headers and retry strategy.
 */
export class ClientRateLimiter {
  private retryAtEpochMs = 0;
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly random: () => number;

  constructor(config: RateLimiterConfig = {}) {
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelayMs = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this.maxDelayMs = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this.random = config.random ?? Math.random;
  }

  updateFromHeaders(headers?: Record<string, unknown>): void {
    if (!headers) {
      return;
    }

    const remaining = Number(headers['x-ratelimit-remaining']);
    const retryAfter = Number(headers['retry-after']);
    if (remaining !== 0 || Number.isNaN(retryAfter) || retryAfter < 0) {
      return;
    }

    this.retryAtEpochMs = Date.now() + retryAfter * 1000;
  }

  async waitIfNeeded(sleep: (ms: number) => Promise<void>): Promise<void> {
    const delay = this.retryAtEpochMs - Date.now();
    if (delay > 0) {
      await sleep(delay);
    }
  }

  shouldRetry(statusCode: number | undefined, attempt: number): boolean {
    if (!statusCode || attempt >= this.maxRetries) {
      return false;
    }
    return RETRYABLE_STATUSES.has(statusCode);
  }

  computeDelayMs(attempt: number, retryAfterSeconds?: number): number {
    if (retryAfterSeconds && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }

    const cappedAttempt = Math.max(0, attempt);
    const exponential = this.baseDelayMs * (2 ** cappedAttempt);
    const jitter = Math.floor(this.random() * this.baseDelayMs);
    return Math.min(exponential + jitter, this.maxDelayMs);
  }
}
