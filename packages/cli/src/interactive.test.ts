import { describe, expect, it } from 'vitest';
import { parseInteractiveCommand } from './interactive';

describe('parseInteractiveCommand', () => {
  it('parses valid command with arguments', () => {
    const command = parseInteractiveCommand('focus /admin/users');

    expect(command).toEqual({
      name: 'focus',
      args: ['/admin/users']
    });
  });

  it('parses command case-insensitively', () => {
    const command = parseInteractiveCommand('PAUSE');

    expect(command).toEqual({
      name: 'pause',
      args: []
    });
  });

  it('throws on unsupported command', () => {
    expect(() => parseInteractiveCommand('dance now')).toThrow('Unsupported command: dance');
  });

  it('throws on empty input', () => {
    expect(() => parseInteractiveCommand('   ')).toThrow('Command cannot be empty');
  });
});
