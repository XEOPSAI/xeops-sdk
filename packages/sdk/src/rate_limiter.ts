import { AxiosRequestConfig, RawAxiosResponseHeaders } from 'axios';

const MAX_RETRY_DELAY_MS = 30000;
const BASE_BACKOFF_MS = 250;
const JITTER_RATIO = 0.2;

export type HeaderBag =
  | RawAxiosResponseHeaders
  | { get?: (name: string) => unknown }
  | Record<string, string | number | boolean | null | undefined>;

/**
 * Parse retry-after header and convert it into milliseconds.
 */
export function parseRetryAfterMs(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const seconds = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(seconds)) {
    return clampDelay(seconds * 1000);
  }

  const targetDateMs = Date.parse(trimmed);
  if (Number.isNaN(targetDateMs)) {
    return undefined;
  }

  return clampDelay(Math.max(0, targetDateMs - Date.now()));
}

/**
 * Compute exponential backoff with bounded jitter.
 */
export function computeBackoffDelayMs(attempt: number, randomValue: number = Math.random()): number {
  const safeAttempt = Math.max(0, attempt);
  const exponentialDelay = BASE_BACKOFF_MS * (2 ** safeAttempt);
  const jitter = exponentialDelay * JITTER_RATIO * randomValue;
  return clampDelay(Math.round(exponentialDelay + jitter));
}

/**
 * Determine if an HTTP response should be retried.
 */
export function shouldRetryStatus(status: number | undefined): boolean {
  if (!status) {
    return true;
  }

  if (status === 429) {
    return true;
  }

  return status >= 500;
}

/**
 * Client-side rate limiter that honors server quota headers.
 */
export class ClientRateLimiter {
  private retryAttempt: number;
  private blockedUntilMs: number;

  constructor() {
    this.retryAttempt = 0;
    this.blockedUntilMs = 0;
  }

  async beforeRequest(): Promise<void> {
    const now = Date.now();
    if (this.blockedUntilMs <= now) {
      return;
    }

    await sleep(this.blockedUntilMs - now);
  }

  captureHeaders(headers: HeaderBag): void {
    const retryAfterMs = parseRetryAfterMs(readHeader(headers, 'retry-after'));
    const remaining = parseOptionalInteger(readHeader(headers, 'x-ratelimit-remaining'));

    if (retryAfterMs) {
      this.blockedUntilMs = Date.now() + retryAfterMs;
      return;
    }

    if (remaining === 0) {
      const resetAt = parseOptionalInteger(readHeader(headers, 'x-ratelimit-reset'));
      if (typeof resetAt === 'number') {
        this.blockedUntilMs = Math.max(this.blockedUntilMs, resetAt * 1000);
      }
    }
  }

  nextRetryDelay(headers: HeaderBag): number {
    const retryAfter = parseRetryAfterMs(readHeader(headers, 'retry-after'));
    const delay = retryAfter ?? computeBackoffDelayMs(this.retryAttempt);
    this.retryAttempt += 1;
    return delay;
  }

  resetRetryCounter(): void {
    this.retryAttempt = 0;
  }
}

export function getRetryCount(config: AxiosRequestConfig): number {
  const retries = (config as AxiosRequestConfig & { __retryCount?: number }).__retryCount;
  return retries ?? 0;
}

export function setRetryCount(config: AxiosRequestConfig, value: number): void {
  const mutableConfig = config as AxiosRequestConfig & { __retryCount?: number };
  mutableConfig.__retryCount = value;
}

function readHeader(headers: HeaderBag, name: string): string | undefined {
  if (typeof (headers as { get?: (headerName: string) => unknown }).get === 'function') {
    const fromAxios = (headers as { get: (headerName: string) => unknown }).get(name);
    return typeof fromAxios === 'string' ? fromAxios : undefined;
  }

  const lowerName = name.toLowerCase();
  const map = headers as Record<string, string | number | boolean | null | undefined>;
  const value = map[lowerName] ?? map[name];
  if (value === null || typeof value === 'undefined') {
    return undefined;
  }

  return String(value);
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function clampDelay(value: number): number {
  return Math.max(0, Math.min(value, MAX_RETRY_DELAY_MS));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
