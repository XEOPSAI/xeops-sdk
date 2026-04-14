import { describe, expect, it } from 'vitest';
import { buildApiKeyHeaders, resolveAuthConfig } from './auth';

describe('auth helpers', () => {
  it('buildApiKeyHeaders trims and maps header', () => {
    expect(buildApiKeyHeaders('  key_123  ')).toEqual({ 'X-API-Key': 'key_123' });
  });

  it('resolveAuthConfig supports apiKey fallback', () => {
    const auth = resolveAuthConfig({ apiKey: 'abc' });
    expect(auth).toEqual({ type: 'apiKey', apiKey: 'abc' });
  });

  it('resolveAuthConfig throws when auth is missing', () => {
    expect(() => resolveAuthConfig({})).toThrowError(
      'Authentication is required. Provide apiKey or auth configuration.'
    );
  });
});
