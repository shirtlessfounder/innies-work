# V2 Live Sessions Literal Restoration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the old `/v2` live experience by fixing Innies live-session visibility for real Codex traffic and mounting the old `LIVE CLI SESSIONS` carousel plus archive context in the live tab.

**Architecture:** Execute the work in dependency order. First, patch `innies` so `/v1/public/innies/live-sessions` stops dropping archived direct fallback traffic. Then, in `percent-v2-clone`, keep the merged monitor route/hook contract but replace the current tabbed rail host with a composite surface: the old horizontal `LIVE CLI SESSIONS` carousel built from `live_sessions` plus `latest_prompts`, and a separate archive panel built from `archive_trail`.

**Tech Stack:** Innies API (`TypeScript`, `Vitest`, `Express`), Next.js App Router, React 18, Node test runner

---

Spec reference: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/docs/superpowers/specs/2026-04-15-v2-live-monitor-activity-design.md`

## File Map

### Backend truth repair in `/Users/dylanvu/innies`

- `/Users/dylanvu/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`
  - patch the direct-session fallback key path so archived direct fallback traffic becomes visible
- `/Users/dylanvu/innies/api/tests/publicLiveSessionsService.test.ts`
  - lock the missing direct-session case with red/green coverage

### `/v2` feed seam in `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone`

- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/app/api/innies/monitor/activity/route.ts`
  - verify only; already the correct merged route seam unless runtime drift is found
- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/server.ts`
  - verify only; already the correct merged three-stream contract unless runtime drift is found
- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/hooks/useInniesMonitorActivity.ts`
  - verify only; already the correct `7.5s` poller unless runtime drift is found

### `/v2` primary live UI

- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/v2LiveSessionsTab.test.mjs`
  - rewrite the source-level regression to target the carousel + archive composite instead of the tabbed rail
- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/InniesV2LiveSessionsTab.tsx`
  - swap the mounted live-tab surface from `ActivityRailModule` to the literal composite
- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/LiveSessionsCarousel.tsx`
  - new primary live-session carousel adapted from the old V2 demo source
- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/liveSessionsCarousel.module.css`
  - local animation and small visual utilities needed by the carousel adaptation
- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/ArchiveTrailPanel.tsx`
  - supporting archive context surface built from `archive_trail`

### Existing files that should be left non-primary

- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/features/innies-monitor/modules/ActivityRailModule.tsx`
  - do not keep as the primary mounted live-tab surface
- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/LiveSessionsSection.tsx`
  - do not reuse as the `/v2` live surface; it is the wrong public panel wall model

## Chunk 1: Repair Innies Live-Session Visibility

### Task 1: Lock the missing direct fallback case in backend tests

**Files:**
- Modify: `/Users/dylanvu/innies/api/tests/publicLiveSessionsService.test.ts`
- Verify: `/Users/dylanvu/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`

- [ ] **Step 1: Add a failing test for archived direct fallback traffic without `prompt_cache_key`**

Add a new case near the other direct-session tests. Keep the fixture style consistent with `SequenceSqlClient`.

Use a test shaped like:

```ts
it('surfaces archived direct fallback requests even when prompt_cache_key is missing', async () => {
  const now = new Date('2026-04-16T02:00:00.000Z');
  const db = new SequenceSqlClient([
    { rows: [{ id: 'org_innies' }], rowCount: 1 },
    { rows: [], rowCount: 0 },
    {
      rows: [{
        request_attempt_archive_id: 'arch_direct_fallback_1',
        request_id: 'req_direct_fallback_1',
        attempt_no: 1,
        api_key_id: 'api_keep',
        provider: 'openai',
        model: 'gpt-5.4-mini',
        started_at: '2026-04-16T01:59:35.724Z',
        completed_at: '2026-04-16T01:59:54.864Z',
        route_decision: {
          request_source: 'direct',
          provider_selection_reason: 'fallback_provider_selected',
          provider_fallback_from: 'anthropic',
        },
      }],
      rowCount: 1,
    },
    { rows: [], rowCount: 0 },
    {
      rows: [
        messageRow({
          archiveId: 'arch_direct_fallback_1',
          side: 'request',
          ordinal: 0,
          role: 'user',
          content: [{ type: 'text', text: 'show the live session anyway' }],
        }),
        messageRow({
          archiveId: 'arch_direct_fallback_1',
          side: 'response',
          ordinal: 0,
          role: 'assistant',
          content: [{ type: 'text', text: 'visible despite missing prompt cache key' }],
        }),
      ],
      rowCount: 2,
    },
  ]);

  const service = new PublicLiveSessionsService({
    sql: db,
    apiKeys: { findIdByHash: vi.fn(async () => null) },
    now: () => now,
  });

  const feed = await service.listFeed();

  expect(feed.sessions).toEqual([{
    sessionKey: 'cli:request:req_direct_fallback_1',
    sessionType: 'cli',
    displayTitle: 'cli req_dire...ck_1',
    startedAt: '2026-04-16T01:59:35.724Z',
    endedAt: '2026-04-16T01:59:54.864Z',
    lastActivityAt: '2026-04-16T01:59:54.864Z',
    currentProvider: 'openai',
    currentModel: 'gpt-5.4-mini',
    providerSet: ['openai'],
    modelSet: ['gpt-5.4-mini'],
    entries: [
      {
        entryId: 'arch_direct_fallback_1:0:user',
        kind: 'user',
        at: '2026-04-16T01:59:54.864Z',
        text: 'show the live session anyway',
      },
      {
        entryId: 'arch_direct_fallback_1:1:assistant_final',
        kind: 'assistant_final',
        at: '2026-04-16T01:59:54.864Z',
        text: 'visible despite missing prompt cache key',
      },
    ],
  }]);
});
```

- [ ] **Step 2: Run the targeted backend test and verify it fails for the right reason**

Run:

```bash
cd /Users/dylanvu/innies/api
npm test -- publicLiveSessionsService.test.ts
```

Expected: FAIL because the current service drops the direct row when there is no `prompt_cache_key`, so `feed.sessions` is empty.

- [ ] **Step 3: Implement the minimal fallback key change in the service**

Update `/Users/dylanvu/innies/api/src/services/publicInnies/publicLiveSessionsService.ts` so direct rows can still build a visible session key when the prompt-cache lookup is empty.

Use a change shaped like:

```ts
for (const row of limitedRows.slice().reverse()) {
  const promptCacheKey = this.promptCacheKeyByArchiveId.get(row.request_attempt_archive_id)?.value ?? null;
  const sessionKey = promptCacheKey
    ? `cli:prompt-cache:${promptCacheKey}`
    : buildDirectRequestSessionKey(row);
  if (!sessionKey) {
    continue;
  }

  attempts.push({
    ...row,
    session_key: sessionKey,
    eventAtIso,
  });
}

function buildDirectRequestSessionKey(
  row: Pick<DirectAttemptRow, 'request_id' | 'route_decision'>
): string | null {
  const routeDecision = isRecord(row.route_decision) ? row.route_decision : null;
  const requestSource = readString(routeDecision?.request_source);
  if (requestSource !== 'direct') {
    return null;
  }

  const requestId = sanitizeNullableString(readString(row.request_id));
  return requestId ? `cli:request:${requestId}` : null;
}
```

Important:

- do not rework unrelated window logic already present in the dirty file
- do not touch the admin session path
- keep the fix scoped to direct-session fallback visibility

- [ ] **Step 4: Re-run the targeted backend test and verify it passes**

Run:

```bash
cd /Users/dylanvu/innies/api
npm test -- publicLiveSessionsService.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the isolated backend truth fix**

```bash
cd /Users/dylanvu/innies
git add api/src/services/publicInnies/publicLiveSessionsService.ts api/tests/publicLiveSessionsService.test.ts
git commit -m "fix: surface direct fallback live sessions"
```

## Chunk 2: Lock the `/v2` Literal UI Target in Tests

### Task 2: Rewrite the `/v2` regression test around the carousel plus archive composite

**Files:**
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/v2LiveSessionsTab.test.mjs`
- Verify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/InniesV2LiveSessionsTab.tsx`

- [ ] **Step 1: Replace the rail-first assertions with carousel-first assertions**

Rewrite the first test so it locks the new primary surface:

```js
test('v2 live tab mounts the live cli sessions carousel plus archive trail panel', () => {
  const liveTabSource = readSource('src/components/live/InniesV2LiveSessionsTab.tsx');
  const carouselSource = readSource('src/components/live/LiveSessionsCarousel.tsx');
  const archivePanelSource = readSource('src/components/live/ArchiveTrailPanel.tsx');

  assert.ok(liveTabSource.includes("import { LiveSessionsCarousel } from './LiveSessionsCarousel';"));
  assert.ok(liveTabSource.includes("import { ArchiveTrailPanel } from './ArchiveTrailPanel';"));
  assert.ok(liveTabSource.includes('<LiveSessionsCarousel />'));
  assert.ok(liveTabSource.includes('<ArchiveTrailPanel />'));
  assert.ok(!liveTabSource.includes('<ActivityRailModule />'));

  assert.ok(carouselSource.includes('LIVE CLI SESSIONS'));
  assert.ok(carouselSource.includes("item.stream === 'live_sessions'"));
  assert.ok(carouselSource.includes("item.stream === 'latest_prompts'"));
  assert.ok(carouselSource.includes('item.sessionKey === session.sessionKey'));
  assert.ok(carouselSource.includes('overflow-x-auto'));

  assert.ok(archivePanelSource.includes("section.id === 'archive_trail'"));
});
```

- [ ] **Step 2: Keep the second test as the contract guard for the merged route/hook seam**

Retain the route/hook/server assertions from the current test file, but remove any assertion that requires the tabbed rail as the primary UI.

- [ ] **Step 3: Run the `/v2` source-level test and verify it fails for the right reason**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test tests/v2LiveSessionsTab.test.mjs
```

Expected: FAIL because `LiveSessionsCarousel.tsx` and `ArchiveTrailPanel.tsx` do not exist yet and the live tab still mounts `ActivityRailModule`.

- [ ] **Step 4: Commit the red `/v2` target lock**

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
git add tests/v2LiveSessionsTab.test.mjs
git commit -m "test: lock v2 live tab to carousel plus archive shape"
```

## Chunk 3: Implement the `/v2` Literal Live Surface

### Task 3: Create the lifted `LiveSessionsCarousel` component

**Files:**
- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/LiveSessionsCarousel.tsx`
- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/liveSessionsCarousel.module.css`
- Verify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/hooks/useInniesMonitorActivity.ts`

- [ ] **Step 1: Port the old carousel logic, adapted to the monitor payload that has no buyer key label**

Use `/Users/dylanvu/innies/.worktrees/innies-v2-demo-copy/ui/src/features/innies-v2-demo/components/new-ui/LiveSessionsCarousel.tsx` as the source.

Adaptations to make explicitly:

- remove the `window` prop
- remove `buyerLabelsByApiKeyId`
- read from `useInniesMonitorActivity()` directly
- derive header text from the session item fields already in the monitor payload
- keep the old card-join logic:

```ts
function buildLiveSessionCards(payload) {
  if (!payload) return [];

  const liveSessions = payload.items.filter((item) => item.stream === 'live_sessions');
  const latestPrompts = payload.items.filter((item) => item.stream === 'latest_prompts');

  return liveSessions.map((session) => ({
    session,
    trail: latestPrompts
      .filter((item) => item.sessionKey === session.sessionKey)
      .filter((item) => item.kind !== 'tool_call')
      .filter((item) => item.kind !== 'tool_result')
      .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt)),
  }));
}
```

- [ ] **Step 2: Keep the old carousel behavior that materially affects feel**

Preserve:

- horizontal scroll container
- one fixed-width card per active lane
- per-card vertical transcript auto-follow
- newest-message flash behavior if it ports cleanly
- `LIVE CLI SESSIONS` heading

Do not preserve:

- `window`-dependent fetches
- buyer-label map props
- analytics stylesheet imports that do not exist in this repo

- [ ] **Step 3: Add only the local CSS needed by the adaptation**

Create a small CSS module for things that do not fit cleanly in inline styles or utility classes, for example:

```css
.rowDeltaFlash {
  animation: rowDeltaFlash 2s ease;
}

@keyframes rowDeltaFlash {
  0% { background: rgba(11, 114, 133, 0.14); }
  100% { background: transparent; }
}
```

Keep the rest of the visual port close to the old source and the existing console variables in `InniesV2LiveSessionsTab.tsx`.

- [ ] **Step 4: Run the `/v2` test and verify only the missing archive host work remains**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test tests/v2LiveSessionsTab.test.mjs
```

Expected: FAIL only because the archive panel and host mount are not finished yet.

- [ ] **Step 5: Commit the lifted carousel**

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
git add src/components/live/LiveSessionsCarousel.tsx src/components/live/liveSessionsCarousel.module.css
git commit -m "feat: add v2 live sessions carousel"
```

### Task 4: Add the supporting `ArchiveTrailPanel`

**Files:**
- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/ArchiveTrailPanel.tsx`
- Verify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/features/innies-monitor/adapters/activityFeed.ts`
- Verify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/features/innies-monitor/inniesMonitor.module.css`

- [ ] **Step 1: Build a focused archive-only panel on top of the existing adapter**

Use the existing adapter rather than inventing a second archive shaping path:

```tsx
const activity = useInniesMonitorActivity();
const sections = useDeferredValue(deriveActivityRailSections(activity.payload));
const archiveSection = sections.find((section) => section.id === 'archive_trail');
```

Render only:

- archive section label
- summary line
- empty/degraded/loading state
- archive item cards

Do not render:

- `dockTabs`
- stream switching buttons
- `live_sessions` or `latest_prompts` from this component

- [ ] **Step 2: Reuse the existing monitor CSS instead of creating a second archive stylesheet**

Prefer the existing selectors in:

- `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/features/innies-monitor/inniesMonitor.module.css`

Use only the section/card selectors needed for archive context. Do not preserve the tabbed rail layout as the mounted live surface.

- [ ] **Step 3: Run the `/v2` test again and verify only the tab host still needs to change**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test tests/v2LiveSessionsTab.test.mjs
```

Expected: FAIL only because `InniesV2LiveSessionsTab.tsx` still mounts the old rail path.

- [ ] **Step 4: Commit the archive panel**

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
git add src/components/live/ArchiveTrailPanel.tsx
git commit -m "feat: add v2 archive trail panel"
```

### Task 5: Swap the `/v2` live-tab host to the literal composite

**Files:**
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/InniesV2LiveSessionsTab.tsx`
- Verify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/features/innies-monitor/modules/ActivityRailModule.tsx`

- [ ] **Step 1: Replace the mounted live-tab surface**

Change the host from:

```tsx
<ActivityRailModule />
```

to a stacked composite:

```tsx
<div className="flex flex-col gap-4">
  <LiveSessionsCarousel />
  <ArchiveTrailPanel />
</div>
```

Keep the existing surface variables:

```ts
const LIVE_TAB_SURFACE_STYLE = {
  '--console-line': '#E6E6E6',
  '--console-panel-table-top': 'rgba(248, 251, 253, 0.32)',
  '--console-panel-table-bottom': 'rgba(248, 251, 253, 0.18)',
  '--console-panel-strong': 'rgba(248, 251, 253, 0.82)',
  '--console-accent': '#0b7285',
  '--console-ink-soft': 'rgba(22, 51, 62, 0.68)',
  '--shell-line': 'rgba(20, 53, 64, 0.14)',
  '--shell-line-strong': 'rgba(20, 53, 64, 0.26)',
  '--shell-panel-strong': 'rgba(248, 251, 253, 0.88)',
  color: '#16333e',
} as CSSProperties;
```

- [ ] **Step 2: Keep `ActivityRailModule.tsx` out of the mounted host**

Do not delete it in the same step unless it is obviously dead and unreferenced. The requirement here is that it is no longer the primary live-tab mount.

- [ ] **Step 3: Run the `/v2` source-level test and verify it passes**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test tests/v2LiveSessionsTab.test.mjs
```

Expected: PASS

- [ ] **Step 4: Commit the mounted `/v2` live restoration**

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
git add src/components/live/InniesV2LiveSessionsTab.tsx
git commit -m "feat: restore v2 live sessions surface"
```

## Chunk 4: Verification and Handoff

### Task 6: Verify the backend truth and `/v2` source seam together

**Files:**
- Verify only:
  - `/Users/dylanvu/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`
  - `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/server.ts`
  - `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/hooks/useInniesMonitorActivity.ts`

- [ ] **Step 1: Re-run the targeted backend and frontend tests back to back**

Run:

```bash
cd /Users/dylanvu/innies/api
npm test -- publicLiveSessionsService.test.ts

cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test tests/v2LiveSessionsTab.test.mjs
```

Expected: PASS and PASS

- [ ] **Step 2: Verify the current public live-session feed shape manually**

Run:

```bash
source /Users/dylanvu/innies/scripts/_common.sh >/dev/null 2>&1
curl -sS "$BASE_URL/v1/public/innies/live-sessions" | jq '{generatedAt, sessionCount: (.sessions | length), sessionKeys: (.sessions | map(.sessionKey))}'
```

Expected after the backend patch is deployed or run against the target backend: non-zero sessions during active Codex traffic.

- [ ] **Step 3: Verify the merged `/v2` route manually**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
curl -sS http://localhost:3000/api/innies/monitor/activity | jq '{generatedAt, liveStatus, itemCount: (.items | length), streams: (.items | map(.stream) | unique)}'
```

Expected: `streams` includes `live_sessions`, `latest_prompts`, and `archive_trail` when the upstream data is present.

- [ ] **Step 4: Note the local-runtime blocker explicitly if end-to-end cannot be run**

If `/Users/dylanvu/innies/api/.env` still contains stale DB credentials and the local Innies API cannot boot, stop and document that the remaining verification is deploy-only. Do not claim local E2E success without a working API process and a real `/v2` page check.

- [ ] **Step 5: Optional docs-only cleanup commit if execution required clarifying notes**

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
git status --short
```

Only make a final docs commit if the implementation changed the plan or spec materially. Otherwise stop after test evidence and handoff.
