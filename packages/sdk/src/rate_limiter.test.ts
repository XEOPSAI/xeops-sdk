import { afterEach, describe, expect, it, vi } from 'vitest';
import { SDKRateLimiter } from './rate_limiter';

const RETRY_AFTER_SECONDS = '2';
const ONE_SECOND_DELAY_LOWER_BOUND = 900;
const TWO_SECOND_DELAY_LOWER_BOUND = 1_900;
const TWO_SECOND_DELAY_UPPER_BOUND = 2_100;
const RETRY_ATTEMPT_ONE = 1;
const RETRY_ATTEMPT_TWO = 2;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_SERVICE_UNAVAILABLE = 503;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SDKRateLimiter.updateFromHeaders', () => {
  it('uses Retry-After to set next allowed timestamp', () => {
    const limiter = new SDKRateLimiter();
    limiter.updateFromHeaders({ 'retry-after': RETRY_AFTER_SECONDS });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const delay = limiter.computeRetryDelayMs(RETRY_ATTEMPT_ONE, undefined);
    expect(delay).toBeGreaterThanOrEqual(TWO_SECOND_DELAY_LOWER_BOUND);
    expect(delay).toBeLessThanOrEqual(TWO_SECOND_DELAY_UPPER_BOUND);
  });

  it('falls back when remaining requests reaches zero', () => {
    const limiter = new SDKRateLimiter();
    limiter.updateFromHeaders({ 'x-ratelimit-remaining': '0' });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const delay = limiter.computeRetryDelayMs(RETRY_ATTEMPT_ONE, undefined);
    expect(delay).toBeGreaterThanOrEqual(ONE_SECOND_DELAY_LOWER_BOUND);
  });

  it('ignores invalid headers without crashing', () => {
    const limiter = new SDKRateLimiter();
    limiter.updateFromHeaders({ 'retry-after': 'invalid' });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const delay = limiter.computeRetryDelayMs(RETRY_ATTEMPT_TWO, undefined);
    expect(delay).toBe(2_000);
  });
});

describe('SDKRateLimiter.shouldRetry', () => {
  it('retries for 429 responses', () => {
    const limiter = new SDKRateLimiter();
    expect(limiter.shouldRetry(HTTP_STATUS_TOO_MANY_REQUESTS)).toBe(true);
  });

  it('does not retry for non-429 client errors', () => {
    const limiter = new SDKRateLimiter();
    expect(limiter.shouldRetry(HTTP_STATUS_BAD_REQUEST)).toBe(false);
    expect(limiter.shouldRetry(HTTP_STATUS_NOT_FOUND)).toBe(false);
  });

  it('retries for server and network-like failures', () => {
    const limiter = new SDKRateLimiter();
    expect(limiter.shouldRetry(HTTP_STATUS_SERVICE_UNAVAILABLE)).toBe(true);
    expect(limiter.shouldRetry(undefined)).toBe(true);
  });
});
