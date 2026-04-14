import { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';

const DEFAULT_RETRY_AFTER_SECONDS = 1;
const MILLISECONDS_IN_SECOND = 1_000;
const RETRY_STATUS = 429;

/**
 * SDK client-side rate limiter based on HTTP response headers.
 */
export class SDKRateLimiter {
  private nextAllowedAt = 0;

  /**
   * Update limiter state from response headers.
   */
  updateFromHeaders(headers: AxiosResponseHeaders | RawAxiosResponseHeaders | undefined): void {
    const retryAfterSeconds = parseRetryAfterSeconds(headers?.['retry-after']);
    const remainingRequests = parseIntegerHeader(headers?.['x-ratelimit-remaining']);

    if (retryAfterSeconds !== null) {
      this.nextAllowedAt = Date.now() + retryAfterSeconds * MILLISECONDS_IN_SECOND;
      return;
    }

    if (remainingRequests === 0) {
      this.nextAllowedAt = Date.now() + DEFAULT_RETRY_AFTER_SECONDS * MILLISECONDS_IN_SECOND;
    }
  }

  /**
   * Calculate retry delay with exponential backoff + jitter.
   */
  computeRetryDelayMs(attempt: number, headers: AxiosResponseHeaders | RawAxiosResponseHeaders | undefined): number {
    const retryAfterSeconds = parseRetryAfterSeconds(headers?.['retry-after']);
    const baseDelayMs = retryAfterSeconds !== null
      ? retryAfterSeconds * MILLISECONDS_IN_SECOND
      : DEFAULT_RETRY_AFTER_SECONDS * MILLISECONDS_IN_SECOND * Math.pow(2, Math.max(0, attempt - 1));

    const jitterMs = Math.floor(baseDelayMs * 0.1 * Math.random());
    const headerDelayMs = Math.max(0, this.nextAllowedAt - Date.now());
    return Math.max(baseDelayMs + jitterMs, headerDelayMs);
  }

  /**
   * Determine whether a response should be retried.
   */
  shouldRetry(statusCode: number | undefined): boolean {
    if (!statusCode) return true;
    if (statusCode === RETRY_STATUS) return true;
    return statusCode >= 500;
  }
}

function parseRetryAfterSeconds(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric;
  }

  if (typeof value === 'string') {
    const dateValue = Date.parse(value);
    if (!Number.isNaN(dateValue)) {
      const milliseconds = Math.max(0, dateValue - Date.now());
      return Math.ceil(milliseconds / MILLISECONDS_IN_SECOND);
    }
  }

  return null;
}

function parseIntegerHeader(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}
