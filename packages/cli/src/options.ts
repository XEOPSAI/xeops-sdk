export interface ScanCommandOptions {
  timeout: string;
  failOnHigh?: boolean;
  failOnMedium?: boolean;
}

export function validateScanCommandOptions(options: ScanCommandOptions): void {
  const timeout = Number.parseInt(options.timeout, 10);

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error('timeout must be a positive integer (seconds)');
  }

  if (options.failOnHigh && options.failOnMedium) {
    throw new Error('Use either --fail-on-high or --fail-on-medium, not both');
  }
}
