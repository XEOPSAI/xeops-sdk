import {
  parseCiOutputFormat,
  buildCiSummary,
  computeCiExitCode,
  CiScanSummary
} from './ci';

describe('parseCiOutputFormat', () => {
  it('accepts supported formats', () => {
    expect(parseCiOutputFormat('json')).toBe('json');
  });

  it('normalizes casing and whitespace', () => {
    expect(parseCiOutputFormat(' SARIF ')).toBe('sarif');
  });

  it('throws for unsupported format', () => {
    expect(() => parseCiOutputFormat('xml')).toThrow('Invalid format');
  });
});

describe('buildCiSummary', () => {
  it('maps scan metadata into ci counters', () => {
    const summary = buildCiSummary({
      id: 'scan-1',
      targetUrl: 'https://example.com',
      status: 'completed',
      progress: 100,
      vulnerabilities: [],
      vulnerabilitiesFound: 2,
      metadata: { criticalCount: 1, highCount: 1, mediumCount: 0 }
    });

    expect(summary.counts.critical).toBe(1);
    expect(summary.counts.high).toBe(1);
  });

  it('defaults missing metadata counters to zero', () => {
    const summary = buildCiSummary({
      id: 'scan-2',
      targetUrl: 'https://example.com',
      status: 'completed',
      progress: 100,
      vulnerabilities: [],
      vulnerabilitiesFound: 0
    });

    expect(summary.counts.medium).toBe(0);
  });

  it('keeps original status and scan id', () => {
    const summary = buildCiSummary({
      id: 'scan-3',
      targetUrl: 'https://example.com',
      status: 'running',
      progress: 10,
      vulnerabilities: [],
      vulnerabilitiesFound: 0
    });

    expect(summary.scanId).toBe('scan-3');
    expect(summary.status).toBe('running');
  });
});

describe('computeCiExitCode', () => {
  const baseline: CiScanSummary = {
    scanId: 'scan-9',
    status: 'completed',
    counts: { critical: 0, high: 0, medium: 0 }
  };

  it('returns 1 when failOnHigh and high present', () => {
    const summary = { ...baseline, counts: { critical: 0, high: 1, medium: 0 } };
    expect(computeCiExitCode(summary, { failOnHigh: true })).toBe(1);
  });

  it('returns 1 when failOnMedium and medium present', () => {
    const summary = { ...baseline, counts: { critical: 0, high: 0, medium: 1 } };
    expect(computeCiExitCode(summary, { failOnMedium: true })).toBe(1);
  });

  it('returns 0 when no threshold reached', () => {
    expect(computeCiExitCode(baseline, { failOnHigh: true })).toBe(0);
  });
});
