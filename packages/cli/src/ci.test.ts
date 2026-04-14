import { computeCiExitCode, parseCiOutputFormat } from './ci';

describe('ci output format parser', () => {
  it('defaults to table format', () => {
    expect(parseCiOutputFormat()).toBe('table');
  });

  it('accepts json format', () => {
    expect(parseCiOutputFormat('json')).toBe('json');
  });

  it('throws on unsupported formats', () => {
    expect(() => parseCiOutputFormat('xml')).toThrow('Unsupported format');
  });
});

describe('ci exit code calculator', () => {
  it('fails when failOnHigh is enabled and high vulnerabilities exist', () => {
    expect(
      computeCiExitCode(
        {
          id: 'scan-1',
          targetUrl: 'https://example.com',
          status: 'completed',
          progress: 100,
          vulnerabilities: [],
          vulnerabilitiesFound: 2,
          metadata: { highCount: 1 }
        },
        {
          url: 'https://example.com',
          timeoutSeconds: '300',
          failOnHigh: true
        }
      )
    ).toBe(1);
  });

  it('fails on medium when failOnMedium is enabled', () => {
    expect(
      computeCiExitCode(
        {
          id: 'scan-2',
          targetUrl: 'https://example.com',
          status: 'completed',
          progress: 100,
          vulnerabilities: [],
          vulnerabilitiesFound: 1,
          metadata: { mediumCount: 1 }
        },
        {
          url: 'https://example.com',
          timeoutSeconds: '300',
          failOnMedium: true
        }
      )
    ).toBe(1);
  });

  it('returns success when thresholds are not exceeded', () => {
    expect(
      computeCiExitCode(
        {
          id: 'scan-3',
          targetUrl: 'https://example.com',
          status: 'completed',
          progress: 100,
          vulnerabilities: [],
          vulnerabilitiesFound: 0,
          metadata: { criticalCount: 0, highCount: 0, mediumCount: 0 }
        },
        {
          url: 'https://example.com',
          timeoutSeconds: '300',
          failOnHigh: true
        }
      )
    ).toBe(0);
  });
});
