export function normalizeApiKey(apiKey: string): string {
  return apiKey.trim();
}

export function buildAuthHeader(apiKey: string): string {
  const normalized = normalizeApiKey(apiKey);

  if (!normalized) {
    throw new Error('API key is required');
  }

  return `Bearer ${normalized}`;
}
