export interface ScanCommandOptions {
  timeout?: string;
}

export function parseTimeoutSeconds(timeout?: string): number {
  if (!timeout) {
    return 1800;
  }

  const parsed = Number(timeout);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Timeout must be a positive integer in seconds');
  }

  return parsed;
}

export function validateScanCommandOptions(options: ScanCommandOptions): void {
  parseTimeoutSeconds(options.timeout);
}
