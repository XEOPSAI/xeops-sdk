/**
 * XeOps Scanner SDK Types
 */

import { ScannerAuthConfig } from './auth';

export interface ScanConfig {
  url: string;
  depth?: number;
  maxPages?: number;
  timeout?: number;
  scanTypes?: string[];
}

export interface ScanRequest {
  targetUrl: string;
  persona?: string;
  config?: ScanConfig;
}

export interface ScanResponse {
  scanId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  message?: string;
}

export type ValidationLevel = 'deterministic' | 'sandbox' | 'llm' | 'unknown';

export interface FindingEvidence {
  summary?: string;
  [key: string]: unknown;
}

export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  cvss_score?: number;
  cwe_id?: string;
  url?: string;
  parameter?: string;
  evidence?: string;
  exploit_poc?: string;
  remediation?: string;
  references?: string[];
  validated?: boolean;
  validation_evidence?: string;
  validation_level?: ValidationLevel;
  reproducer?: string;
  structured_evidence?: FindingEvidence;
}

export interface ScanResult {
  id: string;
  targetUrl: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  currentTest?: string;
  vulnerabilities: Vulnerability[];
  vulnerabilitiesFound: number;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  error?: string;
  metadata?: {
    totalPages?: number;
    totalRequests?: number;
    criticalCount?: number;
    highCount?: number;
    mediumCount?: number;
    lowCount?: number;
    infoCount?: number;
  };
}

export interface ScanGraphNode {
  id: string;
  label: string;
  properties?: Record<string, unknown>;
}

export interface ScanGraphEdge {
  source: string;
  target: string;
  type: string;
  properties?: Record<string, unknown>;
}

export interface ScanGraph {
  nodes: ScanGraphNode[];
  edges: ScanGraphEdge[];
  stats?: Record<string, unknown>;
}

export interface ScanFinding extends Vulnerability {
  validation_level?: ValidationLevel;
  reproducer?: string;
  structured_evidence?: FindingEvidence;
}

export interface ScanLiveEvent {
  type: string;
  timestamp?: string;
  payload: Record<string, unknown>;
}

export interface ScanLiveEventHandlers {
  onEvent: (event: ScanLiveEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface LiveScanOptions {
  /**
   * Explicit transport preference. "auto" currently resolves to WebSocket.
   */
  transport?: 'auto' | 'ws' | 'sse';
}

export interface UsageStats {
  scansUsed: number;
  scansLimit: number;
  scansRemaining: number;
  plan: string;
}

export interface ScannerSDKConfig {
  apiEndpoint: string;
  apiKey?: string;
  auth?: ScannerAuthConfig;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  debug?: boolean;
}

export interface WaitForScanOptions {
  pollingInterval?: number;
  timeout?: number;
  onProgress?: (result: ScanResult) => void;
}

export class ScannerError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ScannerError';
  }
}
