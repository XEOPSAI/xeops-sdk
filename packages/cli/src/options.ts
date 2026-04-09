export interface ScanCommandOptions {
  timeout?: string;
}

export function parseTimeoutSeconds(input: string | undefined, fallback: number = 1800): number {
  if (!input) {
    return fallback;
  }

  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error('Timeout must be a positive integer in seconds');
  }

  return parsed;
}

export function validateScanCommandOptions(options: ScanCommandOptions): void {
  parseTimeoutSeconds(options.timeout);
}
