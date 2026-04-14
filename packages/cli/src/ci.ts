import { ScanResult, XeOpsScannerClient } from '@xeopsai/scanner-sdk';
import { CliSeveritySummary, computeExitCode, parseTimeoutSeconds } from './options';

export type CiOutputFormat = 'json' | 'sarif' | 'table';

export interface CiScanOptions {
  url: string;
  timeout: string;
  failOnHigh?: boolean;
  failOnMedium?: boolean;
  format: CiOutputFormat;
}

interface CiResultSummary {
  scanId: string;
  targetUrl: string;
  status: string;
  vulnerabilitiesFound: number;
  severity: CliSeveritySummary;
}

/**
 * Run a CI scan flow and return the process exit code.
 */
export async function runCiScan(
  client: XeOpsScannerClient,
  options: CiScanOptions,
  writeOutput: (message: string) => void
): Promise<number> {
  const timeoutMs = parseTimeoutSeconds(options.timeout) * 1000;
  const scanResponse = await client.startScan({
    targetUrl: options.url
  });

  const result = await client.waitForScanCompletion(scanResponse.scanId, {
    timeout: timeoutMs,
    pollingInterval: 5000
  });

  const output = formatCiOutput(scanResponse.scanId, result, options.format);
  writeOutput(output);

  return computeExitCode(result.metadata, {
    failOnHigh: options.failOnHigh,
    failOnMedium: options.failOnMedium
  });
}

function formatCiOutput(scanId: string, result: ScanResult, format: CiOutputFormat): string {
  const summary = buildSummary(scanId, result);

  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  if (format === 'sarif') {
    return JSON.stringify(buildSarif(summary, result), null, 2);
  }

  return [
    'XeOps CI Scan Summary',
    `Scan ID: ${summary.scanId}`,
    `Target: ${summary.targetUrl}`,
    `Status: ${summary.status}`,
    `Vulnerabilities: ${summary.vulnerabilitiesFound}`,
    `Critical: ${summary.severity.criticalCount ?? 0}`,
    `High: ${summary.severity.highCount ?? 0}`,
    `Medium: ${summary.severity.mediumCount ?? 0}`
  ].join('\n');
}

function buildSummary(scanId: string, result: ScanResult): CiResultSummary {
  return {
    scanId,
    targetUrl: result.targetUrl,
    status: result.status,
    vulnerabilitiesFound: result.vulnerabilitiesFound,
    severity: {
      criticalCount: result.metadata?.criticalCount ?? 0,
      highCount: result.metadata?.highCount ?? 0,
      mediumCount: result.metadata?.mediumCount ?? 0
    }
  };
}

function buildSarif(summary: CiResultSummary, result: ScanResult): Record<string, unknown> {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'XeOps Scanner CLI',
            informationUri: 'https://github.com/XEOPSAI/xeops-sdk',
            version: '1.0.1'
          }
        },
        properties: {
          scanId: summary.scanId,
          targetUrl: summary.targetUrl,
          status: summary.status
        },
        results: result.vulnerabilities.map((vulnerability) => ({
          ruleId: vulnerability.id,
          level: toSarifLevel(vulnerability.severity),
          message: {
            text: vulnerability.title
          },
          locations: vulnerability.url
            ? [
                {
                  physicalLocation: {
                    artifactLocation: {
                      uri: vulnerability.url
                    }
                  }
                }
              ]
            : []
        }))
      }
    ]
  };
}

function toSarifLevel(severity: string): 'error' | 'warning' | 'note' {
  if (severity === 'critical' || severity === 'high') {
    return 'error';
  }

  if (severity === 'medium') {
    return 'warning';
  }

  return 'note';
}
