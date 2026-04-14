import * as readline from 'readline';
import chalk from 'chalk';
import { XeOpsScannerClient, ScanLiveEvent, ScanResult } from '@xeopsai/sdk';

const INTERACTIVE_PROMPT = 'xeops> ';
const COMPLETED_STATUSES = new Set(['scan_complete', 'scan_completed']);
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

export type InteractiveCommandType = 'focus' | 'skip' | 'pause' | 'resume' | 'stop';

export interface InteractiveCommand {
  type: InteractiveCommandType;
  value?: string;
}

/**
 * Parse a user interactive command entered in the terminal.
 */
export function parseInteractiveCommand(input: string): InteractiveCommand {
  const [rawType, ...rest] = input.trim().split(/\s+/);
  const type = (rawType || '').toLowerCase();

  if (!isSupportedCommand(type)) {
    throw new Error('Unsupported command. Use: focus <path>, skip <vuln>, pause, resume, stop');
  }

  const value = rest.join(' ').trim();
  if (requiresValue(type) && !value) {
    throw new Error(`Command ${type} requires a value`);
  }

  return value ? { type, value } : { type };
}

/**
 * Build payload for live command forwarding.
 */
export function buildLiveCommandPayload(command: InteractiveCommand): Record<string, unknown> {
  return {
    command: command.type,
    ...(command.value ? { value: command.value } : {})
  };
}

/**
 * Build a compact human-readable line for an incoming live scan event.
 */
export function formatLiveEventLine(event: ScanLiveEvent): string {
  if (event.type === 'finding') {
    const severity = String(event.payload.severity || 'unknown').toLowerCase();
    const title = String(event.payload.title || 'Untitled finding');
    const endpoint = String(event.payload.endpoint || event.payload.url || 'n/a');
    return `${chalk.red('finding')} ${severity.toUpperCase()} ${title} @ ${endpoint}`;
  }

  if (event.type === 'solver_spawned') {
    const solver = String(event.payload.solver || event.payload.vuln_type || 'solver');
    const endpoint = String(event.payload.endpoint || 'n/a');
    return `${chalk.cyan('solver')} ${solver} -> ${endpoint}`;
  }

  if (event.type === 'phase_change') {
    return `${chalk.yellow('phase')} ${String(event.payload.phase || 'unknown')}`;
  }

  if (COMPLETED_STATUSES.has(event.type)) {
    return chalk.green('scan completed');
  }

  return `${chalk.gray(event.type)} ${JSON.stringify(event.payload)}`;
}

/**
 * Render an end-of-scan severity summary line.
 */
export function renderSeveritySummary(result: ScanResult): string {
  const metadata = result.metadata ?? {};
  const parts = SEVERITY_ORDER.map((severity) => {
    const key = `${severity}Count` as keyof NonNullable<ScanResult['metadata']>;
    const count = Number(metadata[key] ?? 0);
    return `${severity}:${count}`;
  });

  return `Summary ${parts.join(' | ')}`;
}

/**
 * Run scan in interactive terminal mode.
 */
export async function runInteractiveScan(
  client: XeOpsScannerClient,
  options: {
    url: string;
    persona?: string;
    timeoutMs: number;
  }
): Promise<ScanResult> {
  const scan = await client.startScan({
    targetUrl: options.url,
    ...(options.persona ? { persona: options.persona } : {})
  });

  process.stdout.write(chalk.blue(`Interactive scan started: ${scan.scanId}\n`));

  let closed = false;
  const closeLive = client.subscribeToScanEvents(scan.scanId, {
    onEvent: (event) => {
      process.stdout.write(`${formatLiveEventLine(event)}\n${INTERACTIVE_PROMPT}`);
    },
    onError: (error) => {
      process.stdout.write(chalk.red(`live error: ${error.message}\n`));
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: INTERACTIVE_PROMPT
  });

  rl.on('line', async (input: string) => {
    try {
      const command = parseInteractiveCommand(input);
      await sendCommand(client, scan.scanId, buildLiveCommandPayload(command));
      process.stdout.write(chalk.green(`command sent: ${command.type}\n`));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown command error';
      process.stdout.write(chalk.red(`${message}\n`));
    }

    if (!closed) {
      rl.prompt();
    }
  });

  rl.prompt();

  try {
    const result = await client.waitForScanCompletion(scan.scanId, {
      timeout: options.timeoutMs,
      pollingInterval: 5000,
      onProgress: (current) => {
        const currentTest = current.currentTest || 'running';
        process.stdout.write(`\rProgress ${current.progress}% | ${currentTest}                 `);
      }
    });

    process.stdout.write(`\n${chalk.green(renderSeveritySummary(result))}\n`);
    return result;
  } finally {
    closed = true;
    rl.close();
    closeLive();
  }
}

function isSupportedCommand(value: string): value is InteractiveCommandType {
  return value === 'focus' || value === 'skip' || value === 'pause' || value === 'resume' || value === 'stop';
}

async function sendCommand(
  client: XeOpsScannerClient,
  scanId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const commandClient = client as XeOpsScannerClient & {
    sendScanCommand?: (id: string, body: Record<string, unknown>) => Promise<void>;
  };

  if (!commandClient.sendScanCommand) {
    throw new Error('Command channel is not available in this SDK version');
  }

  await commandClient.sendScanCommand(scanId, payload);
}

function requiresValue(command: InteractiveCommandType): boolean {
  return command === 'focus' || command === 'skip';
}
