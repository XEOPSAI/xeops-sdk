# @xeops/scanner-cli

XeOps Security Scanner CLI for CI/CD pipelines.

## Installation

```bash
npm install -g @xeops/scanner-cli
```

Or use with npx:

```bash
npx @xeops/scanner-cli scan --url https://example.com --api-key YOUR_KEY
```

## Usage

### Start a Scan

```bash
xeops-scan scan \
  --url https://example.com \
  --api-key YOUR_API_KEY \
  --wait \
  --fail-on-high
```

**Options:**
- `-u, --url <url>`: Target URL to scan (required)
- `-k, --api-key <key>`: XeOps API key (required)
- `-e, --endpoint <endpoint>`: API endpoint (default: production)
- `-w, --wait`: Wait for scan to complete
- `--timeout <seconds>`: Scan timeout in seconds (default: 1800)
- `--pdf <path>`: Download PDF report to path
- `--validate-poc`: Validate vulnerabilities with PoC (default: true)
- `--fail-on-high`: Exit with code 1 if high/critical vulnerabilities found
- `--fail-on-medium`: Exit with code 1 if medium+ vulnerabilities found
- `--json`: Output results as JSON

### Check Scan Status

```bash
xeops-scan status \
  --scan-id SCAN_ID \
  --api-key YOUR_API_KEY
```

### Download PDF Report

```bash
xeops-scan report \
  --scan-id SCAN_ID \
  --api-key YOUR_API_KEY \
  --output report.pdf \
  --validate-poc
```

### Check Usage

```bash
xeops-scan usage --api-key YOUR_API_KEY
```

## CI/CD Examples

### GitHub Actions

```yaml
name: Security Scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Security Scan
        run: |
          npx @xeops/scanner-cli scan \
            --url https://staging.example.com \
            --api-key ${{ secrets.XEOPS_API_KEY }} \
            --wait \
            --fail-on-high \
            --pdf security-report.pdf

      - name: Upload Report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: security-report
          path: security-report.pdf
```

### GitLab CI

```yaml
security_scan:
  stage: test
  script:
    - npx @xeops/scanner-cli scan
        --url https://staging.example.com
        --api-key $XEOPS_API_KEY
        --wait
        --fail-on-high
        --pdf security-report.pdf
  artifacts:
    when: always
    paths:
      - security-report.pdf
    reports:
      junit: security-report.xml
```

### Jenkins

```groovy
pipeline {
    agent any
    environment {
        XEOPS_API_KEY = credentials('xeops-api-key')
    }
    stages {
        stage('Security Scan') {
            steps {
                sh '''
                    npx @xeops/scanner-cli scan \
                        --url https://staging.example.com \
                        --api-key $XEOPS_API_KEY \
                        --wait \
                        --fail-on-high \
                        --pdf security-report.pdf
                '''
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'security-report.pdf', fingerprint: true
        }
    }
}
```

### CircleCI

```yaml
version: 2.1

jobs:
  security-scan:
    docker:
      - image: cimg/node:16.0
    steps:
      - checkout
      - run:
          name: Security Scan
          command: |
            npx @xeops/scanner-cli scan \
              --url https://staging.example.com \
              --api-key $XEOPS_API_KEY \
              --wait \
              --fail-on-high \
              --pdf security-report.pdf
      - store_artifacts:
          path: security-report.pdf
```

## Exit Codes

- `0`: Success (no vulnerabilities above threshold)
- `1`: Failure (vulnerabilities found or error occurred)

Use `--fail-on-high` or `--fail-on-medium` to control when the CLI exits with code 1.

## Environment Variables

You can use environment variables instead of CLI flags:

- `XEOPS_API_KEY`: API key
- `XEOPS_API_ENDPOINT`: API endpoint URL

## License

MIT
