import { describe, expect, it } from 'vitest';
import { formatAttackerProgress, parseInteractiveCommand, renderLiveEvent } from './interactive';

describe('parseInteractiveCommand', () => {
  it('parses focus commands with targets', () => {
    expect(parseInteractiveCommand('focus /admin/login')).toEqual({
      type: 'focus',
      value: '/admin/login'
    });
  });

  it('rejects focus commands without target', () => {
    expect(parseInteractiveCommand('focus')).toBeNull();
  });

  it('parses simple control commands', () => {
    expect(parseInteractiveCommand('pause')).toEqual({ type: 'pause' });
  });
});

describe('formatAttackerProgress', () => {
  it('formats attacker progression details', () => {
    expect(
      formatAttackerProgress({
        phase: 'enumeration',
        hypothesesTested: 4,
        findingsConfirmed: 1
      })
    ).toContain('phase=enumeration');
  });

  it('uses defaults for missing numeric fields', () => {
    expect(formatAttackerProgress({ phase: 'pivot' })).toContain('hypotheses=0');
  });

  it('uses unknown phase when absent', () => {
    expect(formatAttackerProgress({ findingsConfirmed: 2 })).toContain('phase=unknown');
  });
});

describe('renderLiveEvent', () => {
  it('renders finding events with severity and title', () => {
    expect(
      renderLiveEvent({
        type: 'finding',
        payload: { title: 'SQL injection', severity: 'high' }
      })
    ).toContain('[high] SQL injection');
  });

  it('renders attacker events using attacker formatter', () => {
    expect(
      renderLiveEvent({
        type: 'attacker_escalation',
        payload: { phase: 'exploit' }
      })
    ).toContain('AttackerState');
  });

  it('renders generic events for unknown types', () => {
    expect(renderLiveEvent({ type: 'phase_change', payload: {} })).toBe('Event: phase_change');
  });
});
