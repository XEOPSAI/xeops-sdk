import { ScanResult } from '@xeopsai/scanner-sdk';
import { buildCiSummary, getCiExitCode, renderCiOutput } from './ci';

function createResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    id: 'scan-1',
    targetUrl: 'https://example.com',
    status: 'completed',
    progress: 100,
    vulnerabilities: [],
    vulnerabilitiesFound: 2,
    metadata: {
      criticalCount: 1,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0
    },
    ...overrides
  };
}

describe('ci helpers', () => {
  it('builds summary for happy path scan result', () => {
    const summary = buildCiSummary('scan-1', createResult());

    expect(summary.scanId).toBe('scan-1');
    expect(summary.vulnerabilitiesFound).toBe(2);
    expect(summary.counts.critical).toBe(1);
  });

  it('handles edge case with missing metadata values', () => {
    const summary = buildCiSummary(
      'scan-2',
      createResult({
        metadata: undefined,
        vulnerabilitiesFound: 0
      })
    );

    expect(summary.vulnerabilitiesFound).toBe(0);
    expect(summary.counts.high).toBe(0);
    expect(summary.counts.medium).toBe(0);
  });

  it('renders JSON and SARIF output formats', () => {
    const summary = buildCiSummary('scan-1', createResult());

    const json = renderCiOutput(summary, 'json');
    const sarif = renderCiOutput(summary, 'sarif');

    expect(JSON.parse(json).scanId).toBe('scan-1');
    expect(JSON.parse(sarif).version).toBe('2.1.0');
  });

  it('returns exit code 1 when fail-on-high threshold is reached', () => {
    const summary = buildCiSummary('scan-1', createResult());

    expect(getCiExitCode(summary, { failOnHigh: true })).toBe(1);
  });

  it('returns exit code 0 when no threshold is matched', () => {
    const summary = buildCiSummary(
      'scan-3',
      createResult({
        vulnerabilitiesFound: 0,
        metadata: {
          criticalCount: 0,
          highCount: 0,
          mediumCount: 0,
          lowCount: 0,
          infoCount: 0
        }
      })
    );

    expect(getCiExitCode(summary, { failOnMedium: true })).toBe(0);
  });
});
