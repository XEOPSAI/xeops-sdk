import { describe, expect, it } from 'vitest';
import {
  formatFindingLiveEvent,
  formatLiveEvent,
  parseInteractiveCommand,
  validateCommandArguments
} from './interactive';

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
  it('formats finding events with severity label', () => {
    const output = formatLiveEvent({
      type: 'finding',
      payload: { severity: 'high', title: 'SQL Injection', endpoint: '/admin' }
    });
    expect(output).toContain('[finding]');
    expect(output).toContain('HIGH');
    expect(output).toContain('SQL Injection');
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

describe('formatFindingLiveEvent', () => {
  it('formats complete finding payload fields', () => {
    const output = formatFindingLiveEvent({
      severity: 'critical',
      title: 'Remote Code Execution',
      endpoint: '/api/v1/exec'
    });

    expect(output).toContain('CRITICAL');
    expect(output).toContain('Remote Code Execution');
    expect(output).toContain('/api/v1/exec');
  });

  it('supports unknown severity values', () => {
    const output = formatFindingLiveEvent({ severity: 'custom' });
    expect(output).toContain('CUSTOM');
  });

  it('uses defaults when payload fields are missing', () => {
    const output = formatFindingLiveEvent({});
    expect(output).toContain('Untitled finding');
    expect(output).toContain('(n/a)');
  });
});

describe('validateCommandArguments', () => {
  it('returns null when focus has target argument', () => {
    const error = validateCommandArguments({ name: 'focus', args: ['/billing'] });
    expect(error).toBeNull();
  });

  it('returns error for skip without vulnerability type', () => {
    const error = validateCommandArguments({ name: 'skip', args: [] });
    expect(error).toBe('skip requires a vulnerability type argument');
  });

  it('returns null for commands that do not require arguments', () => {
    const error = validateCommandArguments({ name: 'pause', args: [] });
    expect(error).toBeNull();
  });
});
