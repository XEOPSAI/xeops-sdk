import { beforeEach, describe, expect, it, vi } from 'vitest';
import { XeOpsScannerClient } from './client';

const postMock = vi.fn();

vi.mock('axios', () => {
  const create = vi.fn(() => ({
    post: postMock,
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }));

  return {
    default: {
      create,
      isAxiosError: vi.fn(() => false)
    },
    create,
    isAxiosError: vi.fn(() => false)
  };
});

describe('sendScanCommand', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('sends command payload to scan commands endpoint', async () => {
    postMock.mockResolvedValue({});

    const client = new XeOpsScannerClient({
      apiEndpoint: 'https://scanner.example.com',
      apiKey: 'test-key'
    });

    await client.sendScanCommand('scan-123', { command: 'pause' });

    expect(postMock).toHaveBeenCalledWith('/api/scans/scan-123/commands', {
      command: 'pause'
    });
  });

  it('accepts command payload with additional context', async () => {
    postMock.mockResolvedValue({});

    const client = new XeOpsScannerClient({
      apiEndpoint: 'https://scanner.example.com',
      apiKey: 'test-key'
    });

    await client.sendScanCommand('scan-xyz', { command: 'focus', value: '/admin' });

    expect(postMock).toHaveBeenCalledWith('/api/scans/scan-xyz/commands', {
      command: 'focus',
      value: '/admin'
    });
  });

  it('wraps transport errors in ScannerError', async () => {
    postMock.mockRejectedValue(new Error('transport down'));

    const client = new XeOpsScannerClient({
      apiEndpoint: 'https://scanner.example.com',
      apiKey: 'test-key'
    });

    await expect(client.sendScanCommand('scan-err', { command: 'stop' })).rejects.toThrow(
      'Failed to send scan command'
    );
  });
});
