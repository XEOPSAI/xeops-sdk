import readline from 'node:readline';
import chalk from 'chalk';
import { XeOpsScannerClient, ScanLiveEvent } from '@xeopsai/sdk';

const INTERACTIVE_COMMANDS = ['focus', 'skip', 'pause', 'resume', 'stop', 'help', 'exit'] as const;
const FINDING_EVENT_TYPE = 'finding';
const DEFAULT_EVENT_TYPE = 'event';

type InteractiveCommand = (typeof INTERACTIVE_COMMANDS)[number];

interface ParsedCommand {
  name: InteractiveCommand;
  args: string[];
}

interface FindingPayload {
  title?: string;
  severity?: string;
  endpoint?: string;
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

  try {
    await consumeInteractiveInput(client, scanId);
  } finally {
    unsubscribe();
  }
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
  const eventType = event.type || DEFAULT_EVENT_TYPE;

  if (eventType === FINDING_EVENT_TYPE) {
    return formatFindingLiveEvent(event.payload as FindingPayload);
  }

  const payload = JSON.stringify(event.payload ?? {});
  return chalk.cyan(`[live] ${eventType}`) + ` ${payload}\n`;
}

/**
 * Formats a finding live event with highlighted severity and endpoint.
 */
export function formatFindingLiveEvent(payload: FindingPayload): string {
  const severity = (payload.severity || 'unknown').toLowerCase();
  const severityLabel = colorizeSeverity(severity);
  const title = payload.title || 'Untitled finding';
  const endpoint = payload.endpoint || 'n/a';

  return `${chalk.magenta('[finding]')} ${severityLabel} ${title} (${endpoint})\n`;
}

/**
 * Validates that command arguments are present when required.
 */
export function validateCommandArguments(command: ParsedCommand): string | null {
  if (command.name === 'focus' && command.args.length === 0) {
    return 'focus requires a target argument';
  }

  if (command.name === 'skip' && command.args.length === 0) {
    return 'skip requires a vulnerability type argument';
  }

  return null;
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

  const argumentError = validateCommandArguments(command);
  if (argumentError) {
    process.stdout.write(chalk.yellow(`${argumentError}\n`));
    return false;
  }

  const payload = buildCommandPayload(command);

  try {
    await client.sendLiveCommand(scanId, command.name, payload);
    process.stdout.write(chalk.green(`Sent command: ${command.name}\n`));
    return false;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown error';
    process.stdout.write(chalk.red(`Command failed: ${message}\n`));
    return false;
  }
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

function colorizeSeverity(severity: string): string {
  if (severity === 'critical') {
    return chalk.redBright(severity.toUpperCase());
  }

  if (severity === 'high') {
    return chalk.red(severity.toUpperCase());
  }

  if (severity === 'medium') {
    return chalk.yellow(severity.toUpperCase());
  }

  if (severity === 'low') {
    return chalk.blue(severity.toUpperCase());
  }

  return chalk.gray(severity.toUpperCase());
}
