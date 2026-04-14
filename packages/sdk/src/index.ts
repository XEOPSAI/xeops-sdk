/**
 * XeOps Security Scanner SDK
 * For CI/CD integration and programmatic access
 */

export { XeOpsScannerClient } from './client';
export * from './types';
export * from './auth';
export * from './sse';
export * from './rate_limiter';

// Export convenience factory function
import { XeOpsScannerClient } from './client';
import { ScannerSDKConfig } from './types';

/**
 * Create a new XeOps Scanner client instance
 */
export function createClient(config: ScannerSDKConfig): XeOpsScannerClient {
  return new XeOpsScannerClient(config);
}
