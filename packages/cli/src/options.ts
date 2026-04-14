export interface CliExitOptions {
  failOnHigh?: boolean;
  failOnMedium?: boolean;
}

export interface CliSeveritySummary {
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
}

export function parseTimeoutSeconds(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('Timeout must be a positive integer (seconds)');
  }

  return parsed;
}

export function computeExitCode(
  summary: CliSeveritySummary | undefined,
  options: CliExitOptions
): number {
  if (!summary) {
    return 0;
  }

  const critical = summary.criticalCount ?? 0;
  const high = summary.highCount ?? 0;
  const medium = summary.mediumCount ?? 0;

  if (options.failOnHigh && (critical > 0 || high > 0)) {
    return 1;
  }

  if (options.failOnMedium && (critical > 0 || high > 0 || medium > 0)) {
    return 1;
  }

  return 0;
}
