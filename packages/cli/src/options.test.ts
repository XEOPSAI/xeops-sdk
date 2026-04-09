import { describe, expect, it } from 'vitest';
import { parseTimeoutSeconds, validateScanCommandOptions } from './options';

describe('CLI options validation', () => {
  it('uses fallback timeout when undefined', () => {
    expect(parseTimeoutSeconds(undefined)).toBe(1800);
  });

  it('parses valid timeout', () => {
    expect(parseTimeoutSeconds('120')).toBe(120);
  });

  it('throws for invalid timeout values', () => {
    expect(() => parseTimeoutSeconds('0')).toThrow('Timeout must be a positive integer in seconds');
    expect(() => parseTimeoutSeconds('-1')).toThrow(
      'Timeout must be a positive integer in seconds'
    );
    expect(() => parseTimeoutSeconds('12.5')).toThrow(
      'Timeout must be a positive integer in seconds'
    );
    expect(() => parseTimeoutSeconds('abc')).toThrow(
      'Timeout must be a positive integer in seconds'
    );
  });

  it('validates scan options object', () => {
    expect(() => validateScanCommandOptions({ timeout: '30' })).not.toThrow();
  });
});
