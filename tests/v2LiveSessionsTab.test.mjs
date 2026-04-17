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

test('v2 live tab mounts the live cli sessions carousel plus archive trail panel', () => {
  const tabContentSource = readSource('src/components/vscodeV2/TabContent.tsx');
  const liveTabSource = readSource('src/components/live/InniesV2LiveSessionsTab.tsx');
  const carouselSource = readSource('src/components/live/LiveSessionsCarousel.tsx');
  const archivePanelSource = readSource('src/components/live/ArchiveTrailPanel.tsx');

  assert.ok(tabContentSource.includes("import { InniesV2LiveSessionsTab } from '../live/InniesV2LiveSessionsTab';"));
  assert.ok(tabContentSource.includes('return <InniesV2LiveSessionsTab key={activeTab} />;'));
  assert.ok(liveTabSource.includes("import { LiveSessionsCarousel } from './LiveSessionsCarousel';"));
  assert.ok(liveTabSource.includes("import { ArchiveTrailPanel } from './ArchiveTrailPanel';"));
  assert.ok(liveTabSource.includes('<LiveSessionsCarousel />'));
  assert.ok(liveTabSource.includes('<ArchiveTrailPanel />'));
  assert.ok(!liveTabSource.includes('<ActivityRailModule />'));
  assert.ok(liveTabSource.includes("'--console-line': '#E6E6E6'"));
  assert.ok(carouselSource.includes('> LIVE CLI SESSIONS'));
  assert.ok(carouselSource.includes("item.stream === 'live_sessions'"));
  assert.ok(carouselSource.includes("item.stream === 'latest_prompts'"));
  assert.ok(carouselSource.includes("item.sessionKey === session.sessionKey"));
  assert.ok(carouselSource.includes('overflow-x-auto'));
  assert.ok(carouselSource.includes("searchParams.get('sessionKey')"));
  assert.ok(carouselSource.includes('focusedSessionKey'));
  assert.ok(archivePanelSource.includes("section.id === 'archive_trail'"));
});

test('v2 live tab ports the old monitor route, hook, and activity-feed contract', () => {
  const hookSource = readSource('src/hooks/useInniesMonitorActivity.ts');
  const routeSource = readSource('src/app/api/innies/monitor/activity/route.ts');
  const backendClientSource = readSource('src/lib/inniesMonitor/backendMonitorClient.ts');
  const serverSource = readSource('src/lib/inniesMonitor/server.ts');
  const adapterSource = readSource('src/features/innies-monitor/adapters/activityFeed.ts');

  assert.ok(hookSource.includes("const INNIES_MONITOR_ACTIVITY_PATH = '/api/innies/monitor/activity';"));
  assert.ok(hookSource.includes('INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS = 7_500'));
  assert.ok(hookSource.includes('useState<InniesMonitorActivityPayload | null>(null)'));
  assert.ok(!hookSource.includes('InniesMonitorActivityWindow'));
  assert.ok(!hookSource.includes('?window=${encodeURIComponent(window)}'));
  assert.ok(routeSource.includes('export async function GET()'));
  assert.ok(!routeSource.includes('normalizeMonitorActivityWindow'));
  assert.ok(routeSource.includes('getInniesMonitorActivityFeed'));
  assert.ok(routeSource.includes("headers: { 'cache-control': 'no-store' }"));
  assert.ok(backendClientSource.includes("'/v1/admin/monitor/activity'"));
  assert.ok(backendClientSource.includes('INNIES_MONITOR_USE_CANONICAL_BACKEND'));
  assert.ok(backendClientSource.includes('fetchBackendMonitorActivityFeed'));
  assert.ok(backendClientSource.includes("record.href === null || typeof record.href === 'string'"));
  assert.ok(serverSource.includes('shouldUseCanonicalBackendMonitor'));
  assert.ok(serverSource.includes('fetchBackendMonitorActivityFeed'));
  assert.ok(serverSource.includes('getLegacyInniesMonitorActivityFeed'));
  assert.ok(serverSource.includes("/v1/public/innies/live-sessions"));
  assert.ok(serverSource.includes("/v1/admin/archive/sessions"));
  assert.ok(serverSource.includes("INNIES_ADMIN_API_KEY"));
  assert.ok(serverSource.includes("818d0cc7-7ed2-469f-b690-a977e72a921d"));
  assert.ok(serverSource.includes('MAX_ACTIVITY_ITEMS = 160'));
  assert.ok(serverSource.includes('filterArchiveSessionsForMonitor'));
  assert.ok(serverSource.includes('synthesizeArchiveLiveTrail'));
  assert.ok(serverSource.includes('LIVE_OVERLAY_BUYER_API_KEY_IDS'));
  assert.ok(adapterSource.includes("label: 'LIVE SESSIONS'"));
  assert.ok(adapterSource.includes("label: 'LATEST PROMPTS'"));
  assert.ok(adapterSource.includes("label: 'ARCHIVE TRAIL'"));
});

test('v2 shell supports a direct watch-me-work tab query param for automation and deep links', () => {
  const shellSource = readSource('src/components/vscodeV2/VscodeShell.tsx');

  assert.ok(shellSource.includes("window.location.search"));
  assert.ok(shellSource.includes("new URLSearchParams"));
  assert.ok(shellSource.includes("searchParams.get('tab')"));
  assert.ok(shellSource.includes('STATIC_TABS.includes'));
  assert.ok(shellSource.includes('setActiveTab'));
});
