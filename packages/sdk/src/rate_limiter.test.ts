import { describe, expect, it, vi } from 'vitest';
import { ClientRateLimiter, parseRetryAfterMs } from './rate_limiter';

describe('parseRetryAfterMs', () => {
  it('parses numeric Retry-After seconds', () => {
    expect(parseRetryAfterMs('3')).toBe(3000);
  });

  it('parses Retry-After HTTP date values', () => {
    const futureDate = new Date(Date.now() + 2000).toUTCString();
    expect(parseRetryAfterMs(futureDate)).toBeGreaterThan(0);
  });

  it('returns zero for invalid headers', () => {
    expect(parseRetryAfterMs('invalid')).toBe(0);
  });
});

describe('ClientRateLimiter', () => {
  it('waits when rate limit is exhausted', async () => {
    const limiter = new ClientRateLimiter({ maxRetries: 3 });
    const waiter = vi.fn(async () => Promise.resolve());

    limiter.updateFromHeaders({ 'x-ratelimit-remaining': '0', 'retry-after': '2' }, () => 1000);
    await limiter.waitIfNeeded(waiter, () => 1000);

    expect(waiter).toHaveBeenCalledWith(2000);
  });

  it('retries only 429 and 5xx responses within retry budget', () => {
    const limiter = new ClientRateLimiter({ maxRetries: 2 });
    expect(limiter.shouldRetry(429, 1)).toBe(true);
    expect(limiter.shouldRetry(503, 1)).toBe(true);
    expect(limiter.shouldRetry(404, 1)).toBe(false);
  });

  it('computes deterministic exponential backoff when jitter is neutral', () => {
    const limiter = new ClientRateLimiter({ maxRetries: 4 });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(limiter.computeDelayMs(2)).toBe(4000);

    randomSpy.mockRestore();
  });
});
