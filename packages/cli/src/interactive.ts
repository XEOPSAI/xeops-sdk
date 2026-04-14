import { createInterface, Interface } from 'node:readline';
import { ScanLiveEvent, XeOpsScannerClient } from '@xeopsai/sdk';

const COMMAND_PREFIX = '/';

export type InteractiveCommandType = 'focus' | 'skip' | 'pause';

export interface InteractiveCommand {
  type: InteractiveCommandType;
  argument?: string;
}

export interface InteractiveScanOptions {
  targetUrl: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

/**
 * Parse a slash command entered in interactive mode.
 */
export function parseInteractiveCommand(input: string): InteractiveCommand | null {
  const normalizedInput = input.trim();
  if (!normalizedInput.startsWith(COMMAND_PREFIX)) {
    return null;
  }

  const [rawType, ...rawArgs] = normalizedInput.slice(COMMAND_PREFIX.length).split(/\s+/);
  const type = rawType?.toLowerCase();
  if (!isSupportedCommand(type)) {
    return null;
  }

  const argument = rawArgs.join(' ').trim();
  return argument ? { type, argument } : { type };
}

/**
 * Build a readable row for attacker progression based on live events.
 */
export function formatAttackerState(event: ScanLiveEvent): string {
  const attackerState = event.payload.attackerState;
  if (!attackerState || typeof attackerState !== 'object') {
    return 'AttackerState: n/a';
  }

  const data = attackerState as Record<string, unknown>;
  const phase = typeof data.phase === 'string' ? data.phase : 'unknown';
  const step = typeof data.step === 'number' ? data.step : 0;
  const total = typeof data.totalSteps === 'number' ? data.totalSteps : 0;
  return `AttackerState: ${phase} (${step}/${total})`;
}

/**
 * Run an interactive scan session with live findings and command input.
 */
export async function runInteractiveScan(
  client: XeOpsScannerClient,
  options: InteractiveScanOptions
): Promise<void> {
  const scan = await client.startScan({ targetUrl: options.targetUrl });
  const output = options.output ?? process.stdout;
  const input = options.input ?? process.stdin;
  const terminal = createTerminal(input, output);

  output.write(`\n=== XeOps Interactive Mode ===\n`);
  output.write(`Scan started: ${scan.scanId}\n`);
  output.write('Commands: /focus <scope>, /skip, /pause, /quit\n\n');

  const unsubscribe = client.subscribeToScanEvents(scan.scanId, {
    onEvent: (event) => {
      output.write(`${formatEventLine(event)}\n`);
      output.write(`${formatAttackerState(event)}\n`);
      terminal.prompt();
    },
    onError: (error) => {
      output.write(`Error: ${error.message}\n`);
      terminal.prompt();
    },
    onClose: () => {
      output.write('Live stream closed\n');
      terminal.close();
    }
  });

  terminal.onLine((line) => {
    if (line.trim() === '/quit') {
      unsubscribe();
      terminal.close();
      return;
    }

    const command = parseInteractiveCommand(line);
    if (!command) {
      output.write(`Invalid command: ${line}\n`);
      terminal.prompt();
      return;
    }

    output.write(`Command sent: ${command.type}${command.argument ? ` ${command.argument}` : ''}\n`);
    terminal.prompt();
  });

  terminal.onClose(() => {
    unsubscribe();
  });

  terminal.prompt();
}

function createTerminal(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): Terminal {
  const readline = createInterface({ input, output });
  return {
    onLine: (handler) => {
      readline.on('line', handler);
    },
    onClose: (handler) => {
      readline.on('close', handler);
    },
    prompt: () => {
      readline.prompt();
    },
    close: () => {
      readline.close();
    }
  };
}

function formatEventLine(event: ScanLiveEvent): string {
  const detail = typeof event.payload.message === 'string' ? event.payload.message : JSON.stringify(event.payload);
  return `[${event.type}] ${detail}`;
}

function isSupportedCommand(value?: string): value is InteractiveCommandType {
  return value === 'focus' || value === 'skip' || value === 'pause';
}

interface Terminal {
  onLine: (handler: (line: string) => void) => void;
  onClose: (handler: () => void) => void;
  prompt: () => void;
  close: () => void;
}
