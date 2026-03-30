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

test('project scaffold files exist', () => {
  assert.equal(existsSync(fileUrl('package.json')), true);
  assert.equal(existsSync(fileUrl('tsconfig.json')), true);
  assert.equal(existsSync(fileUrl('next.config.mjs')), true);
  assert.equal(existsSync(fileUrl('src/app/layout.tsx')), true);
});

test('landing page links hero artwork to /innies and renders the placeholder form', () => {
  const pageSource = readSource('src/app/page.tsx');

  assert.ok(pageSource.includes('href="/innies"'));
  assert.ok(pageSource.includes('<LandingHeroHeader'));
  assert.ok(pageSource.includes('<PlaceholderOrgCreationForm'));
});

test('landing header keeps the welcome title and command animation targets', () => {
  const headerSource = readSource('src/components/LandingHeroHeader.tsx');

  assert.ok(headerSource.includes('welcome to innies computer'));
  assert.ok(headerSource.includes("['claude', 'codex', 'openclaw']"));
  assert.ok(headerSource.includes('shirtlessfounder'));
});

test('landing styles preserve the hero and CTA sizing tokens from source', () => {
  const stylesSource = readSource('src/app/page.module.css');

  assert.ok(stylesSource.includes('--hero-frame-width: min(40vw, 500px);'));
  assert.ok(stylesSource.includes('width: calc(var(--hero-frame-width) * 0.76);'));
  assert.ok(stylesSource.includes('height: 48px;'));
  assert.ok(stylesSource.includes('cursor: grab;'));
});
