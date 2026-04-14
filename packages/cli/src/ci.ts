import { ScanResult } from '@xeopsai/sdk';
import { CliExitOptions, computeExitCode } from './options';

export const CI_OUTPUT_FORMATS = ['json', 'sarif', 'table'] as const;

export type CiOutputFormat = (typeof CI_OUTPUT_FORMATS)[number];

export interface CiRunOptions extends CliExitOptions {
  format?: CiOutputFormat;
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
}

/** Validate CI output format. */
export function parseCiOutputFormat(value: string): CiOutputFormat {
  if (CI_OUTPUT_FORMATS.includes(value as CiOutputFormat)) {
    return value as CiOutputFormat;
  }

  throw new Error(`Invalid format: ${value}. Allowed values: ${CI_OUTPUT_FORMATS.join(', ')}`);
}

/** Compute CI exit code from scan result and fail-on threshold options. */
export function computeCiExitCode(result: ScanResult, options: CiRunOptions): number {
  return computeExitCode(result.metadata, options);
}

/** Render CI output in table/json/sarif format. */
export function renderCiOutput(result: ScanResult, format: CiOutputFormat): string {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }

  if (format === 'sarif') {
    return JSON.stringify(buildSarifReport(result), null, 2);
  }

  return buildTableOutput(result);
}

function buildTableOutput(result: ScanResult): string {
  const critical = result.metadata?.criticalCount ?? 0;
  const high = result.metadata?.highCount ?? 0;
  const medium = result.metadata?.mediumCount ?? 0;
  const low = result.metadata?.lowCount ?? 0;
  const info = result.metadata?.infoCount ?? 0;

  return [
    'XeOps CI Scan Summary',
    `Status: ${result.status}`,
    `Progress: ${result.progress ?? 0}%`,
    `Vulnerabilities: ${result.vulnerabilitiesFound ?? 0}`,
    `Critical: ${critical} | High: ${high} | Medium: ${medium} | Low: ${low} | Info: ${info}`
  ].join('\n');
}

function buildSarifReport(result: ScanResult): object {
  const findings = buildSarifResults(result);

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{ tool: { driver: { name: 'XeOps CLI' } }, results: findings }]
  };
}

function buildSarifResults(result: ScanResult): SarifResult[] {
  const counts = [
    { key: 'CRITICAL', value: result.metadata?.criticalCount ?? 0, level: 'error' as const },
    { key: 'HIGH', value: result.metadata?.highCount ?? 0, level: 'error' as const },
    { key: 'MEDIUM', value: result.metadata?.mediumCount ?? 0, level: 'warning' as const },
    { key: 'LOW', value: result.metadata?.lowCount ?? 0, level: 'note' as const },
    { key: 'INFO', value: result.metadata?.infoCount ?? 0, level: 'note' as const }
  ];

  return counts
    .filter((item) => item.value > 0)
    .map((item) => ({
      ruleId: `XEOPS_${item.key}`,
      level: item.level,
      message: { text: `${item.value} ${item.key.toLowerCase()} vulnerabilities detected` }
    }));
}
