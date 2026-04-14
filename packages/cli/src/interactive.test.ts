import { runInteractiveScan } from './interactive';

describe('interactive scan runner', () => {
  it('streams progress and returns completed result', async () => {
    const lines: string[] = [];
    const fakeClient = {
      startScan: async () => ({ scanId: 'scan-1', status: 'queued' }),
      subscribeToScanEvents: (_scanId: string, handlers: any) => {
        handlers.onOpen?.();
        handlers.onEvent?.({ type: 'finding', payload: { severity: 'high' } });
        return () => undefined;
      },
      waitForScanCompletion: async (_scanId: string, options: any) => {
        options.onProgress?.({
          id: 'scan-1',
          targetUrl: 'https://example.com',
          status: 'running',
          progress: 40,
          currentTest: 'sql-injection',
          vulnerabilities: [],
          vulnerabilitiesFound: 1
        });
        return {
          id: 'scan-1',
          targetUrl: 'https://example.com',
          status: 'completed',
          progress: 100,
          vulnerabilities: [],
          vulnerabilitiesFound: 1
        };
      }
    };

    const result = await runInteractiveScan(fakeClient as any, {
      url: 'https://example.com',
      onOutput: (line) => lines.push(line),
      createInterface: () => ({ on: () => undefined, close: () => undefined }) as any
    });

    expect(result.status).toBe('completed');
    expect(lines.some((line) => line.includes('Progress 40%'))).toBe(true);
  });

  it('rejects unsupported commands', async () => {
    const lines: string[] = [];
    const listeners: Record<string, (line: string) => Promise<void>> = {};
    const fakeClient = {
      startScan: async () => ({ scanId: 'scan-2', status: 'queued' }),
      subscribeToScanEvents: () => () => undefined,
      waitForScanCompletion: async () => ({
        id: 'scan-2',
        targetUrl: 'https://example.com',
        status: 'completed',
        progress: 100,
        vulnerabilities: [],
        vulnerabilitiesFound: 0
      })
    };

    await runInteractiveScan(fakeClient as any, {
      url: 'https://example.com',
      onOutput: (line) => lines.push(line),
      createInterface: () => ({
        on: (event: string, cb: (line: string) => Promise<void>) => {
          listeners[event] = cb;
        },
        close: () => undefined
      }) as any
    });

    await listeners.line?.('invalid-command');
    expect(lines.some((line) => line.includes('Unsupported command'))).toBe(true);
  });

  it('forwards supported commands to custom handler', async () => {
    const received: string[] = [];
    const listeners: Record<string, (line: string) => Promise<void>> = {};
    const fakeClient = {
      startScan: async () => ({ scanId: 'scan-3', status: 'queued' }),
      subscribeToScanEvents: () => () => undefined,
      waitForScanCompletion: async () => ({
        id: 'scan-3',
        targetUrl: 'https://example.com',
        status: 'completed',
        progress: 100,
        vulnerabilities: [],
        vulnerabilitiesFound: 0
      })
    };

    await runInteractiveScan(fakeClient as any, {
      url: 'https://example.com',
      onCommand: async (command, args) => {
        received.push(`${command}:${args.join(',')}`);
      },
      createInterface: () => ({
        on: (event: string, cb: (line: string) => Promise<void>) => {
          listeners[event] = cb;
        },
        close: () => undefined
      }) as any
    });

    await listeners.line?.('focus auth');
    expect(received).toEqual(['focus:auth']);
  });
});
