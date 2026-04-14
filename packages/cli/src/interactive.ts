import readline from 'node:readline';
import chalk from 'chalk';
import { XeOpsScannerClient, ScanLiveEvent } from '@xeopsai/sdk';

const INTERACTIVE_COMMANDS = ['focus', 'skip', 'pause', 'resume', 'stop', 'help', 'exit'] as const;

type InteractiveCommand = (typeof INTERACTIVE_COMMANDS)[number];

interface ParsedCommand {
  name: InteractiveCommand;
  args: string[];
}

export interface InteractiveScanOptions {
  url: string;
}

/**
 * Runs an interactive scan session with live events and terminal commands.
 */
export async function runInteractiveScan(
  client: XeOpsScannerClient,
  options: InteractiveScanOptions
): Promise<void> {
  const response = await client.startScan({ targetUrl: options.url });
  const scanId = response.scanId;

  process.stdout.write(chalk.blue(`Interactive scan started: ${scanId}\n`));
  process.stdout.write(chalk.gray('Commands: focus <target>, skip <type>, pause, resume, stop, exit\n'));

  const unsubscribe = client.subscribeToScanEvents(scanId, {
    onEvent: (event) => process.stdout.write(formatLiveEvent(event)),
    onError: (error) => process.stdout.write(chalk.red(`Live stream error: ${error.message}\n`))
  });

  await consumeInteractiveInput(client, scanId);
  unsubscribe();
}

/**
 * Parses user command input from interactive mode.
 */
export function parseInteractiveCommand(input: string): ParsedCommand | null {
  const [rawName, ...args] = input.trim().split(/\s+/);
  if (!rawName) {
    return null;
  }

  const name = rawName.toLowerCase() as InteractiveCommand;
  if (!INTERACTIVE_COMMANDS.includes(name)) {
    return null;
  }

  return { name, args };
}

/**
 * Formats a live event line for terminal display.
 */
export function formatLiveEvent(event: ScanLiveEvent): string {
  const eventType = event.type || 'event';
  const payload = JSON.stringify(event.payload ?? {});
  return chalk.cyan(`[live] ${eventType}`) + ` ${payload}\n`;
}

async function consumeInteractiveInput(client: XeOpsScannerClient, scanId: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  for await (const line of rl) {
    const parsed = parseInteractiveCommand(line);
    if (!parsed) {
      process.stdout.write(chalk.yellow('Unknown command. Type help for usage.\n'));
      continue;
    }

    const shouldExit = await executeInteractiveCommand(client, scanId, parsed);
    if (shouldExit) {
      rl.close();
      return;
    }
  }
}

async function executeInteractiveCommand(
  client: XeOpsScannerClient,
  scanId: string,
  command: ParsedCommand
): Promise<boolean> {
  if (command.name === 'help') {
    process.stdout.write(chalk.gray('focus <target> | skip <type> | pause | resume | stop | exit\n'));
    return false;
  }

  if (command.name === 'exit') {
    process.stdout.write(chalk.gray('Closing interactive mode.\n'));
    return true;
  }

  const payload = buildCommandPayload(command);
  const liveCommand = command.name === 'stop' ? 'stop' : command.name;
  await client.sendLiveCommand(scanId, liveCommand, payload);
  process.stdout.write(chalk.green(`Sent command: ${command.name}\n`));
  return false;
}

function buildCommandPayload(command: ParsedCommand): Record<string, unknown> {
  if (command.name === 'focus') {
    return { target: command.args.join(' ') };
  }

  if (command.name === 'skip') {
    return { vulnType: command.args[0] };
  }

  return {};
}
