# V2 Live Sessions Literal Restoration Design

Date: 2026-04-15
Primary frontend target: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone`
Supporting backend target: `/Users/dylanvu/innies`
Route: `/v2`
Tab: `watch-me-work.md`
Intent: literal restoration of the old live experience the user was pointing at, including both correct Innies live-session visibility and the old `LIVE CLI SESSIONS` carousel presentation

## Status

This spec supersedes the earlier rail-only version of this document.

That earlier direction was incomplete. It correctly identified the old merged monitor feed shape, but it locked the wrong primary renderer. The user clarified that the real target is the old `LIVE CLI SESSIONS` scrollable carousel of session panels, not the tabbed `ActivityRailModule` as the main `/v2` surface.

## Goal

Restore the old `/v2` live experience `1:1`:

- Innies must surface real active Codex work as live sessions
- `/v2` must render the old horizontal `LIVE CLI SESSIONS` carousel as the primary live surface
- the merged monitor contract must still preserve:
  - `live_sessions`
  - `latest_prompts`
  - `archive_trail`
- `archive_trail` must remain visible as separate historical context instead of being discarded or shoved into the live cards

This is not a visual refresh and not a semantic approximation. The target is the old behavior the user saw before.

## Proven Root Cause

The current broken state is not mainly a `/v2` UI bug.

The user had real active Codex sessions. Those requests were recorded and archived, but the public live-session feed still returned zero sessions.

Concrete evidence from the current system:

- public feed returned zero sessions at `2026-04-16T01:59:45.076Z`
- a real archived request, `req_1776304775724_82603`, completed at `2026-04-16T01:59:54.864Z`
- that request was archived with:
  - `requestSource: "direct"`
  - `providerSelectionReason: "fallback_provider_selected"`
- admin archive drilldown for that request showed stored request and response content

That proves:

1. the sessions were real
2. ingestion was happening
3. the public live-session builder dropped real active work

### Backend Failure Mode

There are two visibility lanes:

1. projected admin sessions
2. public direct-session backfill

`direct` traffic is intentionally excluded from admin session projection, so visibility for those requests depends entirely on the public backfill path.

The deployed public live-session service is too narrow:

- it reads only archived direct attempts
- it keys them primarily by `prompt_cache_key`
- if that key is missing, the local fallback only accepts `cli_provider_pinned`
- the traced missing requests were `fallback_provider_selected`

So current active Codex fallback traffic can be archived successfully and still disappear from `/v1/public/innies/live-sessions`.

## Correct Product Shape

The old good experience was a composite:

1. a merged monitor feed contract
2. a live-session carousel renderer
3. a separate archive/context surface

The old merged contract matters because it split one live screen into three streams:

- one heartbeat item per active lane in `live_sessions`
- prompt/event rows in `latest_prompts`
- archived summaries plus bounded archive events in `archive_trail`

The old carousel matters because the main visual surface the user is asking for was not the tabbed rail. It was the horizontally scrollable `LIVE CLI SESSIONS` panel carousel that turned `live_sessions` plus `latest_prompts` into one card per active lane.

`archive_trail` still belongs on the page, but not inside those cards.

## Source Of Truth

### Backend behavior source

Use the current Innies backend surface, fixed at the public live-session layer:

- `/Users/dylanvu/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`
- `/Users/dylanvu/innies/api/src/routes/publicInnies.ts`

### Merged monitor feed source

Use the recovered old monitor route and merger as the `/v2` data seam:

- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-route/ui/src/app/api/innies/monitor/activity/route.ts`
- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-route/ui/src/lib/inniesMonitor/server.ts`
- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/hooks/useInniesMonitorActivity.ts`
- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/features/innies-monitor/adapters/activityFeed.ts`

### Literal live carousel source

Use the old live-session carousel as the primary `/v2` visual target:

- `/Users/dylanvu/innies/.worktrees/innies-v2-demo-copy/ui/src/features/innies-v2-demo/components/new-ui/LiveSessionsCarousel.tsx`

This source is the one that contains the explicit `LIVE CLI SESSIONS` header and the horizontal session panel carousel behavior.

### Archive/context surface source

Use the old monitor activity/context modules for the supporting historical surface:

- `/Users/dylanvu/innies/.worktrees/innies-v2-demo-copy/ui/src/features/innies-monitor/modules/ActivityRailModule.tsx`
- `/Users/dylanvu/innies/.worktrees/innies-v2-demo-copy/ui/src/features/innies-monitor/adapters/activityFeed.ts`

These are no longer the primary live-session surface, but they still define how `archive_trail` should be derived and presented.

## Scope

Included:

- fix Innies live-session visibility for active archived direct fallback traffic
- preserve the old merged `/api/innies/monitor/activity` contract for `/v2`
- replace the current `/v2` live-tab primary renderer with the old `LIVE CLI SESSIONS` horizontal carousel
- keep `archive_trail` visible as a separate context surface in the same `/v2` tab
- remove the tabbed rail as the primary live renderer
- stop using the current public one-card-per-session panel wall in `/v2`

Excluded:

- new live-session heuristics beyond what is needed to restore missing visibility
- redesigning the old carousel look
- introducing a hybrid mode that keeps both the tabbed rail and the carousel as first-class live surfaces
- changing unrelated analytics/chart panels
- changing prod deployment or infra automatically

## Recommended Approach

Do the fix in two stages, backend first.

### Stage 1: Innies backend truth repair

Fix the public live-session service so real active direct Codex fallback traffic can become a visible session instead of being silently dropped.

This must happen first because `/v2` is only trustworthy if the source feed is trustworthy.

### Stage 2: `/v2` literal UI restoration

Keep the merged monitor route and poller, but replace the current primary mounted surface with a composite UI:

- top or primary module: old `LIVE CLI SESSIONS` carousel
- supporting module: archive/context view built from `archive_trail`

This preserves the old feel the user is pointing at without regressing to the raw public session wall.

## Architecture

## 1. Innies Backend

### Current architecture

Today:

- projected admin sessions cover `openclaw`, `cli-claude`, and `cli-codex`
- `direct` requests are excluded from admin session grouping
- public live sessions are supposed to backfill that direct lane
- the backfill currently drops some real requests

### Target architecture

The public live-session service must treat archived `direct` requests as visible live candidates even when:

- `providerSelectionReason === "fallback_provider_selected"`
- `prompt_cache_key` is absent

The service must still avoid inventing unrelated groupings, but it must stop requiring the current overly narrow key derivation.

### Backend behavior requirements

- active direct requests that are archived within the live window must produce visible sessions
- `fallback_provider_selected` direct requests must not be dropped purely because they are not `cli_provider_pinned`
- if multiple attempts belong to the same logical direct session, they should still group stably
- the service must remain public-safe and continue using sanitized public text only
- existing admin-projected sessions must continue to work unchanged

## 2. `/v2` Monitor Feed Contract

`/v2` should keep using the merged monitor feed route:

- `GET /api/innies/monitor/activity`

That route must continue to flatten upstream sources into:

- `live_sessions`
- `latest_prompts`
- `archive_trail`

The old monitor semantics that matter must remain:

- `cache-control: no-store`
- `7.5s` client polling cadence
- stale/degraded preservation of last good payload
- bounded archive session and event fan-out
- no raw public session wall semantics in the UI layer

## 3. `/v2` Primary UI Surface

### Primary live module

The mounted `/v2` live tab must render a local lifted version of the old `LiveSessionsCarousel`.

That component must:

- read `useInniesMonitorActivity()`
- build one card per `live_sessions` item
- join matching `latest_prompts` items by `sessionKey`
- filter `tool_call` and `tool_result` from the visible card trail, matching the old component behavior
- sort cards by latest activity
- render a horizontal scroll surface
- preserve per-card vertical transcript scrolling
- preserve the explicit `LIVE CLI SESSIONS` heading

### Supporting archive surface

`archive_trail` must remain visible in the live tab, but not inside the live cards.

The supporting archive surface can be a slimmed local module derived from the old activity/context rail behavior, but its job is only:

- archive session summaries
- bounded archive event rows
- degraded/loading/empty archive state

The supporting surface must not replace the carousel as the main live UI.

## UI Drift To Remove

The current worktree contains two wrong directions:

1. tabbed activity rail as the primary live tab UI
2. public panel wall / grid of public sessions

Both are wrong for the approved target.

The final `/v2` live tab should feel like:

- `LIVE CLI SESSIONS` horizontal session panels first
- archive context alongside or below
- no “pick one stream tab first” requirement
- no one-card-per-public-session wall

## File Ownership

### Innies backend

- Modify: `/Users/dylanvu/innies/api/src/services/publicInnies/publicLiveSessionsService.ts`
- Possibly modify: `/Users/dylanvu/innies/api/tests/publicLiveSessionsService.test.ts`

### `/v2` merged monitor seam

- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/app/api/innies/monitor/activity/route.ts`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/lib/inniesMonitor/server.ts`
- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/hooks/useInniesMonitorActivity.ts`

### `/v2` primary UI

- Modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/InniesV2LiveSessionsTab.tsx`
- Create: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/LiveSessionsCarousel.tsx`
- Create or modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/liveSessionsCarousel.module.css`

### `/v2` archive/context support

- Create or modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/components/live/ArchiveTrailPanel.tsx`
- Create or modify: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone/src/features/innies-monitor/adapters/activityFeed.ts`

The current `ActivityRailModule.tsx` can be deleted, demoted, or mined for archive rendering pieces, but it should not remain the primary mounted live-tab renderer.

## Testing Strategy

### Backend tests

Add failing tests first in `innies` for:

- direct archived attempt with `fallback_provider_selected` becomes visible
- direct archived attempt without `prompt_cache_key` still receives a stable visible session
- visible direct session remains in-window and carries prompt trail rows

### `/v2` source-level tests

Update the existing `/v2` test to assert the new literal target:

- `LIVE CLI SESSIONS` header is present
- carousel joins `live_sessions` and `latest_prompts`
- `archive_trail` supporting surface is present
- tabbed rail-specific primary markers are absent
- current public panel wall strings are absent from the `/v2` live tab host

### Runtime verification

After backend patch:

- verify `/v1/public/innies/live-sessions` returns visible sessions during active Codex work
- verify `/api/innies/monitor/activity` includes corresponding `live_sessions` and `latest_prompts`
- verify `http://localhost:3000/v2` renders the carousel with live cards instead of zero-state drift

## Risks

### Session key stability

The backend fix must choose a stable direct-session grouping rule without accidentally merging unrelated requests.

### Dirty backend worktree

`/Users/dylanvu/innies` is already dirty in the same area. Any patch must preserve existing user work and avoid reverting unrelated changes.

### UI source mismatch

There are now three similar but distinct UI surfaces in play:

- old tabbed rail
- public panel wall
- old live-session carousel

Implementation must use the right one for the right purpose or the product will drift again.

## Success Criteria

The fix is complete when all of the following are true:

- active Codex sessions through Innies appear in `/v1/public/innies/live-sessions`
- `/api/innies/monitor/activity` exposes `live_sessions`, `latest_prompts`, and `archive_trail` from real current traffic
- `/v2` shows the old `LIVE CLI SESSIONS` horizontal carousel as the main live surface
- `archive_trail` remains visible as supporting context
- the tab no longer looks like the tabbed rail-first monitor or the raw public panel wall
