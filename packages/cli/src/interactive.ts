import readline from 'node:readline';
import chalk from 'chalk';

export type InteractiveCommandType = 'focus' | 'skip' | 'pause' | 'resume' | 'stop' | 'help' | 'quit';

export interface InteractiveCommand {
  type: InteractiveCommandType;
  value?: string;
}

export interface InteractiveSessionHandlers {
  onCommand: (command: InteractiveCommand) => Promise<void>;
  onQuit: () => void;
}

/**
 * Parse user input into a structured interactive command.
 */
export function parseInteractiveCommand(input: string): InteractiveCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Command cannot be empty');
  }

  const [rawAction, ...args] = trimmed.split(/\s+/);
  const action = rawAction.toLowerCase();

  if (action === 'help') {
    return { type: 'help' };
  }

  if (action === 'quit' || action === 'exit') {
    return { type: 'quit' };
  }

  if (action === 'pause' || action === 'resume' || action === 'stop') {
    return { type: action };
  }

  if ((action === 'focus' || action === 'skip') && args.length > 0) {
    return { type: action, value: args.join(' ') };
  }

  throw new Error(`Unsupported command: ${input}`);
}

/**
 * Build the payload sent to the API gateway for live scan commands.
 */
export function toCommandPayload(command: InteractiveCommand): Record<string, string> {
  if (command.type === 'focus' || command.type === 'skip') {
    if (!command.value) {
      throw new Error(`${command.type} requires a value`);
    }

    return { command: command.type, value: command.value };
  }

  if (command.type === 'pause' || command.type === 'resume' || command.type === 'stop') {
    return { command: command.type };
  }

  throw new Error(`Cannot build payload for command: ${command.type}`);
}

/**
 * Start the interactive terminal prompt used by xeops-scan --interactive.
 */
export function startInteractiveSession(handlers: InteractiveSessionHandlers): readline.Interface {
  const session = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('xeops> ')
  });

  session.on('line', async (line: string) => {
    await handleLineInput(line, handlers, session);
  });

  session.on('close', () => {
    handlers.onQuit();
  });

  printInteractiveHelp();
  session.prompt();
  return session;
}

async function handleLineInput(
  line: string,
  handlers: InteractiveSessionHandlers,
  session: readline.Interface
): Promise<void> {
  try {
    const command = parseInteractiveCommand(line);
    if (command.type === 'help') {
      printInteractiveHelp();
      session.prompt();
      return;
    }

    if (command.type === 'quit') {
      session.close();
      return;
    }

    await handlers.onCommand(command);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown command error';
    process.stderr.write(`${chalk.red(message)}\n`);
  }

  session.prompt();
}

function printInteractiveHelp(): void {
  process.stdout.write(`${chalk.blue('Interactive commands:')}\n`);
  process.stdout.write('  focus <endpoint|path>  - focus scan on a specific path\n');
  process.stdout.write('  skip <vuln_type>       - skip a vulnerability type\n');
  process.stdout.write('  pause                  - pause active scan\n');
  process.stdout.write('  resume                 - resume paused scan\n');
  process.stdout.write('  stop                   - stop active scan\n');
  process.stdout.write('  help                   - show this help\n');
  process.stdout.write('  quit                   - exit interactive mode\n\n');
}
