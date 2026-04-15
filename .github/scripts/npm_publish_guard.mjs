const EMPTY_VERSION = '0.0.0-empty';

/**
 * Parses npm view output and returns true when publishing should proceed.
 * @param {string} currentVersion
 * @param {string} publishedVersion
 * @returns {boolean}
 */
export function shouldPublish(currentVersion, publishedVersion) {
  if (!currentVersion || currentVersion.trim().length === 0) {
    throw new Error('currentVersion is required');
  }

  const normalizedPublishedVersion = normalizePublishedVersion(publishedVersion);
  if (normalizedPublishedVersion === EMPTY_VERSION) {
    return true;
  }

  return currentVersion.trim() !== normalizedPublishedVersion;
}

/**
 * Normalizes npm view command output to a comparable version string.
 * @param {string} rawOutput
 * @returns {string}
 */
export function normalizePublishedVersion(rawOutput) {
  if (!rawOutput) {
    return EMPTY_VERSION;
  }

  const normalized = rawOutput.trim().replaceAll("'", '');
  return normalized.length > 0 ? normalized : EMPTY_VERSION;
}

async function main() {
  const currentVersion = process.argv[2];
  const publishedVersion = process.argv[3];

  const publish = shouldPublish(currentVersion, publishedVersion);
  process.stdout.write(publish ? 'true\n' : 'false\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
