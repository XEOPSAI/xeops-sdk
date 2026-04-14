import { describe, expect, it, vi } from 'vitest';
import { formatCiOutput, getCiExitCode, runCiScan } from './ci';
import type { ScanResult } from '@xeopsai/scanner-sdk';

function createScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    id: 'scan-1',
    targetUrl: 'https://example.com',
    status: 'completed',
    progress: 100,
    vulnerabilities: [
      {
        id: 'vuln-1',
        title: 'SQL Injection',
        description: 'Unsanitized query parameter',
        severity: 'high',
        category: 'injection',
        url: 'https://example.com/search'
      }
    ],
    vulnerabilitiesFound: 1,
    metadata: {
      criticalCount: 0,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
      infoCount: 0
    },
    ...overrides
  };
}

describe('runCiScan', () => {
  it('returns summary output with exit code when high is found', async () => {
    const result = createScanResult();
    const client = {
      startScan: vi.fn().mockResolvedValue({ scanId: 'scan-1', status: 'queued' }),
      waitForScanCompletion: vi.fn().mockResolvedValue(result)
    } as any;

    const summary = await runCiScan(client, {
      url: 'https://example.com',
      timeoutSeconds: 30,
      failOnHigh: true,
      failOnMedium: false,
      outputFormat: 'table'
    });

    expect(summary.exitCode).toBe(1);
    expect(summary.scanId).toBe('scan-1');
    expect(summary.output).toContain('high=1');
  });

  it('returns exit code 0 when there are no vulnerabilities', async () => {
    const result = createScanResult({
      vulnerabilities: [],
      vulnerabilitiesFound: 0,
      metadata: { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 }
    });
    const client = {
      startScan: vi.fn().mockResolvedValue({ scanId: 'scan-2', status: 'queued' }),
      waitForScanCompletion: vi.fn().mockResolvedValue(result)
    } as any;

    const summary = await runCiScan(client, {
      url: 'https://example.com',
      timeoutSeconds: 60,
      failOnHigh: true,
      failOnMedium: true,
      outputFormat: 'json'
    });

    expect(summary.exitCode).toBe(0);
    expect(JSON.parse(summary.output).vulnerabilitiesFound).toBe(0);
  });

  it('propagates client errors for unavailable targets', async () => {
    const client = {
      startScan: vi.fn().mockResolvedValue({ scanId: 'scan-3', status: 'queued' }),
      waitForScanCompletion: vi.fn().mockRejectedValue(new Error('target unavailable'))
    } as any;

    await expect(
      runCiScan(client, {
        url: 'https://down.example.com',
        timeoutSeconds: 10,
        failOnHigh: true,
        failOnMedium: false,
        outputFormat: 'table'
      })
    ).rejects.toThrow('target unavailable');
  });
});

describe('getCiExitCode', () => {
  it('returns 1 in fail-on-high mode when high findings exist', () => {
    expect(getCiExitCode(createScanResult(), true, false)).toBe(1);
  });

  it('returns 1 in fail-on-medium mode when medium findings exist', () => {
    const result = createScanResult({
      metadata: { criticalCount: 0, highCount: 0, mediumCount: 2, lowCount: 0, infoCount: 0 }
    });

    expect(getCiExitCode(result, false, true)).toBe(1);
  });

  it('returns 0 when metadata is missing', () => {
    const result = createScanResult({ metadata: undefined });
    expect(getCiExitCode(result, true, false)).toBe(0);
  });
});

describe('formatCiOutput', () => {
  it('returns table output for human-readable summaries', () => {
    const output = formatCiOutput(createScanResult(), 'table');
    expect(output).toContain('status=completed');
    expect(output).toContain('vulnerabilities=1');
  });

  it('returns valid JSON output for machine consumption', () => {
    const output = formatCiOutput(createScanResult(), 'json');
    expect(JSON.parse(output).id).toBe('scan-1');
  });

  it('returns SARIF output with findings for integrations', () => {
    const output = formatCiOutput(createScanResult(), 'sarif');
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0].results.length).toBe(1);
  });
});
