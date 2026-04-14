import { describe, expect, it } from 'vitest';
import { ScanResult } from '@xeopsai/sdk';
import { computeCiExitCode, parseCiOutputFormat, renderCiOutput } from './ci';

function createResult(overrides?: Partial<ScanResult>): ScanResult {
  return {
    scanId: 'scan-1',
    status: 'completed',
    progress: 100,
    vulnerabilitiesFound: 0,
    metadata: {
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0
    },
    ...overrides
  };
}

describe('parseCiOutputFormat', () => {
  it('returns format when value is allowed', () => {
    expect(parseCiOutputFormat('json')).toBe('json');
  });

  it('accepts table format', () => {
    expect(parseCiOutputFormat('table')).toBe('table');
  });

  it('throws on unsupported format', () => {
    expect(() => parseCiOutputFormat('xml')).toThrow('Invalid format: xml');
  });
});

describe('computeCiExitCode', () => {
  it('returns 1 when high threshold is enabled and high vulnerabilities exist', () => {
    const result = createResult({
      metadata: { criticalCount: 0, highCount: 1, mediumCount: 0 }
    });

    expect(computeCiExitCode(result, { failOnHigh: true })).toBe(1);
  });

  it('returns 1 when medium threshold is enabled and medium vulnerabilities exist', () => {
    const result = createResult({
      metadata: { criticalCount: 0, highCount: 0, mediumCount: 1 }
    });

    expect(computeCiExitCode(result, { failOnMedium: true })).toBe(1);
  });

  it('returns 0 when metadata is missing', () => {
    const result = createResult({ metadata: undefined });

    expect(computeCiExitCode(result, { failOnHigh: true })).toBe(0);
  });
});

describe('renderCiOutput', () => {
  it('renders table output with severity counts', () => {
    const output = renderCiOutput(createResult(), 'table');

    expect(output).toContain('XeOps CI Scan Summary');
    expect(output).toContain('Critical: 0 | High: 0 | Medium: 0 | Low: 0 | Info: 0');
  });

  it('renders valid json output', () => {
    const output = renderCiOutput(createResult(), 'json');
    const parsed = JSON.parse(output) as { status: string };

    expect(parsed.status).toBe('completed');
  });

  it('renders sarif output with findings when vulnerabilities exist', () => {
    const output = renderCiOutput(
      createResult({
        metadata: { criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 }
      }),
      'sarif'
    );

    const parsed = JSON.parse(output) as { runs: Array<{ results: Array<{ ruleId: string }> }> };
    expect(parsed.runs[0].results[0].ruleId).toBe('XEOPS_CRITICAL');
  });
});
