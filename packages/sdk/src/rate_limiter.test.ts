import {
  parseRetryAfterMs,
  computeBackoffWithJitter,
  calculateRateLimitDelay,
  shouldRetryStatus
} from './rate_limiter';

describe('parseRetryAfterMs', () => {
  it('returns milliseconds for valid seconds', () => {
    expect(parseRetryAfterMs('1.5')).toBe(1500);
  });

  it('returns null for missing header', () => {
    expect(parseRetryAfterMs(undefined)).toBeNull();
  });

  it('returns null for invalid values', () => {
    expect(parseRetryAfterMs('abc')).toBeNull();
  });
});

describe('computeBackoffWithJitter', () => {
  it('keeps backoff around baseline with midpoint random', () => {
    expect(computeBackoffWithJitter(1000, 0.5)).toBe(1000);
  });

  it('applies positive jitter at random=1', () => {
    expect(computeBackoffWithJitter(1000, 1)).toBe(1200);
  });

  it('never returns below minimum delay', () => {
    expect(computeBackoffWithJitter(10, 0)).toBe(100);
  });
});

describe('calculateRateLimitDelay', () => {
  it('prioritizes retry-after header when present', () => {
    const result = calculateRateLimitDelay({ 'retry-after': '2' }, 500, 0.1);
    expect(result.retryDelayMs).toBe(2000);
    expect(result.nextBackoffMs).toBe(1000);
  });

  it('falls back to jittered backoff without retry-after', () => {
    const result = calculateRateLimitDelay({}, 1000, 0.5);
    expect(result.retryDelayMs).toBe(1000);
    expect(result.nextBackoffMs).toBe(2000);
  });

  it('caps backoff growth at maximum', () => {
    const result = calculateRateLimitDelay({}, 30000, 0.5);
    expect(result.nextBackoffMs).toBe(30000);
  });
});

describe('shouldRetryStatus', () => {
  it('retries for 429', () => {
    expect(shouldRetryStatus(429)).toBe(true);
  });

  it('retries for 5xx', () => {
    expect(shouldRetryStatus(503)).toBe(true);
  });

  it('does not retry for client errors except 429', () => {
    expect(shouldRetryStatus(400)).toBe(false);
  });
});
