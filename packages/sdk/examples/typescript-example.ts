import { XeOpsScannerClient, ScanResult } from '@xeops/scanner-sdk';
import * as fs from 'fs';

/**
 * Complete example of using XeOps Scanner SDK
 * This example shows all major features including scan, wait, and report generation
 */

async function main() {
  // Initialize client
  const client = new XeOpsScannerClient({
    apiEndpoint: process.env.XEOPS_API_ENDPOINT || 'https://xeops-scanner-97758009309.europe-west1.run.app',
    apiKey: process.env.XEOPS_API_KEY!,
    debug: true
  });

  try {
    // 1. Verify API key
    console.log('Verifying API key...');
    const isValid = await client.verifyApiKey();
    if (!isValid) {
      throw new Error('Invalid API key');
    }
    console.log('✓ API key verified');

    // 2. Check usage
    console.log('\nChecking usage...');
    const usage = await client.getUsage();
    console.log(`Plan: ${usage.plan}`);
    console.log(`Scans remaining: ${usage.scansRemaining}/${usage.scansLimit}`);

    if (usage.scansRemaining === 0) {
      throw new Error('No scans remaining in your plan');
    }

    // 3. Start scan
    console.log('\nStarting security scan...');
    const scan = await client.startScan({
      targetUrl: 'https://demo.owasp-juice.shop',
      config: {
        depth: 3,
        maxPages: 100,
        timeout: 300
      }
    });

    console.log(`✓ Scan started: ${scan.scanId}`);

    // 4. Wait for completion with progress tracking
    console.log('\nWaiting for scan to complete...');
    const result = await client.waitForScanCompletion(scan.scanId, {
      pollingInterval: 5000,
      timeout: 1800000, // 30 minutes
      onProgress: (scanResult: ScanResult) => {
        const progress = scanResult.progress || 0;
        const currentTest = scanResult.currentTest || 'Initializing...';
        const vulnCount = scanResult.vulnerabilitiesFound || 0;

        console.log(`  Progress: ${progress}% | ${currentTest} | Vulnerabilities: ${vulnCount}`);
      }
    });

    // 5. Display results
    console.log('\n=== Scan Completed ===');
    console.log(`Status: ${result.status}`);
    console.log(`Total Vulnerabilities: ${result.vulnerabilitiesFound}`);

    if (result.metadata) {
      console.log('\nSeverity Breakdown:');
      console.log(`  Critical: ${result.metadata.criticalCount || 0}`);
      console.log(`  High: ${result.metadata.highCount || 0}`);
      console.log(`  Medium: ${result.metadata.mediumCount || 0}`);
      console.log(`  Low: ${result.metadata.lowCount || 0}`);
      console.log(`  Info: ${result.metadata.infoCount || 0}`);
    }

    // 6. Download PDF report
    console.log('\nGenerating PDF report...');
    const pdfBuffer = await client.downloadPdfReport(scan.scanId, true); // with PoC validation
    const pdfPath = `xeops-report-${scan.scanId}.pdf`;
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`✓ PDF report saved to: ${pdfPath}`);

    // 7. Export results as JSON
    const jsonPath = `xeops-report-${scan.scanId}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`✓ JSON report saved to: ${jsonPath}`);

    // 8. Determine exit code based on severity
    const criticalCount = result.metadata?.criticalCount || 0;
    const highCount = result.metadata?.highCount || 0;

    if (criticalCount > 0 || highCount > 0) {
      console.error(`\n❌ Found ${criticalCount} critical and ${highCount} high vulnerabilities`);
      process.exit(1);
    } else {
      console.log('\n✅ No critical or high vulnerabilities found');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
    process.exit(1);
  }
}

main();
