import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});
import { SDKRateLimiter } from './rate_limiter';

describe('SDKRateLimiter.updateFromHeaders', () => {
  it('uses Retry-After to set next allowed timestamp', () => {
    const limiter = new SDKRateLimiter();
    limiter.updateFromHeaders({ 'retry-after': '2' });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const delay = limiter.computeRetryDelayMs(1, undefined);
    expect(delay).toBeGreaterThanOrEqual(1_900);
    expect(delay).toBeLessThanOrEqual(2_100);
  });

  it('falls back when remaining requests reaches zero', () => {
    const limiter = new SDKRateLimiter();
    limiter.updateFromHeaders({ 'x-ratelimit-remaining': '0' });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const delay = limiter.computeRetryDelayMs(1, undefined);
    expect(delay).toBeGreaterThanOrEqual(900);
  });

  it('ignores invalid headers without crashing', () => {
    const limiter = new SDKRateLimiter();
    limiter.updateFromHeaders({ 'retry-after': 'invalid' });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    const delay = limiter.computeRetryDelayMs(2, undefined);
    expect(delay).toBe(2_000);
  });
});

describe('SDKRateLimiter.shouldRetry', () => {
  it('retries for 429 responses', () => {
    const limiter = new SDKRateLimiter();
    expect(limiter.shouldRetry(429)).toBe(true);
  });

  it('does not retry for non-429 client errors', () => {
    const limiter = new SDKRateLimiter();
    expect(limiter.shouldRetry(400)).toBe(false);
    expect(limiter.shouldRetry(404)).toBe(false);
  });

  it('retries for server and network-like failures', () => {
    const limiter = new SDKRateLimiter();
    expect(limiter.shouldRetry(503)).toBe(true);
    expect(limiter.shouldRetry(undefined)).toBe(true);
  });
});
