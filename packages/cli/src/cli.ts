#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { XeOpsScannerClient, ScanResult } from '@xeopsai/scanner-sdk';
import * as fs from 'fs';

const program = new Command();

program
  .name('xeops-scan')
  .description('XeOps Security Scanner CLI for CI/CD pipelines')
  .version('1.0.0');

program
  .command('scan')
  .description('Start a security scan')
  .requiredOption('-u, --url <url>', 'Target URL to scan')
  .requiredOption('-k, --api-key <key>', 'XeOps API key')
  .option('-e, --endpoint <endpoint>', 'API endpoint', 'https://xeops-scanner-97758009309.europe-west1.run.app')
  .option('-w, --wait', 'Wait for scan to complete', false)
  .option('--timeout <seconds>', 'Scan timeout in seconds', '1800')
  .option('--pdf <path>', 'Download PDF report to path')
  .option('--validate-poc', 'Validate vulnerabilities with PoC', true)
  .option('--fail-on-high', 'Exit with code 1 if high/critical vulnerabilities found', false)
  .option('--fail-on-medium', 'Exit with code 1 if medium+ vulnerabilities found', false)
  .option('--json', 'Output results as JSON', false)
  .action(async (options) => {
    const client = new XeOpsScannerClient({
      apiEndpoint: options.endpoint,
      apiKey: options.apiKey,
      debug: false
    });

    try {
      // Verify API key
      const spinner = ora('Verifying API key...').start();
      const isValid = await client.verifyApiKey();
      if (!isValid) {
        spinner.fail('Invalid API key');
        process.exit(1);
      }
      spinner.succeed('API key verified');

      // Start scan
      spinner.start('Starting security scan...');
      const scanResponse = await client.startScan({
        targetUrl: options.url
      });
      spinner.succeed(`Scan started: ${scanResponse.scanId}`);

      console.log(chalk.blue(`Scan ID: ${scanResponse.scanId}`));
      console.log(chalk.blue(`Target: ${options.url}`));

      let result: ScanResult | undefined;

      // Wait for completion if requested
      if (options.wait) {
        console.log(chalk.yellow('\nWaiting for scan to complete...\n'));

        const progressSpinner = ora('Initializing...').start();

        result = await client.waitForScanCompletion(
          scanResponse.scanId,
          {
            timeout: parseInt(options.timeout) * 1000,
            pollingInterval: 5000,
            onProgress: (scanResult) => {
              const progress = scanResult.progress || 0;
              const currentTest = scanResult.currentTest || 'Running...';
              const vulnCount = scanResult.vulnerabilitiesFound || 0;

              progressSpinner.text = `Progress: ${progress}% | ${currentTest} | Vulnerabilities: ${vulnCount}`;
            }
          }
        );

        progressSpinner.succeed('Scan completed');

        // Display results
        displayResults(result, options.json);

        // Download PDF if requested
        if (options.pdf) {
          const pdfSpinner = ora('Generating PDF report...').start();
          const pdfBuffer = await client.downloadPdfReport(
            scanResponse.scanId,
            options.validatePoc
          );
          fs.writeFileSync(options.pdf, pdfBuffer);
          pdfSpinner.succeed(`PDF report saved to: ${options.pdf}`);
        }

        // Exit with appropriate code based on severity
        const exitCode = getExitCode(result, options);
        if (exitCode !== 0) {
          console.log(chalk.red(`\nExiting with code ${exitCode} due to vulnerability severity threshold`));
        }
        process.exit(exitCode);
      } else {
        console.log(chalk.green(`\nScan queued successfully!`));
        console.log(chalk.gray(`Use --wait flag to wait for completion`));
        console.log(chalk.gray(`Or check status with: xeops-scan status -s ${scanResponse.scanId}`));
      }

    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      if (error.details) {
        console.error(chalk.gray(JSON.stringify(error.details, null, 2)));
      }
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check scan status')
  .requiredOption('-s, --scan-id <id>', 'Scan ID')
  .requiredOption('-k, --api-key <key>', 'XeOps API key')
  .option('-e, --endpoint <endpoint>', 'API endpoint', 'https://xeops-scanner-97758009309.europe-west1.run.app')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    const client = new XeOpsScannerClient({
      apiEndpoint: options.endpoint,
      apiKey: options.apiKey
    });

    try {
      const result = await client.getScanResult(options.scanId);
      displayResults(result, options.json);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('report')
  .description('Download scan report')
  .requiredOption('-s, --scan-id <id>', 'Scan ID')
  .requiredOption('-k, --api-key <key>', 'XeOps API key')
  .requiredOption('-o, --output <path>', 'Output PDF path')
  .option('-e, --endpoint <endpoint>', 'API endpoint', 'https://xeops-scanner-97758009309.europe-west1.run.app')
  .option('--validate-poc', 'Validate vulnerabilities with PoC', true)
  .action(async (options) => {
    const client = new XeOpsScannerClient({
      apiEndpoint: options.endpoint,
      apiKey: options.apiKey
    });

    try {
      const spinner = ora('Generating PDF report...').start();
      const pdfBuffer = await client.downloadPdfReport(
        options.scanId,
        options.validatePoc
      );
      fs.writeFileSync(options.output, pdfBuffer);
      spinner.succeed(`PDF report saved to: ${options.output}`);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program
  .command('usage')
  .description('Show usage statistics')
  .requiredOption('-k, --api-key <key>', 'XeOps API key')
  .option('-e, --endpoint <endpoint>', 'API endpoint', 'https://xeops-scanner-97758009309.europe-west1.run.app')
  .action(async (options) => {
    const client = new XeOpsScannerClient({
      apiEndpoint: options.endpoint,
      apiKey: options.apiKey
    });

    try {
      const usage = await client.getUsage();
      console.log(chalk.blue('Usage Statistics:'));
      console.log(`  Plan: ${chalk.green(usage.plan)}`);
      console.log(`  Scans Used: ${chalk.yellow(usage.scansUsed)}/${usage.scansLimit}`);
      console.log(`  Scans Remaining: ${chalk.green(usage.scansRemaining)}`);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

function displayResults(result: ScanResult, json: boolean) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(chalk.blue('\n=== Scan Results ==='));
  console.log(`Status: ${getStatusColor(result.status)}`);
  console.log(`Progress: ${result.progress}%`);
  console.log(`Vulnerabilities Found: ${chalk.red(result.vulnerabilitiesFound)}`);

  if (result.metadata) {
    console.log(chalk.blue('\n=== Severity Breakdown ==='));
    console.log(`  Critical: ${chalk.red(result.metadata.criticalCount || 0)}`);
    console.log(`  High: ${chalk.red(result.metadata.highCount || 0)}`);
    console.log(`  Medium: ${chalk.yellow(result.metadata.mediumCount || 0)}`);
    console.log(`  Low: ${chalk.gray(result.metadata.lowCount || 0)}`);
    console.log(`  Info: ${chalk.gray(result.metadata.infoCount || 0)}`);
  }

  if (result.duration) {
    console.log(`\nDuration: ${Math.round(result.duration / 1000)}s`);
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green(status);
    case 'failed':
      return chalk.red(status);
    case 'running':
      return chalk.yellow(status);
    default:
      return chalk.gray(status);
  }
}

function getExitCode(result: ScanResult, options: any): number {
  if (!result.metadata) {
    return 0;
  }

  const critical = result.metadata.criticalCount || 0;
  const high = result.metadata.highCount || 0;
  const medium = result.metadata.mediumCount || 0;

  if (options.failOnHigh && (critical > 0 || high > 0)) {
    return 1;
  }

  if (options.failOnMedium && (critical > 0 || high > 0 || medium > 0)) {
    return 1;
  }

  return 0;
}

program.parse(process.argv);
