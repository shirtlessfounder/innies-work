# V2 Live Monitor Activity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/v2` `watch-me-work.md` carousel with a literal `1:1` port of the old Innies monitor activity stack.

**Architecture:** Port the recovered old Innies monitor route, server, hook, adapter, and rail module into this repo with only minimal import and CSS rewiring. Lock the old behavior first in source-level tests, then transplant backend semantics, then mount the old rail in the live tab and remove the carousel path.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Node test runner, local `.env.local`

---

Spec reference: `docs/superpowers/specs/2026-04-15-v2-live-monitor-activity-design.md`

## File Map

- `src/app/api/innies/monitor/activity/route.ts`
  - exact old route shape: `GET()` with no `window` query handling and `no-store` headers
- `src/lib/inniesMonitor/server.ts`
  - exact old monitor feed merger and item contract
- `src/hooks/useInniesMonitorActivity.ts`
  - exact old poller: `7_500ms`, no `window` arg, stale/degraded preservation
- `src/features/innies-monitor/adapters/activityFeed.ts`
  - old three-stream section adapter
- `src/features/innies-monitor/modules/ActivityRailModule.tsx`
  - old segmented activity rail renderer
- `src/features/innies-monitor/inniesMonitor.module.css`
  - CSS selectors needed by the old rail module
- `src/components/live/InniesV2LiveSessionsTab.tsx`
  - `/v2` host surface for the rail
- `src/components/live/LiveSessionsCarousel.tsx`
  - current drift path; remove after port is mounted and references are gone
- `src/components/live/liveSessionsCarousel.module.css`
  - carousel-only CSS; delete if unused after the port
- `tests/v2LiveSessionsTab.test.mjs`
  - source-level regression test for the literal port

## Chunk 1: Lock The Literal Target In Tests

### Task 1: Rewrite the source-level regression test around the old monitor rail

**Files:**
- Modify: `tests/v2LiveSessionsTab.test.mjs`
- Verify: `src/components/live/InniesV2LiveSessionsTab.tsx`
- Verify: `src/app/api/innies/monitor/activity/route.ts`
- Verify: `src/lib/inniesMonitor/server.ts`
- Verify: `src/hooks/useInniesMonitorActivity.ts`
- Verify: `src/features/innies-monitor/adapters/activityFeed.ts`
- Verify: `src/features/innies-monitor/modules/ActivityRailModule.tsx`

- [ ] **Step 1: Rewrite the first test to assert the rail mount instead of the carousel**

Use assertions shaped like:

```js
test('v2 live tab mounts the old innies monitor activity rail instead of the carousel', () => {
  const liveTabSource = readSource('src/components/live/InniesV2LiveSessionsTab.tsx');
  const railSource = readSource('src/features/innies-monitor/modules/ActivityRailModule.tsx');

  assert.ok(liveTabSource.includes("import { ActivityRailModule } from '../../features/innies-monitor/modules/ActivityRailModule';"));
  assert.ok(liveTabSource.includes('<ActivityRailModule />'));
  assert.ok(!liveTabSource.includes('LiveSessionsCarousel'));
  assert.ok(railSource.includes("const [selectedStream, setSelectedStream] = useState<ActivityRailStream>('live_sessions');"));
  assert.ok(railSource.includes('LIVE ACTIVITY'));
  assert.ok(railSource.includes('activity rail'));
});
```

- [ ] **Step 2: Rewrite the second test to assert the old backend/client seam**

Use assertions shaped like:

```js
test('v2 live tab ports the old monitor route, hook, and activity-feed contract', () => {
  const hookSource = readSource('src/hooks/useInniesMonitorActivity.ts');
  const routeSource = readSource('src/app/api/innies/monitor/activity/route.ts');
  const serverSource = readSource('src/lib/inniesMonitor/server.ts');
  const adapterSource = readSource('src/features/innies-monitor/adapters/activityFeed.ts');

  assert.ok(hookSource.includes('INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS = 7_500'));
  assert.ok(!hookSource.includes('window: InniesMonitorActivityWindow'));
  assert.ok(!hookSource.includes('?window=${encodeURIComponent(window)}'));
  assert.ok(routeSource.includes('export async function GET()'));
  assert.ok(!routeSource.includes('normalizeMonitorActivityWindow'));
  assert.ok(serverSource.includes('MAX_ACTIVITY_ITEMS = 160'));
  assert.ok(!serverSource.includes('buyerApiKeyId'));
  assert.ok(adapterSource.includes("label: 'LIVE SESSIONS'"));
  assert.ok(adapterSource.includes("label: 'LATEST PROMPTS'"));
  assert.ok(adapterSource.includes("label: 'ARCHIVE TRAIL'"));
});
```

- [ ] **Step 3: Run the test and verify it fails for the right reasons**

Run: `node --test tests/v2LiveSessionsTab.test.mjs`
Expected: FAIL because the new `src/features/innies-monitor/*` files do not exist yet and current source still contains carousel strings like `LiveSessionsCarousel`, `2_000`, `normalizeMonitorActivityWindow`, and `buyerApiKeyId`

- [ ] **Step 4: Commit the red test**

```bash
git add tests/v2LiveSessionsTab.test.mjs
git commit -m "test: lock v2 live tab to old monitor rail shape"
```

## Chunk 2: Port The Old Backend Contract

### Task 2: Replace the current route and server with the old monitor semantics

**Files:**
- Modify: `src/app/api/innies/monitor/activity/route.ts`
- Modify: `src/lib/inniesMonitor/server.ts`
- Source of truth:
  - `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-route/ui/src/app/api/innies/monitor/activity/route.ts`
  - `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-route/ui/src/lib/inniesMonitor/server.ts`

- [ ] **Step 1: Port the old route body exactly, adapting only import syntax**

Replace the current route with the old shape:

```ts
export const dynamic = 'force-dynamic';

export async function GET() {
  const {
    getInniesMonitorActivityFeed,
    InniesMonitorActivityError,
  } = await import('../../../../../lib/inniesMonitor/server');
  // preserve old success/error JSON behavior and no-store headers
}
```

Do not keep:

- `normalizeMonitorActivityWindow`
- `request: Request`
- `window` query parsing

- [ ] **Step 2: Port the old server contract and remove drift fields**

Apply the old server source as the base and preserve these exact behaviors:

- remove `InniesMonitorActivityWindow`
- remove `buyerApiKeyId` from `PublicLiveSession`, `MonitorActivityItem`, and normalization output
- restore strict `readAdminApiConfig()` behavior
- restore old `getInniesMonitorActivityFeed(): Promise<MonitorActivityPayload>` signature with no input arg
- restore old global sort-and-slice `MAX_ACTIVITY_ITEMS = 160`
- restore old archive fetch fan-out and event fetch shape

Key shape to preserve:

```ts
export type MonitorActivityItem = {
  id: string;
  stream: MonitorActivityStream;
  kind: MonitorActivityKind;
  occurredAt: string;
  title: string;
  detail: string | null;
  sessionKey: string | null;
  sessionType: 'cli' | 'openclaw' | null;
  provider: string | null;
  model: string | null;
  status: string | null;
  href: string | null;
};
```

- [ ] **Step 3: Run the source-level test again**

Run: `node --test tests/v2LiveSessionsTab.test.mjs`
Expected: still FAIL, but now only on the missing rail files, the old poll cadence, and the current live-tab host still mounting the carousel

- [ ] **Step 4: Commit the backend transplant**

```bash
git add src/app/api/innies/monitor/activity/route.ts src/lib/inniesMonitor/server.ts
git commit -m "refactor: port old innies monitor activity backend"
```

## Chunk 3: Port The Old Hook, Adapter, And Rail UI

### Task 3: Port the old client hook and three-stream section adapter

**Files:**
- Modify: `src/hooks/useInniesMonitorActivity.ts`
- Create: `src/features/innies-monitor/adapters/activityFeed.ts`
- Source of truth:
  - `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/hooks/useInniesMonitorActivity.ts`
  - `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/features/innies-monitor/adapters/activityFeed.ts`

- [ ] **Step 1: Port the old hook signature and cadence**

Replace the current hook with the old shape:

```ts
export const INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS = 7_500;
const STALE_GRACE_PERIOD_MS = INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS * 2;

export function useInniesMonitorActivity(): UseInniesMonitorActivityResult {
  // no window param
  // fetch(INNIES_MONITOR_ACTIVITY_PATH, { cache: 'no-store', ... })
}
```

Do not keep:

- `InniesMonitorActivityWindow`
- the reset `useEffect` keyed on `window`
- `?window=${encodeURIComponent(window)}`
- `buyerApiKeyId` in item validation

- [ ] **Step 2: Create the old `activityFeed.ts` adapter**

Create `src/features/innies-monitor/adapters/activityFeed.ts` from the old source and preserve:

- `STREAM_ORDER`
- `STREAM_META`
- `deriveActivityRailSections`
- `findPreferredActivityRailStream`
- old labels, summaries, empty titles, and tone logic

- [ ] **Step 3: Run the test and verify one remaining failure surface**

Run: `node --test tests/v2LiveSessionsTab.test.mjs`
Expected: FAIL only because `ActivityRailModule.tsx` is still missing and `InniesV2LiveSessionsTab.tsx` still mounts `LiveSessionsCarousel`

- [ ] **Step 4: Commit the hook and adapter port**

```bash
git add src/hooks/useInniesMonitorActivity.ts src/features/innies-monitor/adapters/activityFeed.ts
git commit -m "feat: port old innies monitor activity client seam"
```

### Task 4: Create the old rail module and local CSS, then mount it in `/v2`

**Files:**
- Create: `src/features/innies-monitor/modules/ActivityRailModule.tsx`
- Create: `src/features/innies-monitor/inniesMonitor.module.css`
- Modify: `src/components/live/InniesV2LiveSessionsTab.tsx`
- Source of truth:
  - `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/features/innies-monitor/modules/ActivityRailModule.tsx`
  - `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/features/innies-monitor/inniesMonitor.module.css`

- [ ] **Step 1: Create `ActivityRailModule.tsx` from the old source**

Preserve the old renderer structure:

```tsx
export function ActivityRailModule() {
  const activity = useInniesMonitorActivity();
  const sections = useDeferredValue(deriveActivityRailSections(activity.payload));
  const [selectedStream, setSelectedStream] = useState<ActivityRailStream>('live_sessions');
  // preserve preferred-stream effect, railSummary, itemMeta, and emptyState behavior
}
```

Repo-local adaptation:

- inline or locally copy the timestamp-formatting helpers instead of importing `../../../lib/analytics/present`, because that dependency does not exist in this repo

- [ ] **Step 2: Create the local CSS module with only the selectors the old rail needs**

Port the CSS blocks for:

- `moduleFrame`
- `moduleHeader`
- `moduleEyebrow`
- `moduleTitle`
- `moduleBadge`
- `moduleBadgeLive`
- `dockTabs`
- `dockTab`
- `dockTabSummary`
- `groupStack`
- `groupPanel`
- `groupLabel`
- `groupDetail`
- `cardStack`
- `placeholderCard`
- `placeholderEyebrow`
- `placeholderTitle`
- `placeholderDetail`
- `placeholderMeta`

Keep the visual treatment aligned to the old monitor rail, not the current carousel.

- [ ] **Step 3: Replace the `/v2` live tab mount**

Update `src/components/live/InniesV2LiveSessionsTab.tsx` to import and render the rail:

```tsx
import { ActivityRailModule } from '../../features/innies-monitor/modules/ActivityRailModule';

export function InniesV2LiveSessionsTab() {
  return (
    <section className="w-full max-w-none px-1 pb-8" style={LIVE_TAB_SURFACE_STYLE}>
      <ActivityRailModule />
    </section>
  );
}
```

Do not keep:

- `EMPTY_BUYER_LABELS`
- `<LiveSessionsCarousel ... />`
- `window="24h"`

- [ ] **Step 4: Run the source-level test and verify it passes**

Run: `node --test tests/v2LiveSessionsTab.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit the rail UI port**

```bash
git add src/features/innies-monitor/modules/ActivityRailModule.tsx src/features/innies-monitor/inniesMonitor.module.css src/components/live/InniesV2LiveSessionsTab.tsx
git commit -m "feat: mount old innies monitor activity rail in v2"
```

## Chunk 4: Remove Carousel Drift And Run Full Verification

### Task 5: Delete the dead carousel path and verify the app gate

**Files:**
- Delete: `src/components/live/LiveSessionsCarousel.tsx`
- Delete: `src/components/live/liveSessionsCarousel.module.css`
- Verify: `src/components/live/LiveSessionPanel.tsx`
- Verify: `src/components/live/LiveSessionsSection.tsx`
- Verify: `tests/v2LiveSessionsTab.test.mjs`

- [ ] **Step 1: Confirm the carousel files are unused**

Run: `rg -n "LiveSessionsCarousel|liveSessionsCarousel.module.css" src tests`
Expected: only the dead carousel files or no remaining references

- [ ] **Step 2: Delete the dead carousel files**

Delete:

- `src/components/live/LiveSessionsCarousel.tsx`
- `src/components/live/liveSessionsCarousel.module.css`

Do not delete:

- `src/components/live/LiveSessionPanel.tsx`
- `src/components/live/LiveSessionsSection.tsx`

unless a targeted `rg` proves they are unused and unrelated to homepage behavior

- [ ] **Step 3: Run the focused regression suite**

Run: `node --test tests/v2LiveSessionsTab.test.mjs tests/percentV2Landing.test.mjs`
Expected: PASS

- [ ] **Step 4: Run the full project test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 6: Commit the cleanup and verified port**

```bash
git add src/components/live/LiveSessionsCarousel.tsx src/components/live/liveSessionsCarousel.module.css tests/v2LiveSessionsTab.test.mjs
git commit -m "refactor: remove v2 live carousel after monitor port"
```

## Final Verification Notes

- If `pnpm build` fails on missing env, verify whether the failure is compile-time or runtime-only before changing the code. Do not weaken the old monitor contract to make the build easier.
- Keep every transplant anchored to the recovered old source files. If a local adaptation is needed, comment it in the diff or commit message.
- Before handoff, capture:
  - `git status --short`
  - `node --test tests/v2LiveSessionsTab.test.mjs tests/percentV2Landing.test.mjs`
  - `pnpm test`
  - `pnpm build`

Plan complete and saved to `docs/superpowers/plans/2026-04-15-v2-live-monitor-activity-implementation.md`. Ready to execute?
