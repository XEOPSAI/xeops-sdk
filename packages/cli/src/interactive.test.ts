import {
  selectInteractiveFindings,
  normalizeInteractiveCommand,
  renderInteractiveSummary
} from './interactive';

describe('selectInteractiveFindings', () => {
  it('orders findings by severity', () => {
    const findings = selectInteractiveFindings([
      { id: '1', severity: 'low', title: 'Low' },
      { id: '2', severity: 'critical', title: 'Critical' }
    ]);

    expect(findings[0].severity).toBe('critical');
  });

  it('limits output to five findings', () => {
    const findings = Array.from({ length: 8 }, (_, index) => ({
      id: `${index}`,
      severity: 'info' as const,
      title: `finding-${index}`
    }));

    expect(selectInteractiveFindings(findings)).toHaveLength(5);
  });

  it('returns empty array for empty input', () => {
    expect(selectInteractiveFindings([])).toEqual([]);
  });
});

describe('normalizeInteractiveCommand', () => {
  it('normalizes valid commands', () => {
    expect(normalizeInteractiveCommand(' Focus /admin ')).toBe('focus /admin');
  });

  it('accepts pause command', () => {
    expect(normalizeInteractiveCommand('pause')).toBe('pause');
  });

  it('throws for unsupported commands', () => {
    expect(() => normalizeInteractiveCommand('stop')).toThrow('Unsupported command');
  });
});

describe('renderInteractiveSummary', () => {
  it('renders attacker state and findings list', () => {
    const output = renderInteractiveSummary({
      attackerState: 'user',
      findings: [{ id: '2', severity: 'high', title: 'SQLi candidate' }]
    });

    expect(output).toContain('Attacker state: user');
    expect(output).toContain('[high] SQLi candidate');
  });

  it('renders none when no findings are available', () => {
    const output = renderInteractiveSummary({ attackerState: 'anonymous', findings: [] });
    expect(output).toContain('- none');
  });

  it('includes latest command when available', () => {
    const output = renderInteractiveSummary({
      attackerState: 'admin',
      findings: [],
      activeCommand: 'pause'
    });

    expect(output).toContain('Last command: pause');
  });
});
