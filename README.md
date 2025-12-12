# XeOps SDK

Official TypeScript SDK and CLI for the XeOps Security Platform.

[![npm version](https://badge.fury.io/js/@xeops/sdk.svg)](https://www.npmjs.com/package/@xeops/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
# SDK
npm install @xeops/sdk

# CLI
npm install -g @xeops/cli
```

## Quick Start

### SDK Usage

```typescript
import { XeOpsClient } from '@xeops/sdk';

const client = new XeOpsClient({
  apiKey: process.env.XEOPS_API_KEY
});

// Start a scan
const scan = await client.scans.create({
  target: 'https://example.com',
  profile: 'comprehensive'
});

console.log(`Scan started: ${scan.id}`);

// Wait for completion
const result = await client.scans.waitForCompletion(scan.id);

// Get findings
const findings = await client.scans.getFindings(scan.id);
console.log(`Found ${findings.length} vulnerabilities`);
```

### CLI Usage

```bash
# Authenticate
xeops auth login

# Start a scan
xeops scan https://example.com --profile comprehensive

# Check scan status
xeops scan status <scan-id>

# Get findings
xeops scan findings <scan-id>

# Export report
xeops scan report <scan-id> --format pdf --output report.pdf
```

## SDK Reference

### XeOpsClient

```typescript
const client = new XeOpsClient({
  apiKey: string,           // Your API key
  baseUrl?: string,         // API URL (default: https://api.xeops.io)
  timeout?: number,         // Request timeout in ms (default: 30000)
});
```

### Scans

```typescript
// Create a scan
const scan = await client.scans.create({
  target: string,           // URL to scan
  profile: 'quick' | 'comprehensive' | 'stealth',
  modules?: string[],       // Specific modules to run
  webhookUrl?: string,      // Webhook for notifications
});

// Get scan status
const status = await client.scans.get(scanId);

// List all scans
const scans = await client.scans.list({
  page?: number,
  limit?: number,
  status?: 'pending' | 'running' | 'completed' | 'failed',
});

// Get findings
const findings = await client.scans.getFindings(scanId);

// Cancel a scan
await client.scans.cancel(scanId);

// Wait for completion
const result = await client.scans.waitForCompletion(scanId, {
  pollInterval?: number,    // ms between checks (default: 5000)
  timeout?: number,         // max wait time (default: 3600000)
});
```

### Reports

```typescript
// Generate report
const report = await client.reports.generate(scanId, {
  format: 'html' | 'pdf' | 'json',
  includePoC?: boolean,
});

// Download report
const buffer = await client.reports.download(reportId);
```

### User

```typescript
// Get current user
const user = await client.user.me();

// Get usage stats
const usage = await client.user.usage();
```

## CLI Reference

```bash
xeops auth login              # Interactive login
xeops auth logout             # Clear credentials
xeops auth status             # Show current auth status

xeops scan <target>           # Start a scan
  --profile <profile>         # quick, comprehensive, stealth
  --modules <modules>         # Comma-separated list
  --wait                      # Wait for completion
  --json                      # Output as JSON

xeops scan status <id>        # Get scan status
xeops scan findings <id>      # List findings
  --severity <level>          # Filter by severity
  --json                      # Output as JSON

xeops scan report <id>        # Generate report
  --format <format>           # html, pdf, json
  --output <file>             # Output file path

xeops scan list               # List all scans
  --status <status>           # Filter by status
  --limit <n>                 # Number of results

xeops scan cancel <id>        # Cancel a running scan
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Security Scan
on: [push]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run XeOps Scan
        uses: XEOPSAI/xeops-guardian-action@v1
        with:
          api-key: ${{ secrets.XEOPS_API_KEY }}
          target: https://staging.example.com
          profile: quick
          fail-on-critical: true
```

### GitLab CI

```yaml
security_scan:
  image: node:20
  script:
    - npm install -g @xeops/cli
    - xeops auth login --token $XEOPS_API_KEY
    - xeops scan $CI_ENVIRONMENT_URL --wait --fail-on-critical
```

## Webhooks

Configure webhooks to receive scan notifications:

```typescript
const scan = await client.scans.create({
  target: 'https://example.com',
  webhookUrl: 'https://your-app.com/webhooks/xeops'
});

// Your webhook will receive:
{
  "event": "scan.completed",
  "scanId": "scan_abc123",
  "status": "completed",
  "findingsCount": 5,
  "criticalCount": 1
}
```

## Error Handling

```typescript
import { XeOpsError, RateLimitError, AuthenticationError } from '@xeops/sdk';

try {
  const scan = await client.scans.create({ target: 'https://example.com' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid API key');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof XeOpsError) {
    console.error(`API error: ${error.message}`);
  }
}
```

## TypeScript Types

Full TypeScript support with exported types:

```typescript
import type {
  Scan,
  ScanConfig,
  ScanStatus,
  Finding,
  Severity,
  Report,
  User,
  UsageStats
} from '@xeops/sdk';
```

## Examples

See the [examples](./examples) directory for more detailed examples:

- [Basic scan](./examples/basic-scan.ts)
- [CI integration](./examples/ci-integration.ts)
- [Webhook handler](./examples/webhook-handler.ts)
- [Batch scanning](./examples/batch-scanning.ts)

## Support

- Documentation: https://docs.xeops.io
- Issues: https://github.com/XEOPSAI/xeops-sdk/issues
- Email: support@xeops.io

## License

MIT License - see [LICENSE](./LICENSE)
