import { ClientRateLimiter } from './rate_limiter';

describe('client rate limiter', () => {
  it('waits when headers indicate rate limit reached', async () => {
    const limiter = new ClientRateLimiter();
    const sleeps: number[] = [];

    limiter.updateFromHeaders({ 'x-ratelimit-remaining': '0', 'retry-after': '2' });
    await limiter.waitIfNeeded(async (ms) => {
      sleeps.push(ms);
    });

    expect(sleeps.length).toBe(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(1000);
  });

  it('computes exponential backoff with jitter when retry-after is absent', () => {
    const limiter = new ClientRateLimiter({ baseDelayMs: 200, maxDelayMs: 2000, random: () => 0.5 });

    const delay = limiter.computeDelayMs(2);

    expect(delay).toBe(900);
  });

  it('retries only retryable statuses and within max attempts', () => {
    const limiter = new ClientRateLimiter({ maxRetries: 2 });

    expect(limiter.shouldRetry(429, 0)).toBe(true);
    expect(limiter.shouldRetry(400, 0)).toBe(false);
    expect(limiter.shouldRetry(503, 2)).toBe(false);
  });
});
