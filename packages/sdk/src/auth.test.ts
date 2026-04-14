import { describe, expect, it } from 'vitest';
import { buildApiKeyHeaders, normalizeApiKey } from './auth';

describe('auth helpers', () => {
  it('normalizes API key by trimming spaces', () => {
    expect(normalizeApiKey('  abc123  ')).toBe('abc123');
  });

  it('builds X-API-Key header', () => {
    expect(buildApiKeyHeaders('token-1')).toEqual({ 'X-API-Key': 'token-1' });
  });

  it('throws on empty API key', () => {
    expect(() => buildApiKeyHeaders('   ')).toThrow('API key is required');
  });
});
