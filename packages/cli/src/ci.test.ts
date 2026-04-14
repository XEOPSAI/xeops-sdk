import { describe, expect, it, vi } from 'vitest';
import { ScanResult, XeOpsScannerClient } from '@xeopsai/scanner-sdk';
import { runCiScan } from './ci';

const BASE_RESULT: ScanResult = {
  id: 'scan-1',
  targetUrl: 'https://example.com',
  status: 'completed',
  progress: 100,
  vulnerabilities: [],
  vulnerabilitiesFound: 0,
  metadata: {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0
  }
};

describe('runCiScan', () => {
  it('returns success exit code and json output on clean scan', async () => {
    const writeOutput = vi.fn();
    const client = createClient(BASE_RESULT);

    const exitCode = await runCiScan(
      client,
      {
        url: 'https://example.com',
        timeout: '30',
        format: 'json'
      },
      writeOutput
    );

    expect(exitCode).toBe(0);
    expect(writeOutput).toHaveBeenCalledOnce();
    expect(writeOutput.mock.calls[0][0]).toContain('"scanId": "scan-1"');
  });

  it('returns failure exit code when failOnHigh is enabled and high findings exist', async () => {
    const writeOutput = vi.fn();
    const client = createClient({
      ...BASE_RESULT,
      vulnerabilitiesFound: 1,
      metadata: {
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0
      }
    });

    const exitCode = await runCiScan(
      client,
      {
        url: 'https://example.com',
        timeout: '30',
        failOnHigh: true,
        format: 'table'
      },
      writeOutput
    );

    expect(exitCode).toBe(1);
    expect(writeOutput.mock.calls[0][0]).toContain('High: 1');
  });

  it('throws on invalid timeout values', async () => {
    const writeOutput = vi.fn();
    const client = createClient(BASE_RESULT);

    await expect(
      runCiScan(
        client,
        {
          url: 'https://example.com',
          timeout: '0',
          format: 'sarif'
        },
        writeOutput
      )
    ).rejects.toThrow('Timeout must be a positive integer');
  });
});

function createClient(scanResult: ScanResult): XeOpsScannerClient {
  return {
    startScan: vi.fn().mockResolvedValue({ scanId: 'scan-1', status: 'queued' }),
    waitForScanCompletion: vi.fn().mockResolvedValue(scanResult)
  } as unknown as XeOpsScannerClient;
}
