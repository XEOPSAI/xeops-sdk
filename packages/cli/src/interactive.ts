import readline from 'node:readline';
import { XeOpsScannerClient, ScanLiveEvent, ScanResult } from '@xeopsai/sdk';
import { parseTimeoutSeconds } from './options';

const INTERACTIVE_COMMANDS = ['focus', 'skip', 'pause', 'resume', 'stop'] as const;

export type InteractiveCommandType = (typeof INTERACTIVE_COMMANDS)[number];

export interface InteractiveCommand {
  type: InteractiveCommandType;
  value?: string;
}

export interface InteractiveScanOptions {
  url: string;
  timeoutSeconds: string;
}

export interface InteractiveIo {
  print: (message: string) => void;
  readLineFactory: () => readline.Interface;
}

/**
 * Parse an interactive command entered by the user.
 */
export function parseInteractiveCommand(input: string): InteractiveCommand | null {
  const normalized = input.trim();
  if (!normalized) {
    return null;
  }

  const [command, ...rest] = normalized.split(/\s+/);
  if (!INTERACTIVE_COMMANDS.includes(command as InteractiveCommandType)) {
    return null;
  }

  const value = rest.join(' ').trim();
  if (command === 'focus' && !value) {
    return null;
  }

  return value ? { type: command as InteractiveCommandType, value } : { type: command as InteractiveCommandType };
}

/**
 * Build a user-friendly text from the AttackerState payload.
 */
export function formatAttackerProgress(payload: Record<string, unknown>): string {
  const stage = typeof payload.phase === 'string' ? payload.phase : 'unknown';
  const hypothesisCount = Number(payload.hypothesesTested ?? 0);
  const findingsCount = Number(payload.findingsConfirmed ?? 0);
  return `AttackerState: phase=${stage} | hypotheses=${hypothesisCount} | confirmed=${findingsCount}`;
}

/**
 * Render one live scan event for the interactive view.
 */
export function renderLiveEvent(event: ScanLiveEvent): string {
  if (event.type === 'attacker_escalation') {
    return formatAttackerProgress(event.payload);
  }

  if (event.type === 'finding') {
    const title = String(event.payload.title ?? 'finding');
    const severity = String(event.payload.severity ?? 'unknown');
    return `Finding: [${severity}] ${title}`;
  }

  return `Event: ${event.type}`;
}

function sendInteractiveCommand(
  client: XeOpsScannerClient,
  scanId: string,
  command: InteractiveCommand
): Promise<void> {
  const callable = (client as unknown as { sendLiveCommand?: (id: string, payload: InteractiveCommand) => Promise<void> }).sendLiveCommand;
  if (!callable) {
    return Promise.resolve();
  }

  return callable(scanId, command);
}

/**
 * Run a scan in interactive mode: live events + command input.
 */
export async function runInteractiveScan(
  client: XeOpsScannerClient,
  options: InteractiveScanOptions,
  io: InteractiveIo
): Promise<ScanResult> {
  const scan = await client.startScan({ targetUrl: options.url });
  io.print(`Interactive scan started: ${scan.scanId}`);

  const closeLiveStream = client.subscribeToScanEvents(scan.scanId, {
    onEvent: (event) => {
      io.print(renderLiveEvent(event));
    },
    onError: (error) => {
      io.print(`Live stream error: ${error.message}`);
    }
  });

  const lineReader = io.readLineFactory();
  lineReader.on('line', async (line) => {
    const parsed = parseInteractiveCommand(line);
    if (!parsed) {
      io.print('Invalid command. Allowed: focus <target>, skip, pause, resume, stop');
      return;
    }

    await sendInteractiveCommand(client, scan.scanId, parsed);
    io.print(`Command sent: ${parsed.type}${parsed.value ? ` ${parsed.value}` : ''}`);
  });

  const result = await client.waitForScanCompletion(scan.scanId, {
    timeout: parseTimeoutSeconds(options.timeoutSeconds) * 1000,
    pollingInterval: 5000
  });

  lineReader.close();
  closeLiveStream();
  return result;
}
