import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { XeOpsScannerClient, ScanResult, Vulnerability } from '@xeopsai/sdk';

const POLLING_INTERVAL_MS = 2_000;
const DEFAULT_FOCUS = 'all';
const FOCUS_COMMAND_PREFIX = 'focus ';
const SKIP_COMMAND_PREFIX = 'skip ';
const FOCUS_PREFIX_LENGTH = FOCUS_COMMAND_PREFIX.length;
const SKIP_PREFIX_LENGTH = SKIP_COMMAND_PREFIX.length;
const FINDINGS_RENDER_LIMIT = 20;
const BLESSED_LOG_HEIGHT_PERCENT = '90%';
const BLESSED_INPUT_HEIGHT_PERCENT = '10%';
const SUCCESS_EXIT_CODE = 0;
const FAILURE_EXIT_CODE = 1;

interface BlessedScreenLike {
  append: (node: unknown) => void;
  key: (keys: string[], handler: () => void) => void;
  render: () => void;
}

interface BlessedLogLike {
  log: (line: string) => void;
}

interface BlessedTextboxLike {
  readInput: (callback: (_: unknown, value: string | null) => void) => void;
}

type BlessedLike = {
  screen: (config: Record<string, unknown>) => BlessedScreenLike;
  log: (config: Record<string, unknown>) => BlessedLogLike;
  textbox: (config: Record<string, unknown>) => BlessedTextboxLike;
};

export type InteractiveCommandType = 'focus' | 'skip' | 'pause' | 'resume' | 'help' | 'unknown';

export interface InteractiveCommand {
  type: InteractiveCommandType;
  value?: string;
}

interface InteractiveState {
  isPaused: boolean;
  focus: string;
  skippedTests: Set<string>;
}

/**
 * Parse user input into an interactive command.
 */
export function parseInteractiveCommand(raw: string): InteractiveCommand {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return { type: 'help' };
  if (normalized === 'pause') return { type: 'pause' };
  if (normalized === 'resume') return { type: 'resume' };
  if (normalized === 'help') return { type: 'help' };
  if (normalized.startsWith(FOCUS_COMMAND_PREFIX)) {
    return { type: 'focus', value: normalized.slice(FOCUS_PREFIX_LENGTH).trim() || DEFAULT_FOCUS };
  }
  if (normalized.startsWith(SKIP_COMMAND_PREFIX)) {
    return { type: 'skip', value: normalized.slice(SKIP_PREFIX_LENGTH).trim() };
  }
  return { type: 'unknown', value: raw.trim() };
}

/**
 * Build a compact AttackerState progression line for the terminal UI.
 */
export function buildAttackerStateProgress(result: ScanResult): string {
  const progress = Math.max(0, Math.min(100, result.progress ?? 0));
  const stage = result.currentTest ?? 'Initializing';
  return `AttackerState ${progress}% • ${stage}`;
}

/**
 * Filter findings based on active focus.
 */
export function filterFindings(findings: Vulnerability[], focus: string): Vulnerability[] {
  if (focus === DEFAULT_FOCUS) return findings;
  return findings.filter((item) => item.severity.toLowerCase() === focus);
}

function formatFindingLine(item: Vulnerability): string {
  const validation = item.validation_level ?? 'unknown';
  const location = item.url ?? 'n/a';
  return `[${item.severity.toUpperCase()}] ${item.title} (${validation}) @ ${location}`;
}

function applyCommand(state: InteractiveState, command: InteractiveCommand, writeLine: (line: string) => void): void {
  if (command.type === 'pause') {
    state.isPaused = true;
    writeLine('⏸️ stream paused');
    return;
  }
  if (command.type === 'resume') {
    state.isPaused = false;
    writeLine('▶️ stream resumed');
    return;
  }
  if (command.type === 'focus') {
    state.focus = command.value || DEFAULT_FOCUS;
    writeLine(`🎯 focus=${state.focus}`);
    return;
  }
  if (command.type === 'skip' && command.value) {
    state.skippedTests.add(command.value);
    writeLine(`⏭️ skipped marker registered: ${command.value}`);
    return;
  }
  if (command.type === 'help') {
    writeLine('Commands: focus <severity|all>, skip <test-name>, pause, resume, help');
    return;
  }
  writeLine(`Unknown command: ${command.value ?? 'n/a'}`);
}

function renderFindings(result: ScanResult, state: InteractiveState, writeLine: (line: string) => void): void {
  const visibleFindings = filterFindings(result.vulnerabilities ?? [], state.focus);
  const rendered = visibleFindings.slice(0, FINDINGS_RENDER_LIMIT).map(formatFindingLine);
  writeLine(buildAttackerStateProgress(result));
  rendered.forEach((line) => writeLine(line));
}

async function loadBlessed(): Promise<BlessedLike | null> {
  try {
    const module = await import('blessed');
    return (module.default || module) as BlessedLike;
  } catch {
    return null;
  }
}

/**
 * Run scan in interactive mode with live findings and command input.
 */
export async function runInteractiveScan(client: XeOpsScannerClient, targetUrl: string): Promise<number> {
  const response = await client.startScan({ targetUrl });
  const blessed = await loadBlessed();
  const state: InteractiveState = { isPaused: false, focus: DEFAULT_FOCUS, skippedTests: new Set<string>() };

  if (blessed) {
    return runWithBlessedUi(blessed, client, response.scanId, state);
  }

  return runWithReadline(client, response.scanId, state);
}

async function runWithBlessedUi(
  blessed: BlessedLike,
  client: XeOpsScannerClient,
  scanId: string,
  state: InteractiveState
): Promise<number> {
  const screen = blessed.screen({ smartCSR: true, title: 'XeOps Interactive Scan' });
  const log = blessed.log({
    top: 0,
    left: 0,
    width: '100%',
    height: BLESSED_LOG_HEIGHT_PERCENT,
    border: 'line',
    scrollable: true
  });
  const inputBox = blessed.textbox({
    bottom: 0,
    left: 0,
    width: '100%',
    height: BLESSED_INPUT_HEIGHT_PERCENT,
    border: 'line',
    inputOnFocus: true
  });
  screen.append(log);
  screen.append(inputBox);
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  let status: ScanResult['status'] = 'queued';
  while (status !== 'completed' && status !== 'failed') {
    const command = await Promise.race([readBlessedCommand(inputBox), waitForCycle(POLLING_INTERVAL_MS)]);
    if (command) applyCommand(state, command, (line) => log.log(line));
    if (!state.isPaused) {
      const result = await client.getScanResult(scanId);
      status = result.status;
      renderFindings(result, state, (line) => log.log(line));
      screen.render();
    }
  }

  log.log(`Scan ${scanId} ended with status=${status}`);
  screen.render();
  return status === 'completed' ? SUCCESS_EXIT_CODE : FAILURE_EXIT_CODE;
}

async function runWithReadline(client: XeOpsScannerClient, scanId: string, state: InteractiveState): Promise<number> {
  const rl = readline.createInterface({ input, output });
  let status: ScanResult['status'] = 'queued';

  while (status !== 'completed' && status !== 'failed') {
    const commandInput = await Promise.race([promptCommand(rl), waitForCycle(POLLING_INTERVAL_MS)]);
    if (commandInput) {
      const command = parseInteractiveCommand(commandInput);
      applyCommand(state, command, (line) => output.write(`${line}\n`));
    }

    if (!state.isPaused) {
      const result = await client.getScanResult(scanId);
      status = result.status;
      renderFindings(result, state, (line) => output.write(`${line}\n`));
    }
  }

  rl.close();
  output.write(`Scan ${scanId} ended with status=${status}\n`);
  return status === 'completed' ? SUCCESS_EXIT_CODE : FAILURE_EXIT_CODE;
}

function readBlessedCommand(inputBox: BlessedTextboxLike): Promise<InteractiveCommand> {
  return new Promise((resolve) => {
    inputBox.readInput((_: unknown, value: string | null) => {
      resolve(parseInteractiveCommand(value ?? ''));
    });
  });
}

function promptCommand(rl: readline.Interface): Promise<string | undefined> {
  return rl.question('xeops> ').then((value) => value).catch(() => undefined);
}

function waitForCycle(ms: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), ms));
}
