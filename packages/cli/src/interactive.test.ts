import { describe, expect, it } from 'vitest';
import { formatAttackerState, parseInteractiveCommand } from './interactive';

describe('parseInteractiveCommand', () => {
  it('parses a focus command with argument', () => {
    const parsed = parseInteractiveCommand('/focus /admin');

    expect(parsed).toEqual({ type: 'focus', argument: '/admin' });
  });

  it('accepts a command without argument', () => {
    const parsed = parseInteractiveCommand('/skip');

    expect(parsed).toEqual({ type: 'skip' });
  });

  it('returns null for unsupported command', () => {
    const parsed = parseInteractiveCommand('/invalid now');

    expect(parsed).toBeNull();
  });
});

describe('formatAttackerState', () => {
  it('formats phase and progression when available', () => {
    const line = formatAttackerState({
      type: 'attacker.progress',
      payload: {
        attackerState: {
          phase: 'recon',
          step: 2,
          totalSteps: 5
        }
      }
    });

    expect(line).toBe('AttackerState: recon (2/5)');
  });

  it('returns unknown defaults for partial attacker state', () => {
    const line = formatAttackerState({
      type: 'attacker.progress',
      payload: {
        attackerState: {
          phase: 'unknown'
        }
      }
    });

    expect(line).toBe('AttackerState: unknown (0/0)');
  });

  it('returns n/a when attacker state is missing', () => {
    const line = formatAttackerState({
      type: 'attacker.progress',
      payload: {}
    });

    expect(line).toBe('AttackerState: n/a');
  });
});
