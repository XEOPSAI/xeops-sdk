import { describe, expect, it } from 'vitest';
import { buildAttackerStateProgress, filterFindings, parseInteractiveCommand } from './interactive';

const STANDARD_PROGRESS = 45;
const NEGATIVE_PROGRESS = -10;
const QUEUED_PROGRESS = 10;
const FINDING_TOTAL = 2;
const HIGH_ONLY_COUNT = 1;

describe('parseInteractiveCommand', () => {
  it('parses focus command with a severity', () => {
    const command = parseInteractiveCommand('focus high');
    expect(command).toEqual({ type: 'focus', value: 'high' });
  });

  it('returns help command for empty input', () => {
    const command = parseInteractiveCommand('   ');
    expect(command).toEqual({ type: 'help' });
  });

  it('marks unknown command as unknown', () => {
    const command = parseInteractiveCommand('launch');
    expect(command).toEqual({ type: 'unknown', value: 'launch' });
  });
});

describe('buildAttackerStateProgress', () => {
  it('renders progress and stage for standard results', () => {
    const line = buildAttackerStateProgress({
      progress: STANDARD_PROGRESS,
      currentTest: 'SQL injection',
      status: 'running',
      vulnerabilities: [],
      vulnerabilitiesFound: 0,
      id: 'scan-1',
      targetUrl: 'https://example.com'
    });

    expect(line).toContain(`${STANDARD_PROGRESS}%`);
    expect(line).toContain('SQL injection');
  });

  it('clamps negative progress to zero', () => {
    const line = buildAttackerStateProgress({
      progress: NEGATIVE_PROGRESS,
      status: 'queued',
      vulnerabilities: [],
      vulnerabilitiesFound: 0,
      id: 'scan-2',
      targetUrl: 'https://example.com'
    });

    expect(line).toContain('0%');
  });

  it('falls back to initializing stage when current test is missing', () => {
    const line = buildAttackerStateProgress({
      progress: QUEUED_PROGRESS,
      status: 'queued',
      vulnerabilities: [],
      vulnerabilitiesFound: 0,
      id: 'scan-3',
      targetUrl: 'https://example.com'
    });

    expect(line).toContain('Initializing');
  });
});

describe('filterFindings', () => {
  const findings = [
    { id: '1', title: 'A', description: 'A', severity: 'high', category: 'cat' },
    { id: '2', title: 'B', description: 'B', severity: 'low', category: 'cat' }
  ];

  it('returns all findings when focus is all', () => {
    expect(filterFindings(findings, 'all')).toHaveLength(FINDING_TOTAL);
  });

  it('returns focused findings on edge case with one match', () => {
    const filtered = filterFindings(findings, 'high');
    expect(filtered).toHaveLength(HIGH_ONLY_COUNT);
    expect(filtered[0].id).toBe('1');
  });

  it('returns empty array when no severity matches', () => {
    expect(filterFindings(findings, 'critical')).toEqual([]);
  });
});
