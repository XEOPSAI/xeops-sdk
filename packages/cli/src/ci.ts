import { ScanResult } from '@xeopsai/scanner-sdk';

export type CiOutputFormat = 'json' | 'sarif' | 'table';

export interface CiFailPolicy {
  failOnHigh?: boolean;
  failOnMedium?: boolean;
}

export interface CiScanSummary {
  scanId: string;
  status: ScanResult['status'];
  counts: {
    critical: number;
    high: number;
    medium: number;
  };
}

/**
 * Parse and validate CLI output format for CI mode.
 */
export function parseCiOutputFormat(value: string): CiOutputFormat {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'json' || normalized === 'sarif' || normalized === 'table') {
    return normalized;
  }

  throw new Error('Invalid format. Allowed values: json, sarif, table');
}

/**
 * Build a compact CI summary from scan output.
 */
export function buildCiSummary(result: ScanResult): CiScanSummary {
  return {
    scanId: result.id,
    status: result.status,
    counts: {
      critical: result.metadata?.criticalCount ?? 0,
      high: result.metadata?.highCount ?? 0,
      medium: result.metadata?.mediumCount ?? 0
    }
  };
}

/**
 * Compute CI process exit code from scan summary and fail policy.
 */
export function computeCiExitCode(summary: CiScanSummary, policy: CiFailPolicy): number {
  const hasHighOrCritical = summary.counts.critical > 0 || summary.counts.high > 0;
  const hasMediumOrHigher = hasHighOrCritical || summary.counts.medium > 0;

  if (policy.failOnHigh && hasHighOrCritical) {
    return 1;
  }

  if (policy.failOnMedium && hasMediumOrHigher) {
    return 1;
  }

  return 0;
}
