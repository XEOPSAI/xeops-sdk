import chalk from 'chalk';
import { ScanResult } from '@xeopsai/scanner-sdk';
import { computeExitCode } from './options';

export type CiOutputFormat = 'json' | 'sarif' | 'table';

export interface CiThresholdOptions {
  failOnHigh?: boolean;
  failOnMedium?: boolean;
}

export interface CiScanSummary {
  scanId: string;
  status: string;
  targetUrl: string;
  vulnerabilitiesFound: number;
  counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
}

/**
 * Build a deterministic summary payload from a scan result.
 */
export function buildCiSummary(scanId: string, result: ScanResult): CiScanSummary {
  const metadata = result.metadata ?? {};

  return {
    scanId,
    status: result.status,
    targetUrl: result.targetUrl,
    vulnerabilitiesFound: result.vulnerabilitiesFound,
    counts: {
      critical: metadata.criticalCount ?? 0,
      high: metadata.highCount ?? 0,
      medium: metadata.mediumCount ?? 0,
      low: metadata.lowCount ?? 0,
      info: metadata.infoCount ?? 0
    }
  };
}

/**
 * Render CI output in a machine-readable or human-readable format.
 */
export function renderCiOutput(summary: CiScanSummary, format: CiOutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  if (format === 'sarif') {
    return JSON.stringify(toSarif(summary), null, 2);
  }

  return toTable(summary);
}

/**
 * Compute process exit code for CI policies.
 */
export function getCiExitCode(summary: CiScanSummary, options: CiThresholdOptions): number {
  return computeExitCode(
    {
      criticalCount: summary.counts.critical,
      highCount: summary.counts.high,
      mediumCount: summary.counts.medium
    },
    options
  );
}

function toTable(summary: CiScanSummary): string {
  const lines = [
    chalk.blue('XeOps CI Scan Summary'),
    `Scan ID: ${summary.scanId}`,
    `Target: ${summary.targetUrl}`,
    `Status: ${summary.status}`,
    `Vulnerabilities: ${summary.vulnerabilitiesFound}`,
    'Severity counts:',
    `  Critical: ${summary.counts.critical}`,
    `  High: ${summary.counts.high}`,
    `  Medium: ${summary.counts.medium}`,
    `  Low: ${summary.counts.low}`,
    `  Info: ${summary.counts.info}`
  ];

  return lines.join('\n');
}

function toSarif(summary: CiScanSummary): Record<string, unknown> {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [
      {
        tool: {
          driver: {
            name: 'XeOps Scanner CLI',
            informationUri: 'https://github.com/XEOPSAI/xeops-sdk',
            rules: buildSarifRules()
          }
        },
        results: buildSarifResults(summary),
        properties: {
          scanId: summary.scanId,
          targetUrl: summary.targetUrl,
          status: summary.status
        }
      }
    ]
  };
}

function buildSarifRules(): Array<Record<string, unknown>> {
  return [
    createRule('XEOPS-CRITICAL', 'critical'),
    createRule('XEOPS-HIGH', 'high'),
    createRule('XEOPS-MEDIUM', 'medium'),
    createRule('XEOPS-LOW', 'low'),
    createRule('XEOPS-INFO', 'info')
  ];
}

function createRule(ruleId: string, level: string): Record<string, unknown> {
  return {
    id: ruleId,
    shortDescription: {
      text: `${level} severity findings detected by XeOps`
    },
    fullDescription: {
      text: `XeOps reported ${level} severity vulnerabilities during this scan.`
    }
  };
}

function buildSarifResults(summary: CiScanSummary): Array<Record<string, unknown>> {
  const severityCounts: Array<[string, number, string]> = [
    ['critical', summary.counts.critical, 'error'],
    ['high', summary.counts.high, 'error'],
    ['medium', summary.counts.medium, 'warning'],
    ['low', summary.counts.low, 'note'],
    ['info', summary.counts.info, 'note']
  ];

  return severityCounts
    .filter(([, count]) => count > 0)
    .map(([severity, count, level]) => ({
      ruleId: `XEOPS-${severity.toUpperCase()}`,
      level,
      message: {
        text: `Detected ${count} ${severity} finding(s)`
      },
      properties: {
        count,
        severity,
        scanId: summary.scanId
      }
    }));
}
