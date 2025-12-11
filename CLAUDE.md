# CLAUDE.md - XeOps SDK Context

## Repository Overview

**XeOps SDK** is the official TypeScript SDK and CLI for the XeOps Security Platform. This is a **public** repository designed to help developers integrate XeOps into their applications and CI/CD pipelines.

## Structure

```
xeops-sdk/
├── packages/
│   ├── sdk/                # @xeops/sdk - TypeScript SDK
│   │   ├── src/
│   │   │   ├── client.ts   # Main XeOpsClient class
│   │   │   ├── types.ts    # TypeScript types
│   │   │   ├── errors.ts   # Error classes
│   │   │   └── resources/  # API resource classes
│   │   │       ├── scans.ts
│   │   │       ├── reports.ts
│   │   │       └── user.ts
│   │   └── package.json
│   └── cli/                # @xeops/cli - Command line tool
│       ├── src/
│       │   ├── index.ts    # CLI entry point
│       │   └── commands/   # CLI commands
│       │       ├── auth.ts
│       │       ├── scan.ts
│       │       └── report.ts
│       └── package.json
├── examples/               # Usage examples
├── docs/                   # API documentation
└── package.json            # Monorepo root
```

## Key Implementation Details

### SDK Architecture
```typescript
// client.ts
export class XeOpsClient {
  private apiKey: string;
  private baseUrl: string;

  scans: ScansResource;
  reports: ReportsResource;
  user: UserResource;

  constructor(config: ClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.xeops.io';

    this.scans = new ScansResource(this);
    this.reports = new ReportsResource(this);
    this.user = new UserResource(this);
  }

  async request<T>(method: string, path: string, data?: any): Promise<T> {
    // Implementation
  }
}
```

### CLI Architecture
```typescript
// Uses Commander.js
import { Command } from 'commander';

const program = new Command();

program
  .name('xeops')
  .description('XeOps Security Scanner CLI')
  .version('1.0.0');

program
  .command('scan <target>')
  .option('--profile <profile>', 'Scan profile')
  .action(async (target, options) => {
    // Implementation
  });
```

## Development Commands

```bash
# Install dependencies (monorepo)
npm install

# Build all packages
npm run build

# Run tests
npm test

# Publish to npm
npm run publish
```

## API Endpoints Used

The SDK calls the xeops-platform API Gateway:

```
Base URL: https://api.xeops.io

POST /api/scans             # Create scan
GET  /api/scans             # List scans
GET  /api/scans/:id         # Get scan
GET  /api/scans/:id/findings # Get findings
DELETE /api/scans/:id       # Cancel scan
POST /api/reports           # Generate report
GET  /api/reports/:id       # Download report
GET  /api/users/me          # Current user
GET  /api/usage             # Usage stats
```

## Public vs Private

This is a **PUBLIC** repository:
- Open source (MIT license)
- Community contributions welcome
- No proprietary code here
- Just API client implementation

The SDK does NOT contain:
- Scanning logic (that's in xeops-core)
- Authentication logic (that's in xeops-platform)
- Any XeOps proprietary algorithms

## Publishing

```bash
# Build packages
npm run build

# Bump version
npm version minor

# Publish to npm
npm publish --access public
```

## Related Repos

| Repo | Relationship |
|------|--------------|
| xeops-platform | API that this SDK calls |
| xeops-docs | Documentation references this SDK |
| xeops-guardian-action | GitHub Action that uses this SDK |

## For Contributors

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Submit a PR with clear description

Guidelines:
- Follow existing code style
- 100% test coverage for new code
- Update README if adding features
- Update TypeScript types
