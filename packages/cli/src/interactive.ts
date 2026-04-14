import chalk from 'chalk';
import type { Writable, Readable } from 'node:stream';
import { createInterface } from 'node:readline';
import type { ScanLiveEvent, ScanResult, XeOpsScannerClient } from '@xeopsai/sdk';

const FINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);
const COMMANDS = new Set(['help', 'focus', 'skip', 'pause', 'resume', 'stop', 'quit']);

export type InteractiveCommand = {
  name: string;
  args: string[];
};

export type InteractiveSessionOptions = {
  client: Pick<XeOpsScannerClient, 'subscribeToScanEvents' | 'getScanResult' | 'cancelScan'>;
  scanId: string;
  input: Readable;
  output: Writable;
  sendCommand?: (command: InteractiveCommand) => Promise<void>;
};

/**
 * Parse a user command entered in interactive mode.
 */
export function parseInteractiveCommand(raw: string): InteractiveCommand {
  const normalized = raw.trim();
  if (!normalized) {
    throw new Error('Command cannot be empty');
  }

  const [name, ...args] = normalized.split(/\s+/);
  const commandName = name.toLowerCase();

  if (!COMMANDS.has(commandName)) {
    throw new Error(`Unsupported command: ${name}`);
  }

  return { name: commandName, args };
}

/**
 * Run the interactive terminal session for a scan.
 */
export async function runInteractiveSession(options: InteractiveSessionOptions): Promise<ScanResult> {
  const { client, scanId, input, output } = options;
  let finished = false;

  writeLine(output, chalk.blue(`Interactive mode started for scan ${scanId}`));
  writeLine(output, chalk.gray('Commands: help, focus <path>, skip <vuln>, pause, resume, stop, quit'));

  const unsubscribe = client.subscribeToScanEvents(scanId, {
    onEvent: (event) => writeLine(output, formatLiveEvent(event)),
    onError: (error) => writeLine(output, chalk.red(`Live stream error: ${error.message}`)),
    onClose: () => writeLine(output, chalk.gray('Live stream closed'))
  });

  const readline = createInterface({ input, output });

  try {
    for await (const line of readline) {
      const shouldContinue = await handleInputLine(line, options, output);
      if (!shouldContinue) {
        break;
      }

      const latest = await client.getScanResult(scanId);
      if (FINAL_STATUSES.has(latest.status)) {
        finished = true;
        break;
      }

      writeLine(output, chalk.gray('>'));
    }
  } finally {
    readline.close();
    unsubscribe();
  }

  if (!finished) {
    writeLine(output, chalk.yellow('Interactive session ended before terminal scan status. Fetching latest status...'));
  }

  return client.getScanResult(scanId);
}

function writeLine(output: Writable, message: string): void {
  output.write(`${message}\n`);
}

function formatLiveEvent(event: ScanLiveEvent): string {
  const payload = event.payload ?? {};
  const compactPayload = JSON.stringify(payload);
  return chalk.cyan(`[${event.type}]`) + ` ${compactPayload}`;
}

async function handleInputLine(
  line: string,
  options: InteractiveSessionOptions,
  output: Writable
): Promise<boolean> {
  if (!line.trim()) {
    return true;
  }

  let command: InteractiveCommand;
  try {
    command = parseInteractiveCommand(line);
  } catch (error) {
    writeLine(output, chalk.red((error as Error).message));
    return true;
  }

  if (command.name === 'help') {
    writeLine(output, chalk.gray('Usage: focus <path> | skip <vuln> | pause | resume | stop | quit'));
    return true;
  }

  if (command.name === 'quit') {
    return false;
  }

  if (command.name === 'stop') {
    await options.client.cancelScan(options.scanId);
    writeLine(output, chalk.yellow('Stop command sent.'));
    return false;
  }

  if (!options.sendCommand) {
    writeLine(output, chalk.yellow(`Command queued locally (backend bridge not configured): ${command.name}`));
    return true;
  }

  await options.sendCommand(command);
  writeLine(output, chalk.green(`Command sent: ${command.name}`));
  return true;
}
