export interface RateLimiterHeaders {
  'x-ratelimit-remaining'?: string;
  'retry-after'?: string;
}

export interface RateLimiterDelays {
  retryDelayMs: number;
  nextBackoffMs: number;
}

const MILLISECONDS_PER_SECOND = 1000;
const MIN_RETRY_DELAY_MS = 100;
const MAX_BACKOFF_MS = 30000;
const JITTER_RATIO = 0.2;

/**
 * Parse `Retry-After` header (seconds) into milliseconds.
 */
export function parseRetryAfterMs(retryAfter?: string): number | null {
  if (!retryAfter) {
    return null;
  }

  const seconds = Number.parseFloat(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return Math.round(seconds * MILLISECONDS_PER_SECOND);
}

/**
 * Compute an exponential backoff delay with bounded random jitter.
 */
export function computeBackoffWithJitter(backoffMs: number, randomValue: number): number {
  const safeRandom = Math.min(1, Math.max(0, randomValue));
  const jitterAmplitude = Math.round(backoffMs * JITTER_RATIO);
  const jitter = Math.round((safeRandom * 2 - 1) * jitterAmplitude);
  const delayed = backoffMs + jitter;

  return Math.max(MIN_RETRY_DELAY_MS, delayed);
}

/**
 * Calculate the delay to apply after a 429 response.
 */
export function calculateRateLimitDelay(
  headers: RateLimiterHeaders,
  currentBackoffMs: number,
  randomValue: number
): RateLimiterDelays {
  const retryAfterMs = parseRetryAfterMs(headers['retry-after']);
  const boundedBackoff = Math.min(MAX_BACKOFF_MS, Math.max(MIN_RETRY_DELAY_MS, currentBackoffMs));
  const delay = retryAfterMs ?? computeBackoffWithJitter(boundedBackoff, randomValue);

  return {
    retryDelayMs: delay,
    nextBackoffMs: Math.min(MAX_BACKOFF_MS, boundedBackoff * 2)
  };
}

/**
 * Decide whether a response status should be retried.
 */
export function shouldRetryStatus(statusCode: number): boolean {
  return statusCode === 429 || statusCode >= 500;
}
