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

test('v2 live tab mounts the old innies monitor activity rail instead of the carousel', () => {
  const tabContentSource = readSource('src/components/vscodeV2/TabContent.tsx');
  const liveTabSource = readSource('src/components/live/InniesV2LiveSessionsTab.tsx');
  const railSource = readSource('src/features/innies-monitor/modules/ActivityRailModule.tsx');

  assert.ok(tabContentSource.includes("import { InniesV2LiveSessionsTab } from '../live/InniesV2LiveSessionsTab';"));
  assert.ok(tabContentSource.includes('return <InniesV2LiveSessionsTab key={activeTab} />;'));
  assert.ok(liveTabSource.includes("import { ActivityRailModule } from '../../features/innies-monitor/modules/ActivityRailModule';"));
  assert.ok(liveTabSource.includes('<ActivityRailModule />'));
  assert.ok(!liveTabSource.includes('LiveSessionsCarousel'));
  assert.ok(!liveTabSource.includes('window="24h"'));
  assert.ok(liveTabSource.includes("'--console-line': '#E6E6E6'"));
  assert.ok(railSource.includes("const [selectedStream, setSelectedStream] = useState<ActivityRailStream>('live_sessions');"));
  assert.ok(railSource.includes('LIVE ACTIVITY'));
  assert.ok(railSource.includes('activity rail'));
  assert.ok(railSource.includes('LIVE SESSIONS'));
  assert.ok(railSource.includes('LATEST PROMPTS'));
  assert.ok(railSource.includes('ARCHIVE TRAIL'));
});

test('v2 live tab ports the old monitor route, hook, and activity-feed contract', () => {
  const hookSource = readSource('src/hooks/useInniesMonitorActivity.ts');
  const routeSource = readSource('src/app/api/innies/monitor/activity/route.ts');
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
  assert.ok(serverSource.includes("/v1/public/innies/live-sessions"));
  assert.ok(serverSource.includes("/v1/admin/archive/sessions"));
  assert.ok(serverSource.includes("INNIES_ADMIN_API_KEY"));
  assert.ok(serverSource.includes("818d0cc7-7ed2-469f-b690-a977e72a921d"));
  assert.ok(serverSource.includes('MAX_ACTIVITY_ITEMS = 160'));
  assert.ok(!serverSource.includes('buyerApiKeyId'));
  assert.ok(adapterSource.includes("label: 'LIVE SESSIONS'"));
  assert.ok(adapterSource.includes("label: 'LATEST PROMPTS'"));
  assert.ok(adapterSource.includes("label: 'ARCHIVE TRAIL'"));
});
