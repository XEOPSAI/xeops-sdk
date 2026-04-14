import {
  buildLiveCommandPayload,
  formatLiveEventLine,
  parseInteractiveCommand,
  renderSeveritySummary
} from './interactive';

describe('interactive command parser', () => {
  it('parses focus command with value', () => {
    expect(parseInteractiveCommand('focus /admin')).toEqual({
      type: 'focus',
      value: '/admin'
    });
  });

  it('rejects missing command value for focus and skip', () => {
    expect(() => parseInteractiveCommand('focus')).toThrow('requires a value');
    expect(() => parseInteractiveCommand('skip')).toThrow('requires a value');
  });

  it('parses pause command without value', () => {
    expect(parseInteractiveCommand('pause')).toEqual({ type: 'pause' });
  });
});

describe('interactive payload builder', () => {
  it('creates payload with value', () => {
    expect(buildLiveCommandPayload({ type: 'skip', value: 'xss' })).toEqual({
      command: 'skip',
      value: 'xss'
    });
  });

  it('creates payload without value', () => {
    expect(buildLiveCommandPayload({ type: 'resume' })).toEqual({
      command: 'resume'
    });
  });

  it('returns immutable command shape for stop', () => {
    expect(buildLiveCommandPayload({ type: 'stop' })).toStrictEqual({
      command: 'stop'
    });
  });
});

describe('interactive rendering helpers', () => {
  it('formats finding event line', () => {
    const line = formatLiveEventLine({
      type: 'finding',
      payload: {
        severity: 'high',
        title: 'SQL Injection',
        endpoint: '/search'
      }
    });

    expect(line).toContain('SQL Injection');
    expect(line).toContain('/search');
  });

  it('formats fallback line for unknown events', () => {
    const line = formatLiveEventLine({
      type: 'custom_event',
      payload: { status: 'ok' }
    });

    expect(line).toContain('custom_event');
  });

  it('renders severity summary line', () => {
    const summary = renderSeveritySummary({
      id: 'scan-1',
      targetUrl: 'https://example.com',
      status: 'completed',
      progress: 100,
      vulnerabilities: [],
      vulnerabilitiesFound: 1,
      metadata: {
        criticalCount: 0,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0
      }
    });

    expect(summary).toContain('high:1');
  });
});
