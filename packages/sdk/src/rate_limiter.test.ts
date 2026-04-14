import { describe, expect, it } from 'vitest';
import {
  ClientRateLimiter,
  computeBackoffDelayMs,
  parseRetryAfterMs,
  shouldRetryStatus
} from './rate_limiter';

describe('parseRetryAfterMs', () => {
  it('parses numeric retry-after seconds', () => {
    expect(parseRetryAfterMs('2')).toBe(2000);
  });

  it('parses retry-after date values', () => {
    const future = new Date(Date.now() + 1500).toUTCString();
    const parsed = parseRetryAfterMs(future);

    expect(parsed).toBeTypeOf('number');
    expect(parsed).toBeGreaterThanOrEqual(0);
  });

  it('returns undefined for invalid values', () => {
    expect(parseRetryAfterMs('invalid-date')).toBeUndefined();
  });
});

describe('computeBackoffDelayMs', () => {
  it('grows exponentially by attempt', () => {
    const first = computeBackoffDelayMs(0, 0);
    const second = computeBackoffDelayMs(1, 0);
    expect(second).toBeGreaterThan(first);
  });

  it('adds jitter in deterministic mode when random value is provided', () => {
    const withoutJitter = computeBackoffDelayMs(2, 0);
    const withJitter = computeBackoffDelayMs(2, 1);
    expect(withJitter).toBeGreaterThan(withoutJitter);
  });

  it('caps values to max delay', () => {
    expect(computeBackoffDelayMs(30, 1)).toBeLessThanOrEqual(30000);
  });
});

describe('shouldRetryStatus', () => {
  it('retries on 429', () => {
    expect(shouldRetryStatus(429)).toBe(true);
  });

  it('retries on 5xx statuses', () => {
    expect(shouldRetryStatus(500)).toBe(true);
  });

  it('does not retry on non-429 4xx statuses', () => {
    expect(shouldRetryStatus(404)).toBe(false);
  });
});

describe('ClientRateLimiter', () => {
  it('captures retry-after and computes retry delays', () => {
    const limiter = new ClientRateLimiter();
    limiter.captureHeaders({ 'retry-after': '1' });

    const delay = limiter.nextRetryDelay({});
    expect(delay).toBeGreaterThan(0);
  });

  it('increments retry delay across attempts', () => {
    const limiter = new ClientRateLimiter();
    const first = limiter.nextRetryDelay({});
    const second = limiter.nextRetryDelay({});

    expect(second).toBeGreaterThanOrEqual(first);
  });

  it('resets retry counter after success', () => {
    const limiter = new ClientRateLimiter();
    limiter.nextRetryDelay({});
    limiter.resetRetryCounter();

    const afterReset = limiter.nextRetryDelay({});
    expect(afterReset).toBeGreaterThanOrEqual(250);
  });
});
