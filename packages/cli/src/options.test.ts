import { describe, expect, it } from 'vitest';
import { validateScanCommandOptions } from './options';

describe('validateScanCommandOptions', () => {
  it('accepts valid timeout values', () => {
    expect(() => validateScanCommandOptions({ timeout: '60' })).not.toThrow();
  });

  it('rejects non-positive timeout values', () => {
    expect(() => validateScanCommandOptions({ timeout: '0' })).toThrowError(
      'timeout must be a positive integer (seconds)'
    );
  });

  it('rejects conflicting fail flags', () => {
    expect(() =>
      validateScanCommandOptions({ timeout: '60', failOnHigh: true, failOnMedium: true })
    ).toThrowError('Use either --fail-on-high or --fail-on-medium, not both');
  });
});
