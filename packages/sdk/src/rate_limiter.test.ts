import { describe, expect, it, vi } from 'vitest';
import { XeOpsRateLimiter } from './rate_limiter';

describe('XeOpsRateLimiter#getRetryDecision', () => {
  it('retries with exponential delay on 429', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const limiter = new XeOpsRateLimiter();
    const decision = limiter.getRetryDecision(429, 2);

    expect(decision.shouldRetry).toBe(true);
    expect(decision.delayMs).toBe(4000);
  });

  it('does not retry non-429 client errors', () => {
    const limiter = new XeOpsRateLimiter();

    expect(limiter.getRetryDecision(400, 1)).toEqual({ shouldRetry: false, delayMs: 0 });
  });

  it('does not retry unknown status', () => {
    const limiter = new XeOpsRateLimiter();

    expect(limiter.getRetryDecision(undefined, 1)).toEqual({ shouldRetry: false, delayMs: 0 });
  });
});

describe('XeOpsRateLimiter#updateFromResponse', () => {
  it('stores wait window for 429 Retry-After', async () => {
    const limiter = new XeOpsRateLimiter();
    const start = Date.now();

    limiter.updateFromResponse(429, { 'retry-after': '1' }, start);
    const beforeWait = Date.now();
    await limiter.waitForAvailability(start);
    const elapsed = Date.now() - beforeWait;

    expect(elapsed).toBeGreaterThanOrEqual(900);
  });

  it('stores wait window when remaining is zero and retry-after exists', async () => {
    const limiter = new XeOpsRateLimiter();
    const start = Date.now();

    limiter.updateFromResponse(200, { 'x-ratelimit-remaining': '0', 'retry-after': '1' }, start);
    const beforeWait = Date.now();
    await limiter.waitForAvailability(start);
    const elapsed = Date.now() - beforeWait;

    expect(elapsed).toBeGreaterThanOrEqual(900);
  });

  it('ignores malformed headers safely', async () => {
    const limiter = new XeOpsRateLimiter();

    limiter.updateFromResponse(200, { 'x-ratelimit-remaining': 'abc', 'retry-after': 'x' }, Date.now());
    const beforeWait = Date.now();
    await limiter.waitForAvailability(Date.now());
    const elapsed = Date.now() - beforeWait;

    expect(elapsed).toBeLessThan(100);
  });
});
