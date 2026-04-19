# Innies Live Session Architecture Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Watch Me Work live-session ownership into `innies` so canonical live lanes and canonical event ids come from the backend, the public live feed stops collapsing real sessions, and `innies-work` can consume the existing `live_sessions` / `latest_prompts` / `archive_trail` contract without local DB-backed reconstruction.

**Architecture:** Implement this as an additive backend-first refactor. First, add canonical live-lane tables, classification, projection, and shadow-diff reporting in `innies`. Next, rebuild `/v1/public/innies/live-sessions` and add a backend monitor activity route on top of canonical lanes while preserving response shape. Finally, switch `innies-work` to the backend monitor route behind a flag and demote the local shim/overlay path to fallback-only cleanup.

**Tech Stack:** Innies API (`TypeScript`, `Express`, `Vitest`, Postgres), Innies CLI (`Node`), `innies-work` (`Next.js`, `React`, Node test runner)

---

Spec reference: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/docs/superpowers/specs/2026-04-16-innies-live-session-architecture-design.md`

## File Map

### `innies`

- Create: `/Users/dylanvu/Projects/oss/innies/docs/migrations/030_live_lane_projection.sql`
- Create: `/Users/dylanvu/Projects/oss/innies/docs/migrations/030_live_lane_projection_no_extensions.sql`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/repos/tableNames.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneRepository.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneAttemptRepository.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneEventRepository.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneProjectionOutboxRepository.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneTypes.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneClassifier.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneProjectorService.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneReadService.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneShadowService.ts`
- Create or modify: `/Users/dylanvu/Projects/oss/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/routes/adminMonitor.ts`
- Create or modify: `/Users/dylanvu/Projects/oss/innies/api/src/routes/publicInnies.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/services/archive/requestArchiveService.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/services/runtime.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/jobs/registry.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/jobs/liveLaneProjectorJob.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/server.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/liveLanes/liveLaneClassifier.test.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/liveLanes/liveLaneProjectorService.test.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/liveLanes/liveLaneShadowService.test.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/routes/publicInnies.route.test.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/routes/adminMonitor.route.test.ts`

### `innies-work`

- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/backendMonitorClient.ts`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/server.ts`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/hooks/useInniesMonitorActivity.ts`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/LiveSessionsCarousel.tsx`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/localLiveOverlay.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/scripts/localInniesMonitorProxy.mjs`
- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/inniesMonitorCanonicalBackend.test.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/v2LiveSessionsTab.test.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/localLiveOverlay.test.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/archiveSessionBridge.test.mjs`

## Chunk 1: Canonical Storage and Identity

### Task 1: Add additive live-lane schema and repositories

**Files:**
- Create: `/Users/dylanvu/Projects/oss/innies/docs/migrations/030_live_lane_projection.sql`
- Create: `/Users/dylanvu/Projects/oss/innies/docs/migrations/030_live_lane_projection_no_extensions.sql`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/repos/tableNames.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneRepository.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneAttemptRepository.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneEventRepository.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/repos/liveLaneProjectionOutboxRepository.ts`

- [ ] **Step 1: Add additive tables for live lanes, lane attempts, lane events, and projection outbox**

Create tables for:

- `in_live_lane_projection_outbox`
- `in_live_lanes`
- `in_live_lane_attempts`
- `in_live_lane_events`

Required constraints:

- internal joins key on `lane_id`
- `session_key` stored as derived external identity
- unique `lane_event_id`
- provenance fields include `request_attempt_archive_id`, `request_id`, `attempt_no`, `side`, `ordinal`

- [ ] **Step 2: Register new table names and add repositories with focused responsibilities**

Repository split:

- `liveLaneRepository.ts`: lane summaries by `lane_id`
- `liveLaneAttemptRepository.ts`: attempt membership by `lane_id`
- `liveLaneEventRepository.ts`: event rows by `lane_id` and `lane_event_id`
- `liveLaneProjectionOutboxRepository.ts`: queue and projector lag bookkeeping

- [ ] **Step 3: Verify schema and repository interfaces line up**

Run:

```bash
sed -n '1,240p' /Users/dylanvu/Projects/oss/innies/docs/migrations/030_live_lane_projection.sql
sed -n '1,240p' /Users/dylanvu/Projects/oss/innies/api/src/repos/tableNames.ts
```

Expected:

- migration names match repo usage exactly
- `lane_id` is the internal join key everywhere
- `session_key` is not used as an internal foreign key

### Task 2: Add canonical live-lane identity classification

**Files:**
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneTypes.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneClassifier.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/liveLanes/liveLaneClassifier.test.ts`
- Reference: `/Users/dylanvu/Projects/oss/innies/api/src/routes/proxy.ts`
- Reference: `/Users/dylanvu/Projects/oss/innies/cli/src/commands/codex.js`

- [ ] **Step 1: Define canonical live-lane types**

Include:

- `lane_id`
- `lane_source_kind`
- `lane_source_id`
- `session_key`
- `lane_event_id`
- `projection_version`

- [ ] **Step 2: Implement phase-1 lane classification rules**

Required rules:

- stable session identity outranks `request_source`
- `openclaw_session_id` with routed traffic maps to `cli:openclaw:<openclaw_session_id>`
- no `cli:idle:*` canonical live lane
- request fallback maps to `cli:request:<request_id>`
- do not use run ids unless proven durable and reusable

- [ ] **Step 3: Add unit tests for the known broken cases**

Cover:

- `cli-codex` + `cli_provider_pinned` + non-null `openclaw_session_id`
- `openclaw` request source
- request fallback when no durable session id exists
- legacy recovered pinned Codex session id path

- [ ] **Step 4: Run focused classifier tests**

Run:

```bash
cd /Users/dylanvu/Projects/oss/innies/api
npx vitest run tests/liveLanes/liveLaneClassifier.test.ts
```

Expected:

- PASS
- no case maps stable OpenClaw traffic to `cli:idle:*`

## Chunk 2: Projection and Shadow Verification

### Task 3: Project archived attempts into canonical lanes and canonical events

**Files:**
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneProjectorService.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/services/archive/requestArchiveService.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/services/runtime.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/jobs/registry.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/jobs/liveLaneProjectorJob.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/liveLanes/liveLaneProjectorService.test.ts`

- [ ] **Step 1: Enqueue every archived routed attempt for live-lane projection**

Hook the archive write path so `requestArchiveService` enqueues `request_attempt_archive_id` into `in_live_lane_projection_outbox` after archive persistence succeeds.

- [ ] **Step 2: Build lane summaries and lane attempts from archive truth**

Project from:

- `in_request_attempt_archives`
- `in_routing_events`
- `in_request_attempt_messages`
- `in_message_blobs`

Required behavior:

- lane summary keyed by `lane_id`
- attempt membership preserved in `in_live_lane_attempts`
- `buyer_api_key_id`, provider/model, timestamps, latest request refs stored on the lane

- [ ] **Step 3: Build canonical lane events with deterministic ids**

Required event id sources:

- `request_attempt_archive_id`
- event kind
- request/response side
- ordinal when message-based

Do not use local merge-order ids like `${ordinal}:user`.

- [ ] **Step 4: Add projector tests for duplicate-ordinal safety**

Include a case where:

- multiple attempts in the same lane reuse ordinals `1` and `2`
- the projected `lane_event_id`s are still unique

- [ ] **Step 5: Run projector tests**

Run:

```bash
cd /Users/dylanvu/Projects/oss/innies/api
npx vitest run tests/liveLanes/liveLaneProjectorService.test.ts
```

Expected:

- PASS
- no duplicate canonical event ids

### Task 4: Add shadow-diff verification for legacy vs canonical behavior

**Files:**
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneShadowService.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/liveLanes/liveLaneShadowService.test.ts`
- Reference: `/Users/dylanvu/Projects/oss/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`
- Reference: `/Users/dylanvu/Projects/oss/innies/api/src/services/adminArchive/adminSessionProjectorService.ts`

- [ ] **Step 1: Implement a diff service comparing three views**

Compare:

- raw archive truth
- legacy public live feed substrate
- canonical live-lane projection

Metrics:

- lane count
- attempt membership per lane
- event count per lane
- latest activity timestamp per lane

- [ ] **Step 2: Add buyer-key filtered diff coverage for the known affected path**

Include comparison logic suitable for:

- buyer key `f3f97490-540f-4d13-ba1b-2ad1adff1ff1`
- multiple distinct `openclaw_session_id`s
- legacy collapsed `cli:idle:*` projection

- [ ] **Step 3: Add tests for mismatch buckets**

Required buckets:

- legacy-only lanes
- canonical-only lanes
- membership mismatch
- event-count mismatch
- timestamp mismatch

- [ ] **Step 4: Run shadow service tests**

Run:

```bash
cd /Users/dylanvu/Projects/oss/innies/api
npx vitest run tests/liveLanes/liveLaneShadowService.test.ts
```

Expected:

- PASS
- mismatches are explicit and machine-countable

## Chunk 3: Public and Monitor Read Surfaces

### Task 5: Rebuild `/v1/public/innies/live-sessions` on canonical lanes

**Files:**
- Create or modify: `/Users/dylanvu/Projects/oss/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`
- Create or modify: `/Users/dylanvu/Projects/oss/innies/api/src/routes/publicInnies.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/server.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/routes/publicInnies.route.test.ts`

- [ ] **Step 1: Resolve the checked-in route owner for the public live feed**

If `publicInnies.ts` exists in the working branch, modify it in place.
If it does not, restore a dedicated checked-in owner and mount it in `server.ts`.

- [ ] **Step 2: Read canonical lanes and canonical lane events for feed assembly**

Required response guarantees:

- one session per canonical lane
- stable `sessionKey`
- `buyerApiKeyId` populated when known
- unique `entries[].entryId`
- no change to the public response shape beyond safe field population

- [ ] **Step 3: Add route tests for the exact broken production case**

Cover:

- multiple `openclaw_session_id`s for the same buyer key
- legacy model would have emitted one `cli:idle:*`
- canonical feed emits one session per real session lane

- [ ] **Step 4: Run public route tests**

Run:

```bash
cd /Users/dylanvu/Projects/oss/innies/api
npx vitest run tests/routes/publicInnies.route.test.ts
```

Expected:

- PASS
- response shape remains compatible
- canonical output beats legacy output on lane count and membership

### Task 6: Add backend monitor activity route for current UI consumers

**Files:**
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/routes/adminMonitor.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/src/services/liveLanes/liveLaneReadService.ts`
- Modify: `/Users/dylanvu/Projects/oss/innies/api/src/server.ts`
- Create: `/Users/dylanvu/Projects/oss/innies/api/tests/routes/adminMonitor.route.test.ts`

- [ ] **Step 1: Add a canonical backend route that emits the existing monitor item shape**

Target shape:

- `generatedAt`
- `liveStatus`
- `items[]`

Streams:

- `live_sessions`
- `latest_prompts`
- `archive_trail`

- [ ] **Step 2: Source `live_sessions` and `latest_prompts` from canonical lanes/events**

Phase-1 rule:

- `archive_trail` can continue to come from existing archive/admin readers
- do not re-encode lane identity in `innies-work`

- [ ] **Step 3: Add route tests for id uniqueness and stream contract stability**

Cover:

- unique `id` per emitted item
- stable `sessionKey`
- no shape regression for the UI contract

- [ ] **Step 4: Run monitor route tests**

Run:

```bash
cd /Users/dylanvu/Projects/oss/innies/api
npx vitest run tests/routes/adminMonitor.route.test.ts
```

Expected:

- PASS
- item ids are unique
- emitted stream names and item kinds match current consumer expectations

## Chunk 4: Consumer Cleanup in `innies-work`

### Task 7: Switch `innies-work` monitor server route to the backend monitor path

**Files:**
- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/backendMonitorClient.ts`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/server.ts`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/hooks/useInniesMonitorActivity.ts`
- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/inniesMonitorCanonicalBackend.test.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/v2LiveSessionsTab.test.mjs`

- [ ] **Step 1: Add a thin backend client for the canonical monitor route**

The client should:

- fetch the backend monitor payload
- validate the existing UI item shape
- keep `innies-work` ignorant of lane-classification rules

- [ ] **Step 2: Gate the server route to prefer the backend canonical monitor path**

Keep a feature flag for rollout.
Do not delete legacy fallback code yet.

- [ ] **Step 3: Add integration tests for the backend path**

Cover:

- `live_sessions`, `latest_prompts`, `archive_trail` shape unchanged
- canonical ids flow through untouched
- no local lane reconstruction required for correctness

- [ ] **Step 4: Run UI monitor tests**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test tests/inniesMonitorCanonicalBackend.test.mjs tests/v2LiveSessionsTab.test.mjs
```

Expected:

- PASS
- `/v2` can render from the backend canonical path

### Task 8: Keep duplicate-key cleanup separate from the architecture cutover

**Files:**
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/localLiveOverlay.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/scripts/localInniesMonitorProxy.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/localLiveOverlay.test.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/tests/archiveSessionBridge.test.mjs`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/LiveSessionsCarousel.tsx`

- [ ] **Step 1: Mark the local overlay path as fallback-only during rollout**

Keep it available for emergency comparison/debugging, not normal correctness.

- [ ] **Step 2: Fix local synthesized ids so fallback mode is not crash-prone**

If fallback mode remains enabled:

- include attempt identity in local synthesized ids
- avoid pure ordinal-based ids

- [ ] **Step 3: Add tests that prove local fallback ids are unique even when ordinals repeat**

Cover:

- multiple attempts in one reconstructed overlay lane
- repeated ordinals across attempts
- no duplicate local ids

- [ ] **Step 4: Run fallback-path tests**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test tests/localLiveOverlay.test.mjs tests/archiveSessionBridge.test.mjs
```

Expected:

- PASS
- fallback path no longer emits duplicate ids

## Final Verification Gate

- [ ] **Step 1: Run Innies backend focused tests**

Run:

```bash
cd /Users/dylanvu/Projects/oss/innies/api
npx vitest run \
  tests/liveLanes/liveLaneClassifier.test.ts \
  tests/liveLanes/liveLaneProjectorService.test.ts \
  tests/liveLanes/liveLaneShadowService.test.ts \
  tests/routes/publicInnies.route.test.ts \
  tests/routes/adminMonitor.route.test.ts
```

Expected:

- PASS
- unique event ids
- canonical lane count/membership beats legacy for the known broken case

- [ ] **Step 2: Re-run CLI regression coverage**

Run:

```bash
cd /Users/dylanvu/Projects/oss/innies/cli
node --test tests/codexArgs.test.js
```

Expected:

- PASS
- Codex still sends stable OpenClaw session id and provider pin

- [ ] **Step 3: Run `innies-work` focused tests**

Run:

```bash
cd /Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone
node --test \
  tests/inniesMonitorCanonicalBackend.test.mjs \
  tests/v2LiveSessionsTab.test.mjs \
  tests/localLiveOverlay.test.mjs \
  tests/archiveSessionBridge.test.mjs
```

Expected:

- PASS
- canonical consumer path preserves contract
- fallback path does not emit duplicate ids

- [ ] **Step 4: Check cutover gates before enabling the backend path by default**

Required gates:

- no collapsed multi-session lanes for buyer-key filtered Codex/OpenClaw traffic
- unique event ids end to end
- no duplicate React key warnings in the canonical consumer path
- projector lag/feed latency within agreed thresholds
- no regression in public response shape

Plan complete and saved to `docs/superpowers/plans/2026-04-16-innies-live-session-architecture-implementation.md`. Ready to execute?
