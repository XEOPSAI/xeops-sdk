import { createHmac, timingSafeEqual } from 'crypto';

export interface XeOpsWebhookEvent<TPayload = Record<string, unknown>> {
  type: string;
  timestamp?: string;
  payload: TPayload;
}

const ENCODING = 'utf8';

/**
 * Generate an HMAC-SHA256 signature for a raw webhook payload.
 */
export function createWebhookSignature(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody, ENCODING).digest('hex');
}

/**
 * Verify a webhook signature using timing-safe comparison.
 */
export function verifyWebhookSignature(
  secret: string,
  rawBody: string,
  providedSignature: string
): boolean {
  if (!providedSignature) {
    return false;
  }

  const expectedSignature = createWebhookSignature(secret, rawBody);
  const expectedBuffer = Buffer.from(expectedSignature, ENCODING);
  const providedBuffer = Buffer.from(providedSignature, ENCODING);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * Parse and validate a webhook payload into a typed XeOps event.
 */
export function parseWebhookEvent<TPayload = Record<string, unknown>>(
  rawBody: string
): XeOpsWebhookEvent<TPayload> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new Error('Invalid webhook payload: body is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid webhook payload: expected object');
  }

  const candidate = parsed as { type?: unknown; payload?: unknown; timestamp?: unknown };

  if (typeof candidate.type !== 'string' || candidate.type.length === 0) {
    throw new Error('Invalid webhook payload: missing event type');
  }

  if (!candidate.payload || typeof candidate.payload !== 'object') {
    throw new Error('Invalid webhook payload: payload must be an object');
  }

  if (candidate.timestamp && typeof candidate.timestamp !== 'string') {
    throw new Error('Invalid webhook payload: timestamp must be a string');
  }

  return {
    type: candidate.type,
    timestamp: candidate.timestamp as string | undefined,
    payload: candidate.payload as TPayload
  };
}
