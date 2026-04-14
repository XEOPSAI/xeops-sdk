export interface InteractiveFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
}

export interface InteractiveState {
  attackerState: string;
  findings: InteractiveFinding[];
  activeCommand?: string;
}

const MAX_FINDINGS_PREVIEW = 5;

/**
 * Keep only the most severe findings for terminal preview.
 */
export function selectInteractiveFindings(findings: InteractiveFinding[]): InteractiveFinding[] {
  const severityRank: Record<InteractiveFinding['severity'], number> = {
    critical: 5,
    high: 4,
    medium: 3,
    low: 2,
    info: 1
  };

  return [...findings]
    .sort((left, right) => severityRank[right.severity] - severityRank[left.severity])
    .slice(0, MAX_FINDINGS_PREVIEW);
}

/**
 * Normalize interactive commands accepted from terminal input.
 */
export function normalizeInteractiveCommand(value: string): string {
  const normalized = value.trim().toLowerCase();
  const validPrefixes = ['focus', 'skip', 'pause', 'resume'];

  if (validPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return normalized;
  }

  throw new Error('Unsupported command. Allowed: focus, skip, pause, resume');
}

/**
 * Render a compact, text-only interactive dashboard view.
 */
export function renderInteractiveSummary(state: InteractiveState): string {
  const findings = selectInteractiveFindings(state.findings);
  const findingsText = findings.length
    ? findings.map((finding) => `- [${finding.severity}] ${finding.title}`).join('\n')
    : '- none';

  const commandText = state.activeCommand ? `\nLast command: ${state.activeCommand}` : '';

  return `Attacker state: ${state.attackerState}\nTop findings:\n${findingsText}${commandText}`;
}
