import { describe, expect, it } from 'vitest';
import { ClientRateLimiter } from './rate_limiter';

describe('ClientRateLimiter.shouldRetry', () => {
  it('returns true for 429 responses', () => {
    const limiter = new ClientRateLimiter();
    expect(limiter.shouldRetry(429)).toBe(true);
  });

  it('returns false for non-429 4xx responses', () => {
    const limiter = new ClientRateLimiter();
    expect(limiter.shouldRetry(404)).toBe(false);
  });

  it('returns true for network errors without status code', () => {
    const limiter = new ClientRateLimiter();
    expect(limiter.shouldRetry(undefined)).toBe(true);
  });
});

describe('ClientRateLimiter.getRetryDelay', () => {
  it('uses Retry-After header seconds when present', () => {
    const limiter = new ClientRateLimiter({ randomFn: () => 0 });
    const delay = limiter.getRetryDelay(1, { 'retry-after': '2' });
    expect(delay).toBe(2000);
  });

  it('uses exponential backoff + jitter without Retry-After', () => {
    const limiter = new ClientRateLimiter({ baseDelayMs: 1000, randomFn: () => 0.5 });
    const delay = limiter.getRetryDelay(2);
    expect(delay).toBe(2500);
  });

  it('returns 0 for Retry-After date in the past', () => {
    const limiter = new ClientRateLimiter({ randomFn: () => 0 });
    const delay = limiter.getRetryDelay(1, { 'retry-after': 'Wed, 01 Jan 2020 00:00:00 GMT' });
    expect(delay).toBe(0);
  });
});
