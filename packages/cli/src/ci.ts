import { ScanResult, XeOpsScannerClient } from '@xeopsai/scanner-sdk';

export type CiOutputFormat = 'table' | 'json' | 'sarif';

export interface CiScanConfig {
  url: string;
  timeoutSeconds: number;
  failOnHigh: boolean;
  failOnMedium: boolean;
  outputFormat: CiOutputFormat;
}

export interface CiScanSummary {
  scanId: string;
  status: ScanResult['status'];
  vulnerabilitiesFound: number;
  exitCode: number;
  output: string;
}

/**
 * Run a scan in CI mode and return formatted output with exit code semantics.
 */
export async function runCiScan(
  client: XeOpsScannerClient,
  config: CiScanConfig
): Promise<CiScanSummary> {
  const started = await client.startScan({ targetUrl: config.url });
  const result = await client.waitForScanCompletion(started.scanId, {
    timeout: config.timeoutSeconds * 1000,
    pollingInterval: 5000
  });
  const exitCode = getCiExitCode(result, config.failOnHigh, config.failOnMedium);
  const output = formatCiOutput(result, config.outputFormat);

  return {
    scanId: started.scanId,
    status: result.status,
    vulnerabilitiesFound: result.vulnerabilitiesFound,
    exitCode,
    output
  };
}

/**
 * Compute CI exit code based on severity threshold options.
 */
export function getCiExitCode(
  result: ScanResult,
  failOnHigh: boolean,
  failOnMedium: boolean
): number {
  const criticalCount = result.metadata?.criticalCount ?? 0;
  const highCount = result.metadata?.highCount ?? 0;
  const mediumCount = result.metadata?.mediumCount ?? 0;

  if (failOnMedium && criticalCount + highCount + mediumCount > 0) {
    return 1;
  }

  if (failOnHigh && criticalCount + highCount > 0) {
    return 1;
  }

  return 0;
}

/**
 * Format CI output as table, json, or SARIF.
 */
export function formatCiOutput(result: ScanResult, format: CiOutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (format === 'sarif') {
    return JSON.stringify(toSarif(result), null, 2);
  }

  return [
    `status=${result.status}`,
    `vulnerabilities=${result.vulnerabilitiesFound}`,
    `critical=${result.metadata?.criticalCount ?? 0}`,
    `high=${result.metadata?.highCount ?? 0}`,
    `medium=${result.metadata?.mediumCount ?? 0}`,
    `low=${result.metadata?.lowCount ?? 0}`,
    `info=${result.metadata?.infoCount ?? 0}`
  ].join('\n');
}

function toSarif(result: ScanResult): Record<string, unknown> {
  const rules = result.vulnerabilities.map((vulnerability) => ({
    id: vulnerability.id,
    name: vulnerability.title,
    shortDescription: { text: vulnerability.description },
    properties: { severity: vulnerability.severity }
  }));

  const findings = result.vulnerabilities.map((vulnerability) => ({
    ruleId: vulnerability.id,
    level: mapSeverity(vulnerability.severity),
    message: { text: vulnerability.title },
    locations: [
      {
        physicalLocation: {
          artifactLocation: {
            uri: vulnerability.url ?? result.targetUrl
          }
        }
      }
    ]
  }));

  return {
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: 'xeops-scan', rules } },
        results: findings
      }
    ]
  };
}

function mapSeverity(severity: string): 'error' | 'warning' | 'note' {
  if (severity === 'critical' || severity === 'high') {
    return 'error';
  }

  if (severity === 'medium') {
    return 'warning';
  }

  return 'note';
}
