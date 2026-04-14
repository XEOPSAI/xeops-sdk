import { describe, expect, it } from 'vitest';
import { formatLiveEvent, parseInteractiveCommand } from './interactive';

describe('parseInteractiveCommand', () => {
  it('parses focus command with arguments', () => {
    expect(parseInteractiveCommand('focus /admin/users')).toEqual({
      name: 'focus',
      args: ['/admin/users']
    });
  });

  it('returns null for unsupported commands', () => {
    expect(parseInteractiveCommand('unknown value')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(parseInteractiveCommand('   ')).toBeNull();
  });
});

describe('formatLiveEvent', () => {
  it('formats event type and payload in output string', () => {
    const output = formatLiveEvent({ type: 'finding', payload: { severity: 'high' } });
    expect(output).toContain('finding');
    expect(output).toContain('"severity":"high"');
  });

  it('falls back to "event" when type is missing', () => {
    const output = formatLiveEvent({ type: '', payload: {} });
    expect(output).toContain('event');
  });

  it('handles missing payload values', () => {
    const output = formatLiveEvent({ type: 'scan.update', payload: undefined as any });
    expect(output).toContain('{}');
  });
});
