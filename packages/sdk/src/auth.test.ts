import { describe, expect, it } from 'vitest';
import { buildAuthHeader, normalizeApiKey } from './auth';

describe('auth helpers', () => {
  it('normalizes API key by trimming spaces', () => {
    expect(normalizeApiKey('  abc123  ')).toBe('abc123');
  });

  it('builds a Bearer authorization header', () => {
    expect(buildAuthHeader('token-1')).toBe('Bearer token-1');
  });

  it('throws on empty API key', () => {
    expect(() => buildAuthHeader('   ')).toThrow('API key is required');
  });
});
