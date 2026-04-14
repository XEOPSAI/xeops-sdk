import { computeExitCode, parseTimeoutSeconds } from './options';

describe('cli options helpers', () => {
  it('parses valid timeout seconds', () => {
    expect(parseTimeoutSeconds('1800')).toBe(1800);
  });

  it('throws on invalid timeout values', () => {
    expect(() => parseTimeoutSeconds('0')).toThrow();
    expect(() => parseTimeoutSeconds('abc')).toThrow();
  });

  it('returns exit code 1 when failOnHigh threshold is met', () => {
    expect(
      computeExitCode(
        {
          criticalCount: 0,
          highCount: 1,
          mediumCount: 0
        },
        { failOnHigh: true }
      )
    ).toBe(1);
  });

  it('returns 0 when thresholds are not met', () => {
    expect(
      computeExitCode(
        {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0
        },
        { failOnMedium: true }
      )
    ).toBe(0);
  });
});
