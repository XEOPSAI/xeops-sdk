import {
  buildApiKeyHeaders,
  normalizeApiKey,
  resolveAuthConfig
} from './auth';

describe('auth helpers', () => {
  it('normalizes api keys by trimming', () => {
    expect(normalizeApiKey('  test-key  ')).toBe('test-key');
  });

  it('builds API key headers', () => {
    expect(buildApiKeyHeaders('my-key')).toEqual({
      'X-API-Key': 'my-key'
    });
  });

  it('throws when API key is empty', () => {
    expect(() => buildApiKeyHeaders('   ')).toThrow('API key is required');
  });

  it('resolves explicit auth config before apiKey fallback', () => {
    const resolved = resolveAuthConfig({
      apiKey: 'fallback-key',
      auth: {
        type: 'apiKey',
        apiKey: 'explicit-key'
      }
    });

    expect(resolved).toEqual({
      type: 'apiKey',
      apiKey: 'explicit-key'
    });
  });
});
