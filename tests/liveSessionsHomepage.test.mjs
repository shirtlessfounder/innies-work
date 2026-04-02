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

test('homepage mounts a live sessions section below the hero', () => {
  const pageSource = readSource('src/app/page.tsx');

  assert.ok(pageSource.includes("import { LiveSessionsSection } from '../components/live/LiveSessionsSection';"));
  assert.ok(pageSource.includes('<LandingHeroHeader'));
  assert.ok(pageSource.includes('<LiveSessionsSection />'));
});

test('live sessions section polls the public feed and exposes featured plus overflow states', () => {
  const sectionSource = readSource('src/components/live/LiveSessionsSection.tsx');
  const feedSource = readSource('src/lib/liveSessions/publicFeed.ts');

  assert.ok(sectionSource.includes('30_000'));
  assert.ok(sectionSource.includes('more active sessions'));
  assert.ok(sectionSource.includes('no active innies right now'));
  assert.ok(sectionSource.includes('featuredSessions'));
  assert.ok(sectionSource.includes('overflowSessions'));
  assert.ok(feedSource.includes('/v1/public/innies/live-sessions'));
  assert.ok(feedSource.includes('NEXT_PUBLIC_INNIES_API_BASE_URL'));
});

test('live session panel narrows the public transcript to user and assistant rows and follows the latest message by default', () => {
  const panelSource = readSource('src/components/live/LiveSessionPanel.tsx');
  const stylesSource = readSource('src/components/live/liveSessions.module.css');
  const feedSource = readSource('src/lib/liveSessions/publicFeed.ts');

  assert.ok(panelSource.includes("'assistant_final'"));
  assert.ok(panelSource.includes("'use client'"));
  assert.ok(panelSource.includes('scrollTop = panelBody.scrollHeight'));
  assert.ok(panelSource.includes('onScroll={handlePanelBodyScroll}'));
  assert.ok(!feedSource.includes("'tool_call'"));
  assert.ok(!feedSource.includes("'tool_result'"));
  assert.ok(!feedSource.includes("'provider_switch'"));
  assert.ok(stylesSource.includes('.panelBody'));
  assert.ok(stylesSource.includes('overflow: auto;'));
});
