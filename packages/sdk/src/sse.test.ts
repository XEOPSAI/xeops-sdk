import { describe, expect, it, vi } from 'vitest';
import { XeOpsSseClient } from './sse';

describe('XeOpsSseClient', () => {
  it('forwards parsed events to onEvent handler', () => {
    const source = createFakeEventSource();
    const EventSourceCtor = vi.fn().mockImplementation(() => source.instance);
    const client = new XeOpsSseClient({ apiEndpoint: 'https://api.example.com' }, EventSourceCtor);
    const onEvent = vi.fn();

    client.subscribeToScanEvents('scan-1', {
      onEvent
    });

    source.instance.onmessage?.({ data: JSON.stringify({ type: 'scan.progress', payload: { progress: 50 } }) });

    expect(EventSourceCtor).toHaveBeenCalledWith('https://api.example.com/api/scans/scan-1/live');
    expect(onEvent).toHaveBeenCalledWith({
      type: 'scan.progress',
      payload: { progress: 50 }
    });
  });

  it('ignores malformed events', () => {
    const source = createFakeEventSource();
    const client = new XeOpsSseClient(
      { apiEndpoint: 'https://api.example.com/' },
      vi.fn().mockImplementation(() => source.instance)
    );
    const onEvent = vi.fn();

    client.subscribeToScanEvents('scan-1', {
      onEvent
    });

    source.instance.onmessage?.({ data: 'not-json' });
    source.instance.onmessage?.({ data: JSON.stringify({ payload: {} }) });

    expect(onEvent).not.toHaveBeenCalled();
  });

  it('calls onClose when unsubscribe is invoked', () => {
    const source = createFakeEventSource();
    const onClose = vi.fn();
    const client = new XeOpsSseClient(
      { apiEndpoint: 'https://api.example.com/' },
      vi.fn().mockImplementation(() => source.instance)
    );

    const unsubscribe = client.subscribeToScanEvents('scan-1', {
      onEvent: vi.fn(),
      onClose
    });

    unsubscribe();

    expect(source.close).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });
});

function createFakeEventSource(): {
  close: ReturnType<typeof vi.fn>;
  instance: {
    onopen: (() => void) | null;
    onerror: ((event: unknown) => void) | null;
    onmessage: ((event: { data: string }) => void) | null;
    close: () => void;
  };
} {
  const close = vi.fn();
  return {
    close,
    instance: {
      onopen: null,
      onerror: null,
      onmessage: null,
      close
    }
  };
}
