import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function fileUrl(relativePath) {
  return new URL(`../${relativePath}`, import.meta.url);
}

function readSource(relativePath) {
  assert.equal(existsSync(fileUrl(relativePath)), true, `${relativePath} should exist`);
  return readFileSync(fileUrl(relativePath), 'utf8');
}

test('percent v2 scaffold files exist', () => {
  assert.equal(existsSync(fileUrl('src/app/v2/page.tsx')), true);
  assert.equal(existsSync(fileUrl('src/app/v2/layout.tsx')), true);
  assert.equal(existsSync(fileUrl('tailwind.config.js')), true);
  assert.equal(existsSync(fileUrl('postcss.config.mjs')), true);
});

test('v2 route is isolated from the current innies landing page', () => {
  const pageSource = readSource('src/app/v2/page.tsx');

  assert.ok(!pageSource.includes('LandingHeroHeader'));
  assert.ok(!pageSource.includes('LiveSessionsSection'));
});
