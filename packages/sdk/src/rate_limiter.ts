const MILLISECONDS_PER_SECOND = 1000;
const RETRYABLE_STATUS = 429;
const MAX_JITTER_MS = 250;

export type RetryDecision = {
  shouldRetry: boolean;
  delayMs: number;
};

/**
 * Client-side rate limiter for XeOps SDK requests.
 */
export class XeOpsRateLimiter {
  private nextAllowedAt = 0;

  /**
   * Wait until requests are allowed based on prior response headers.
   */
  async waitForAvailability(nowMs: number = Date.now()): Promise<void> {
    const waitMs = this.nextAllowedAt - nowMs;
    if (waitMs <= 0) {
      return;
    }

    await sleep(waitMs);
  }

  /**
   * Update limiter state from response headers/status code.
   */
  updateFromResponse(statusCode: number, headers?: Record<string, unknown>, nowMs: number = Date.now()): void {
    const retryAfterSeconds = parseRetryAfterSeconds(headers?.['retry-after']);
    if (statusCode === RETRYABLE_STATUS && retryAfterSeconds > 0) {
      this.nextAllowedAt = nowMs + retryAfterSeconds * MILLISECONDS_PER_SECOND;
      return;
    }

    const remaining = parseRemaining(headers?.['x-ratelimit-remaining']);
    if (remaining !== 0) {
      return;
    }

    if (retryAfterSeconds > 0) {
      this.nextAllowedAt = nowMs + retryAfterSeconds * MILLISECONDS_PER_SECOND;
    }
  }

  /**
   * Determine if a request should be retried and compute backoff delay.
   */
  getRetryDecision(statusCode: number | undefined, attempt: number): RetryDecision {
    if (statusCode !== RETRYABLE_STATUS) {
      return {
        shouldRetry: false,
        delayMs: 0
      };
    }

    const baseDelay = Math.max(1, 2 ** attempt) * MILLISECONDS_PER_SECOND;
    const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
    return {
      shouldRetry: true,
      delayMs: baseDelay + jitter
    };
  }
}

function parseRetryAfterSeconds(value: unknown): number {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return parsed;
}

function parseRemaining(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
