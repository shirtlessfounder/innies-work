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

test('percent v2 assets and layout font wiring exist', () => {
  const layoutSource = readSource('src/app/v2/layout.tsx');

  assert.ok(layoutSource.includes('localFont'));
  assert.ok(layoutSource.includes('percent-v2/fonts/Rinter.ttf'));
  assert.equal(existsSync(fileUrl('public/percent-v2/long-logo.svg')), true);
  assert.equal(existsSync(fileUrl('public/percent-v2/solana-logo.jpg')), true);
  assert.equal(existsSync(fileUrl('public/percent-v2/zc-logo.jpg')), true);
});

test('percent v2 header preserves source branding and links', () => {
  const headerSource = readSource('src/components/percentV2/Header.tsx');

  assert.ok(headerSource.includes('/percent-v2/long-logo.svg'));
  assert.ok(headerSource.includes('https://www.zcombinator.io/presale/zcQPTGhdiTMFM6erwko2DWBTkN8nCnAGM7MUX9RpERC'));
  assert.ok(headerSource.includes('https://docs.percent.markets/'));
  assert.ok(headerSource.includes('http://discord.gg/zcombinator'));
  assert.ok(headerSource.includes('https://x.com/percentmarkets'));
});
