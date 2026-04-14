# XeOps SDK & CLI Monorepo

TypeScript SDK and CLI for the XeOps Security Scanner.

## Project Structure

```
xeops-sdk/
├── packages/
│   ├── sdk/                  # @xeopsai/sdk
│   │   ├── src/
│   │   │   ├── client.ts     # Main SDK client
│   │   │   ├── types.ts      # TypeScript definitions
│   │   │   ├── auth.ts       # API key + OAuth auth support
│   │   │   ├── sse.ts        # SSE helpers and stream parsing
│   │   │   └── *.test.ts     # Unit tests
│   │   └── package.json
│   └── cli/                  # @xeopsai/cli
│       ├── src/
│       │   ├── cli.ts        # Commander entrypoint
│       │   ├── options.ts    # CI exit code + timeout parsing helpers
│       │   └── *.test.ts     # Unit tests
│       └── package.json
└── .github/workflows/
    ├── ci.yml
    ├── sdk-quality.yml
    └── publish.yml
```

## SDK

Package: `@xeopsai/sdk` — Axios-based HTTP client.

### Key Methods

- `startScan({ targetUrl, persona? })`
- `getScanResult(scanId)`
- `getGraph(scanId)`
- `getFindings(scanId)`
- `subscribeToScanEvents(scanId, handlers, options?)` (WS + SSE fallback)
- `waitForScanCompletion(scanId, options?)`
- `downloadPdfReport(scanId, validatePoc?)`
- `getUsage()`
- `verifyApiKey()`

### Auth

- API key via `X-API-Key`
- OAuth client credentials (`clientId`, `clientSecret`, optional `tokenUrl`)

### Example

```ts
import { XeOpsScannerClient } from '@xeopsai/sdk';

const client = new XeOpsScannerClient({
  apiEndpoint: process.env.XEOPS_API_ENDPOINT!,
  apiKey: process.env.XEOPS_API_KEY!
});
```

## CLI

Package: `@xeopsai/cli` — Binary: `xeops-scan`

### Commands

- `xeops-scan scan --url <url> --api-key <key> [--wait] [--fail-on-high] [--json]`
- `xeops-scan status --scan-id <id> --api-key <key>`
- `xeops-scan report --scan-id <id> --api-key <key> --output <path>`
- `xeops-scan usage --api-key <key>`

### CI Mode Helpers

`packages/cli/src/options.ts` contains:

- `parseTimeoutSeconds(raw)`
- `computeExitCode(metadata, { failOnHigh, failOnMedium })`

## Dev Commands

From package directories:

```bash
npm run build
npm run test
npm run lint
npm run format:check
```

## Publishing

Tag push `v*` triggers `.github/workflows/publish.yml`:

1. Publish `@xeopsai/sdk`
2. Publish `@xeopsai/cli`

## Notes

- Code/comments/messages in English.
- Keep strict typing in TypeScript.
- Add unit tests for new helper functions (happy/edge/error paths).
