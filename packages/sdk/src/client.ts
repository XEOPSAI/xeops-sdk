import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ScanRequest,
  ScanResponse,
  ScanResult,
  UsageStats,
  ScannerSDKConfig,
  WaitForScanOptions,
  ScannerError
} from './types';

/**
 * XeOps Security Scanner SDK Client
 * For CI/CD integration and programmatic access
 */
export class XeOpsScannerClient {
  private client: AxiosInstance;
  private config: Required<ScannerSDKConfig>;

  constructor(config: ScannerSDKConfig) {
    this.config = {
      timeout: config.timeout || 60000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      debug: config.debug || false,
      ...config
    };

    this.client = axios.create({
      baseURL: this.config.apiEndpoint,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-Client': 'scanner-sdk',
        'X-Client-Version': '1.0.0'
      }
    });

    // Request interceptor for debugging
    if (this.config.debug) {
      this.client.interceptors.request.use(
        (config) => {
          console.log(`[XeOps SDK] ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        }
      );
    }

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log(`[XeOps SDK] Response: ${response.status}`);
        }
        return response;
      },
      (error) => this.handleError(error)
    );
  }

  /**
   * Start a new security scan
   */
  async startScan(request: ScanRequest): Promise<ScanResponse> {
    try {
      const response = await this.client.post<ScanResponse>('/api/scans', request);
      return response.data;
    } catch (error) {
      throw this.formatError('Failed to start scan', error);
    }
  }

  /**
   * Get scan result by ID
   */
  async getScanResult(scanId: string): Promise<ScanResult> {
    try {
      const response = await this.client.get<ScanResult>(`/api/scans/${scanId}`);
      return response.data;
    } catch (error) {
      throw this.formatError('Failed to get scan result', error);
    }
  }

  /**
   * Wait for scan to complete with polling
   * Returns the final scan result or throws if timeout/error
   */
  async waitForScanCompletion(
    scanId: string,
    options: WaitForScanOptions = {}
  ): Promise<ScanResult> {
    const {
      pollingInterval = 5000,
      timeout = 1800000, // 30 minutes default
      onProgress
    } = options;

    const startTime = Date.now();

    while (true) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new ScannerError('Scan timeout exceeded', undefined, {
          scanId,
          timeout
        });
      }

      // Get current scan status
      const result = await this.getScanResult(scanId);

      // Call progress callback if provided
      if (onProgress) {
        onProgress(result);
      }

      // Check if scan is complete
      if (result.status === 'completed') {
        return result;
      }

      if (result.status === 'failed') {
        throw new ScannerError('Scan failed', undefined, {
          scanId,
          error: result.error
        });
      }

      // Wait before next poll
      await this.sleep(pollingInterval);
    }
  }

  /**
   * Download PDF report for a scan
   */
  async downloadPdfReport(
    scanId: string,
    validatePoc: boolean = true
  ): Promise<Buffer> {
    try {
      const response = await this.client.get(
        `/api/scans/${scanId}/report/pdf`,
        {
          params: { validate_poc: validatePoc },
          responseType: 'arraybuffer'
        }
      );
      return Buffer.from(response.data);
    } catch (error) {
      throw this.formatError('Failed to download PDF report', error);
    }
  }

  /**
   * Get user usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    try {
      const response = await this.client.get<UsageStats>('/api/users/usage');
      return response.data;
    } catch (error) {
      throw this.formatError('Failed to get usage stats', error);
    }
  }

  /**
   * Verify API key is valid
   */
  async verifyApiKey(): Promise<boolean> {
    try {
      await this.client.get('/api/auth/verify');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      const response = await this.client.get<{ status: string; version: string }>('/health');
      return response.data;
    } catch (error) {
      throw this.formatError('Health check failed', error);
    }
  }

  /**
   * Cancel a running scan
   */
  async cancelScan(scanId: string): Promise<void> {
    try {
      await this.client.post(`/api/scans/${scanId}/cancel`);
    } catch (error) {
      throw this.formatError('Failed to cancel scan', error);
    }
  }

  /**
   * List scans for the authenticated user
   */
  async listScans(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScanResult[]> {
    try {
      const response = await this.client.get<ScanResult[]>('/api/scans', {
        params
      });
      return response.data;
    } catch (error) {
      throw this.formatError('Failed to list scans', error);
    }
  }

  /**
   * Handle axios errors
   */
  private handleError(error: any): Promise<never> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        // Server responded with error
        const status = axiosError.response.status;
        const message = (axiosError.response.data as any)?.message || axiosError.message;

        return Promise.reject(new ScannerError(message, status, axiosError.response.data));
      } else if (axiosError.request) {
        // Request made but no response
        return Promise.reject(new ScannerError('Network error: No response from server'));
      }
    }

    return Promise.reject(error);
  }

  /**
   * Format error message
   */
  private formatError(message: string, error: any): ScannerError {
    if (error instanceof ScannerError) {
      return error;
    }

    const errorMessage = error.message || 'Unknown error';
    return new ScannerError(`${message}: ${errorMessage}`, error.statusCode, error.details);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
