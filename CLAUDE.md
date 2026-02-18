# CLAUDE.md - XeOps SDK Context

## Repository Overview

**XeOps SDK** is the official TypeScript SDK and CLI for the XeOps Security Platform. This is a **public** repository (MIT license) for CI/CD integration and programmatic access to the scanner.

## Structure

```
xeops-sdk/
├── packages/
│   ├── sdk/                  # @xeopsai/scanner-sdk
│   │   ├── src/
│   │   │   ├── index.ts      # Exports + createClient() factory
│   │   │   ├── client.ts     # XeOpsScannerClient class (all methods)
│   │   │   └── types.ts      # TypeScript types + ScannerError class
│   │   ├── examples/         # CI/CD examples (GitHub Actions, GitLab CI, Jenkins)
│   │   └── package.json
│   └── cli/                  # @xeopsai/scanner-cli
│       ├── src/
│       │   └── cli.ts        # Single-file CLI (Commander.js + chalk + ora)
│       └── package.json
├── .github/                  # CI workflow, Dependabot, CODEOWNERS
├── README.md
└── LICENSE                   # MIT
```

> **No root `package.json`** — packages are independent, not an npm workspace.

## SDK (`packages/sdk/`)

Package: `@xeopsai/scanner-sdk` — Axios-based HTTP client.

### Key Class: `XeOpsScannerClient`

All methods are in `client.ts` (no separate resource files):
- `startScan(request)` — POST `/api/scans`
- `getScanResult(scanId)` — GET `/api/scans/:id`
- `listScans(params?)` — GET `/api/scans`
- `cancelScan(scanId)` — POST `/api/scans/:id/cancel`
- `waitForScanCompletion(scanId, options?)` — Polling with timeout
- `downloadPdfReport(scanId, validatePoc?)` — GET `/api/scans/:id/report/pdf`
- `getUsage()` — GET `/api/users/usage`
- `verifyApiKey()` — GET `/api/auth/verify`
- `healthCheck()` — GET `/health`

### Config

```typescript
import { XeOpsScannerClient } from '@xeopsai/scanner-sdk';

const client = new XeOpsScannerClient({
  apiEndpoint: 'https://api.xeops.ai',
  apiKey: 'your-api-key',
  timeout: 60000,    // optional (default: 60s)
  maxRetries: 3,     // optional
  debug: false       // optional
});
```

## CLI (`packages/cli/`)

Package: `@xeopsai/scanner-cli` — Binary: `xeops-scan`

Single command `scan` with options:
- `-u, --url <url>` — Target URL (required)
- `-k, --api-key <key>` — API key (required)
- `-e, --endpoint <endpoint>` — API endpoint
- `-w, --wait` — Wait for scan completion
- `--pdf <path>` — Download PDF report
- `--fail-on-high` / `--fail-on-medium` — CI quality gates
- `--json` — JSON output

Dependencies: `@xeopsai/scanner-sdk`, `commander`, `chalk`, `ora`

## Development Commands

```bash
# Each package independently:
cd packages/sdk && npm install && npm run build && npm test  # Jest
cd packages/cli && npm install && npm run build
```

## Public vs Private

This is a **PUBLIC** repository:
- Open source (MIT license)
- No proprietary code — just API client wrappers
- Does NOT contain scanning logic, AI prompts, or authentication logic

## Related Repos

| Repo | Relationship |
|------|--------------|
| `xeops-platform` | API Gateway that this SDK calls |
| `xeops-core` | Scanner engine (NOT accessed by SDK directly) |
| `xeops-docs` | Documentation references this SDK |
