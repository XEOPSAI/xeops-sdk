import { XeOpsScannerClient, ScanResult } from '@xeopsai/sdk';
import { parseTimeoutSeconds } from './options';

export type CiOutputFormat = 'json' | 'sarif' | 'table';

export interface CiScanOptions {
  url: string;
  timeoutSeconds: string;
  failOnHigh?: boolean;
  failOnMedium?: boolean;
  format?: CiOutputFormat;
}

/**
 * Resolve a CI output format from user input.
 */
export function parseCiOutputFormat(value?: string): CiOutputFormat {
  if (!value || value === 'table') {
    return 'table';
  }

  if (value === 'json' || value === 'sarif') {
    return value;
  }

  throw new Error(`Unsupported format: ${value}`);
}

/**
 * Compute CI exit code based on severity thresholds.
 */
export function computeCiExitCode(result: ScanResult, options: CiScanOptions): number {
  const summary = result.metadata;
  const critical = summary?.criticalCount ?? 0;
  const high = summary?.highCount ?? 0;
  const medium = summary?.mediumCount ?? 0;

  if (options.failOnMedium && (critical > 0 || high > 0 || medium > 0)) {
    return 1;
  }

  if (options.failOnHigh && (critical > 0 || high > 0)) {
    return 1;
  }

  return 0;
}

/**
 * Run a scan in CI mode and return the final scan result.
 */
export async function runCiScan(
  client: XeOpsScannerClient,
  options: CiScanOptions
): Promise<ScanResult> {
  const scanResponse = await client.startScan({
    targetUrl: options.url
  });

  return client.waitForScanCompletion(scanResponse.scanId, {
    timeout: parseTimeoutSeconds(options.timeoutSeconds) * 1000,
    pollingInterval: 5000
  });
}
