import { ScanLiveEvent, ScanLiveEventHandlers, ScannerError, ScannerSDKConfig } from './types';

interface EventSourceLike {
  onopen: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  close: () => void;
}

interface EventSourceConstructor {
  new (url: string): EventSourceLike;
}

/**
 * SSE transport dedicated to scan live events.
 */
export class XeOpsSseClient {
  private readonly endpoint: string;
  private readonly eventSourceCtor?: EventSourceConstructor;

  constructor(config: Pick<ScannerSDKConfig, 'apiEndpoint'>, eventSourceCtor?: EventSourceConstructor) {
    this.endpoint = config.apiEndpoint.replace(/\/$/, '');
    this.eventSourceCtor = eventSourceCtor ?? ((globalThis as { EventSource?: EventSourceConstructor }).EventSource);
  }

  /**
   * Subscribe to live scan events using EventSource only.
   */
  subscribeToScanEvents(scanId: string, handlers: ScanLiveEventHandlers): () => void {
    if (!this.eventSourceCtor) {
      throw new ScannerError('EventSource transport is not available in this runtime');
    }

    const source = new this.eventSourceCtor(this.buildSseUrl(scanId));

    source.onopen = () => {
      handlers.onOpen?.();
    };

    source.onerror = () => {
      handlers.onError?.(new ScannerError('Live scan EventSource connection error'));
    };

    source.onmessage = (event) => {
      const parsed = this.parseEvent(event.data);
      if (parsed) {
        handlers.onEvent(parsed);
      }
    };

    return () => {
      source.close();
      handlers.onClose?.();
    };
  }

  private buildSseUrl(scanId: string): string {
    return `${this.endpoint}/api/scans/${scanId}/live`;
  }

  private parseEvent(raw: string): ScanLiveEvent | null {
    try {
      const parsed = JSON.parse(raw) as ScanLiveEvent;
      if (!parsed || typeof parsed.type !== 'string') {
        return null;
      }

      if (!parsed.payload || typeof parsed.payload !== 'object') {
        parsed.payload = {};
      }

      return parsed;
    } catch {
      return null;
    }
  }
}
