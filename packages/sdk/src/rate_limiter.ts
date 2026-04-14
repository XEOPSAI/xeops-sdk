const DEFAULT_RETRY_DELAY_SECONDS = 1;
const MAX_RETRY_ATTEMPTS = 4;
const JITTER_RATIO = 0.2;

export interface ClientRateLimiterConfig {
  maxRetries?: number;
}

/**
 * Parse Retry-After header value into milliseconds.
 */
export function parseRetryAfterMs(headerValue?: string | number): number {
  if (headerValue === undefined) {
    return 0;
  }

  const normalized = String(headerValue).trim();
  const asSeconds = Number.parseInt(normalized, 10);
  if (!Number.isNaN(asSeconds) && asSeconds > 0) {
    return asSeconds * 1000;
  }

  const asDateMs = Date.parse(normalized);
  if (Number.isNaN(asDateMs)) {
    return 0;
  }

  const delta = asDateMs - Date.now();
  return delta > 0 ? delta : 0;
}

/**
 * SDK-side rate limiter using X-RateLimit-Remaining and Retry-After headers.
 */
export class ClientRateLimiter {
  private nextAllowedRequestAt = 0;
  private readonly maxRetries: number;

  constructor(config: ClientRateLimiterConfig = {}) {
    this.maxRetries = config.maxRetries ?? MAX_RETRY_ATTEMPTS;
  }

  async waitIfNeeded(waiter: (ms: number) => Promise<void>, now: () => number = () => Date.now()): Promise<void> {
    const remainingWaitMs = this.nextAllowedRequestAt - now();
    if (remainingWaitMs <= 0) {
      return;
    }

    await waiter(remainingWaitMs);
  }

  updateFromHeaders(headers: Record<string, unknown>, now: () => number = () => Date.now()): void {
    const remaining = headers['x-ratelimit-remaining'];
    const retryAfterMs = parseRetryAfterMs(headers['retry-after'] as string | number | undefined);
    if (retryAfterMs <= 0 || (remaining !== '0' && remaining !== 0 && remaining !== undefined)) {
      return;
    }

    this.nextAllowedRequestAt = Math.max(this.nextAllowedRequestAt, now() + retryAfterMs);
  }

  shouldRetry(statusCode: number | undefined, attempt: number): boolean {
    if (attempt >= this.maxRetries || statusCode === undefined) {
      return false;
    }

    if (statusCode === 429) {
      return true;
    }

    return statusCode >= 500;
  }

  computeDelayMs(attempt: number, retryAfterSeconds?: number): number {
    const retryAfterMs = parseRetryAfterMs(retryAfterSeconds);
    if (retryAfterMs > 0) {
      return retryAfterMs;
    }

    const boundedAttempt = Math.min(attempt, this.maxRetries);
    const baseDelay = DEFAULT_RETRY_DELAY_SECONDS * 1000 * (2 ** boundedAttempt);
    const jitter = Math.floor(baseDelay * JITTER_RATIO * Math.random());
    return baseDelay + jitter;
  }
}
