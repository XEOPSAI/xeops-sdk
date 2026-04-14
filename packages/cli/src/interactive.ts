import readline from 'node:readline';
import { XeOpsScannerClient, ScanLiveEvent, ScanResult } from '@xeopsai/sdk';

const SUPPORTED_COMMANDS = ['focus', 'skip', 'pause', 'resume'] as const;

export interface InteractiveScanOptions {
  url: string;
  onOutput?: (line: string) => void;
  onCommand?: (command: string, args: string[]) => Promise<void>;
  createInterface?: typeof readline.createInterface;
}

/**
 * Run an interactive scan session with live events and command input.
 */
export async function runInteractiveScan(
  client: XeOpsScannerClient,
  options: InteractiveScanOptions
): Promise<ScanResult> {
  const output = options.onOutput ?? ((line: string) => process.stdout.write(`${line}\n`));
  const createInterface = options.createInterface ?? readline.createInterface;
  const scan = await client.startScan({ targetUrl: options.url });
  output(`Scan started: ${scan.scanId}`);

  const closeLiveFeed = client.subscribeToScanEvents(scan.scanId, {
    onEvent: (event) => output(formatLiveEvent(event)),
    onError: (error) => output(`Live stream error: ${error.message}`),
    onOpen: () => output('Live stream connected.')
  });

  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  terminal.on('line', async (line: string) => {
    await handleCommand(line, output, options.onCommand);
  });

  try {
    const result = await client.waitForScanCompletion(scan.scanId, {
      onProgress: (progressResult) => output(formatProgress(progressResult))
    });
    output(`Scan finished with status: ${result.status}`);
    return result;
  } finally {
    closeLiveFeed();
    terminal.close();
  }
}

function formatProgress(result: ScanResult): string {
  const step = result.currentTest ?? 'running';
  return `Progress ${result.progress}% | ${step} | vulnerabilities=${result.vulnerabilitiesFound}`;
}

function formatLiveEvent(event: ScanLiveEvent): string {
  return `[${event.type}] ${JSON.stringify(event.payload)}`;
}

async function handleCommand(
  rawLine: string,
  output: (line: string) => void,
  onCommand?: (command: string, args: string[]) => Promise<void>
): Promise<void> {
  const [command, ...args] = rawLine.trim().split(/\s+/);
  if (!command) {
    return;
  }

  if (!SUPPORTED_COMMANDS.includes(command as (typeof SUPPORTED_COMMANDS)[number])) {
    output(`Unsupported command: ${command}`);
    return;
  }

  if (!onCommand) {
    output(`Accepted command: ${command} ${args.join(' ')}`.trim());
    return;
  }

  await onCommand(command, args);
}
