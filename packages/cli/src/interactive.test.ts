import { parseInteractiveCommand, toCommandPayload } from './interactive';

describe('interactive command parser', () => {
  it('parses a focus command', () => {
    expect(parseInteractiveCommand('focus /admin')).toEqual({
      type: 'focus',
      value: '/admin'
    });
  });

  it('parses a pause command without value', () => {
    expect(parseInteractiveCommand('pause')).toEqual({ type: 'pause' });
  });

  it('rejects unsupported commands', () => {
    expect(() => parseInteractiveCommand('dance now')).toThrow('Unsupported command');
  });
});

describe('interactive command payload builder', () => {
  it('builds payload for focus commands', () => {
    expect(toCommandPayload({ type: 'focus', value: '/checkout' })).toEqual({
      command: 'focus',
      value: '/checkout'
    });
  });

  it('builds payload for stop command', () => {
    expect(toCommandPayload({ type: 'stop' })).toEqual({
      command: 'stop'
    });
  });

  it('throws when required values are missing', () => {
    expect(() => toCommandPayload({ type: 'skip' })).toThrow('skip requires a value');
  });
});
