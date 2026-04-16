import { describe, expect, it } from 'vitest';
import { DEFAULT_API_ENDPOINT, resolveApiEndpoint } from './client';

describe('resolveApiEndpoint', () => {
  it('returns provided endpoint when valid', () => {
    const endpoint = resolveApiEndpoint('https://api.custom.example');

    expect(endpoint).toBe('https://api.custom.example');
  });

  it('falls back to default endpoint when endpoint is missing', () => {
    const endpoint = resolveApiEndpoint(undefined);

    expect(endpoint).toBe(DEFAULT_API_ENDPOINT);
  });

  it('throws when endpoint is blank after trimming', () => {
    expect(() => resolveApiEndpoint('   ')).toThrow('API endpoint cannot be empty');
  });
});
