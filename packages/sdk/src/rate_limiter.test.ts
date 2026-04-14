import type { AxiosError, AxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClientRateLimiter } from './rate_limiter';

describe('ClientRateLimiter.updateFromHeaders', () => {
  it('stores retry-after delay in milliseconds', () => {
    const limiter = new ClientRateLimiter();
    limiter.updateFromHeaders({ 'retry-after': '2' });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(limiter.getDelayMs(0)).toBe(2000);
  });

  it('accepts date-based retry-after header', () => {
    const limiter = new ClientRateLimiter();
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    limiter.updateFromHeaders({ 'retry-after': new Date(now + 3000).toUTCString() });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(limiter.getDelayMs(0)).toBeGreaterThanOrEqual(2000);
  });

  it('ignores invalid retry-after values', () => {
    const limiter = new ClientRateLimiter();
    limiter.updateFromHeaders({ 'retry-after': 'invalid' });

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(limiter.getDelayMs(0)).toBe(250);
  });
});

describe('ClientRateLimiter.shouldRetry', () => {
  it('retries 429 responses while below max retries', () => {
    const limiter = new ClientRateLimiter();
    const error = makeAxiosError(429, {});

    expect(limiter.shouldRetry(error, 3)).toBe(true);
  });

  it('does not retry non-429 4xx responses', () => {
    const limiter = new ClientRateLimiter();
    const error = makeAxiosError(400, {});

    expect(limiter.shouldRetry(error, 3)).toBe(false);
  });

  it('stops retrying when max retries reached', () => {
    const limiter = new ClientRateLimiter();
    const config = { __xeopsRetryState: { attempt: 3 } } as AxiosRequestConfig;
    const error = makeAxiosError(503, config);

    expect(limiter.shouldRetry(error, 3)).toBe(false);
  });
});

describe('ClientRateLimiter.nextRetryConfig', () => {
  it('increments retry attempt', () => {
    const limiter = new ClientRateLimiter();
    const next = limiter.nextRetryConfig({ __xeopsRetryState: { attempt: 1 } } as AxiosRequestConfig) as AxiosRequestConfig & {
      __xeopsRetryState?: { attempt: number };
    };

    expect(next.__xeopsRetryState?.attempt).toBe(2);
  });

  it('initializes retry state when missing', () => {
    const limiter = new ClientRateLimiter();
    const next = limiter.nextRetryConfig({}) as AxiosRequestConfig & {
      __xeopsRetryState?: { attempt: number };
    };

    expect(next.__xeopsRetryState?.attempt).toBe(1);
  });

  it('preserves original config properties', () => {
    const limiter = new ClientRateLimiter();
    const next = limiter.nextRetryConfig({ timeout: 900 } as AxiosRequestConfig);

    expect(next.timeout).toBe(900);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeAxiosError(status: number, config: AxiosRequestConfig): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'boom',
    toJSON: () => ({}),
    config,
    response: {
      status,
      statusText: 'ERR',
      headers: {},
      config,
      data: {}
    }
  } as AxiosError;
}
