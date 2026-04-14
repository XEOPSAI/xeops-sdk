# @xeops/scanner-sdk

XeOps Security Scanner SDK for CI/CD integration and programmatic access.

## Installation

```bash
npm install @xeops/scanner-sdk
```

## Usage

### Basic Example

```typescript
import { XeOpsScannerClient } from '@xeops/scanner-sdk';

const client = new XeOpsScannerClient({
  apiEndpoint: 'https://xeops-scanner-97758009309.europe-west1.run.app',
  apiKey: 'your-api-key'
});

// Start a scan (persona optional)
const scan = await client.startScan({
  targetUrl: 'https://example.com',
  persona: 'scout'
});

console.log('Scan ID:', scan.scanId);

// Wait for completion
const result = await client.waitForScanCompletion(scan.scanId, {
  onProgress: (result) => {
    console.log(`Progress: ${result.progress}%`);
  }
});

console.log('Vulnerabilities found:', result.vulnerabilitiesFound);
```

### CI/CD Integration

```typescript
import { XeOpsScannerClient } from '@xeops/scanner-sdk';
import * as fs from 'fs';

const client = new XeOpsScannerClient({
  apiEndpoint: process.env.XEOPS_API_ENDPOINT!,
  apiKey: process.env.XEOPS_API_KEY!
});

async function securityScan() {
  // Start scan
  const scan = await client.startScan({
    targetUrl: 'https://staging.example.com'
  });

  // Wait for completion with timeout
  const result = await client.waitForScanCompletion(scan.scanId, {
    timeout: 1800000, // 30 minutes
    onProgress: (r) => console.log(`${r.progress}%`)
  });

  // Download PDF report
  const pdf = await client.downloadPdfReport(scan.scanId, true);
  fs.writeFileSync('security-report.pdf', pdf);

  // Fail build if critical/high vulnerabilities found
  const critical = result.metadata?.criticalCount || 0;
  const high = result.metadata?.highCount || 0;

  if (critical > 0 || high > 0) {
    console.error(`Found ${critical} critical and ${high} high vulnerabilities`);
    process.exit(1);
  }
}

securityScan().catch(console.error);
```

## API Reference

### XeOpsScannerClient

#### Constructor

```typescript
new XeOpsScannerClient(config: ScannerSDKConfig)
```

**Config options:**
- `apiEndpoint`: XeOps API endpoint URL
- `apiKey?`: Your API key (sent in `X-API-Key` header)
- `auth?`: Explicit auth config (`{ type: 'apiKey', apiKey }` or OAuth client credentials)
- `timeout?`: Request timeout in ms (default: 60000)
- `maxRetries?`: Max retry attempts (default: 3)
- `retryDelay?`: Delay between retries in ms (default: 1000)
- `debug?`: Enable debug logging (default: false)

### OAuth client credentials

```typescript
const client = new XeOpsScannerClient({
  apiEndpoint: process.env.XEOPS_API_ENDPOINT!,
  auth: {
    type: 'oauth',
    clientId: process.env.XEOPS_CLIENT_ID!,
    clientSecret: process.env.XEOPS_CLIENT_SECRET!,
    tokenUrl: process.env.XEOPS_TOKEN_URL // optional, defaults to `${apiEndpoint}/oauth/token`
  }
});
```

#### Methods

**startScan(request: ScanRequest): Promise<ScanResponse>**

Start a new security scan.

**getScanResult(scanId: string): Promise<ScanResult>**

Get the current status and results of a scan.

**getGraph(scanId: string): Promise<ScanGraph>**

Fetch V13 graph export for a scan (`/api/scans/:id/graph`).

**getFindings(scanId: string): Promise<ScanFinding[]>**

Fetch V13 findings (`/api/scans/:id/findings`) including `validation_level`, `reproducer`, and structured evidence.

**subscribeToScanEvents(scanId: string, handlers, options?)**

Subscribe to live scan events using WebSocket or SSE fallback.

**waitForScanCompletion(scanId: string, options?: WaitForScanOptions): Promise<ScanResult>**

Wait for a scan to complete with polling.

Options:
- `pollingInterval?`: Polling interval in ms (default: 5000)
- `timeout?`: Maximum wait time in ms (default: 1800000)
- `onProgress?`: Callback for progress updates

**downloadPdfReport(scanId: string, validatePoc?: boolean): Promise<Buffer>**

Download PDF report for a completed scan.

**getUsage(): Promise<UsageStats>**

Get usage statistics for your account.

**verifyApiKey(): Promise<boolean>**

Verify if the API key is valid.

**cancelScan(scanId: string): Promise<void>**

Cancel a running scan.

**listScans(params?: ListScansParams): Promise<ScanResult[]>**

List scans for your account.

## License

MIT
