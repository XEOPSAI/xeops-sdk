import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePublishedVersion, shouldPublish } from './npm_publish_guard.mjs';

test('shouldPublish returns true when package is not published yet', () => {
  assert.equal(shouldPublish('1.2.3', ''), true);
});

test('shouldPublish returns false when published version matches current version', () => {
  assert.equal(shouldPublish('1.2.3', '1.2.3'), false);
});

test('shouldPublish throws when currentVersion is empty', () => {
  assert.throws(() => shouldPublish('', '1.2.2'), /currentVersion is required/);
});

test('normalizePublishedVersion strips quotes from npm output', () => {
  assert.equal(normalizePublishedVersion("'1.4.0'\n"), '1.4.0');
});

test('normalizePublishedVersion returns sentinel when output is blank', () => {
  assert.equal(normalizePublishedVersion('   '), '0.0.0-empty');
});

test('normalizePublishedVersion returns sentinel when output is missing', () => {
  assert.equal(normalizePublishedVersion(undefined), '0.0.0-empty');
});
