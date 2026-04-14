import {
  createWebhookSignature,
  verifyWebhookSignature,
  parseWebhookEvent,
  XeOpsWebhookEvent
} from './webhooks';

const SECRET = 'test-secret';

describe('createWebhookSignature', () => {
  it('returns deterministic signature for same input', () => {
    const body = JSON.stringify({ hello: 'world' });
    const first = createWebhookSignature(SECRET, body);
    const second = createWebhookSignature(SECRET, body);
    expect(first).toEqual(second);
  });

  it('changes signature when payload changes', () => {
    const first = createWebhookSignature(SECRET, JSON.stringify({ id: 1 }));
    const second = createWebhookSignature(SECRET, JSON.stringify({ id: 2 }));
    expect(first).not.toEqual(second);
  });

  it('returns a hex digest', () => {
    const signature = createWebhookSignature(SECRET, '{}');
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('verifyWebhookSignature', () => {
  it('returns true for valid signature', () => {
    const body = JSON.stringify({ event: 'scan_complete' });
    const signature = createWebhookSignature(SECRET, body);
    expect(verifyWebhookSignature(SECRET, body, signature)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const body = JSON.stringify({ event: 'scan_complete' });
    expect(verifyWebhookSignature(SECRET, body, 'invalid')).toBe(false);
  });

  it('returns false for missing signature', () => {
    expect(verifyWebhookSignature(SECRET, '{}', '')).toBe(false);
  });
});

describe('parseWebhookEvent', () => {
  it('parses a valid event payload', () => {
    const raw = JSON.stringify({
      type: 'finding_confirmed',
      timestamp: '2026-04-14T00:00:00Z',
      payload: { scanId: 'scan-1' }
    });

    const event = parseWebhookEvent<{ scanId: string }>(raw);
    expect(event.type).toBe('finding_confirmed');
    expect(event.payload.scanId).toBe('scan-1');
  });

  it('throws when JSON is invalid', () => {
    expect(() => parseWebhookEvent('not-json')).toThrow('not valid JSON');
  });

  it('throws when payload shape is invalid', () => {
    const raw = JSON.stringify({ type: '', payload: null });
    expect(() => parseWebhookEvent<XeOpsWebhookEvent>(raw)).toThrow('missing event type');
  });
});
