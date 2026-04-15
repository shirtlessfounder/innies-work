# V2 Live Monitor Activity Literal Port Design

Date: 2026-04-15
Target: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone`
Route: `/v2`
Tab: `watch-me-work.md`
Intent: literal `1:1` port of the old Innies monitor activity feed shape into the current live-tab mount

## Goal

Replace the current `/v2` live tab session-card carousel with the exact old Innies monitor activity flow that felt right before:

- one `live_sessions` heartbeat item per active lane
- separate `latest_prompts` items underneath
- `archive_trail` context alongside the live feed

The target is not “similar semantics” and not “same data, new UI.” The target is a literal behavioral port of the old monitor activity stack, with only the smallest repo-local rewiring needed to run inside this worktree.

## Source Of Truth

The port must copy behavior from these recovered old Innies monitor files:

- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-route/ui/src/app/api/innies/monitor/activity/route.ts`
- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-route/ui/src/lib/inniesMonitor/server.ts`
- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/hooks/useInniesMonitorActivity.ts`
- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/features/innies-monitor/adapters/activityFeed.ts`
- `/Users/dylanvu/innies/.worktrees/agent-innies-monitor-activity-rail/ui/src/features/innies-monitor/modules/ActivityRailModule.tsx`

These old files define the exact contract and renderer that must be reproduced. Current `percent-v2-clone` files are only a partial lift and are not the source of truth where they differ.

## Current Drift To Remove

The current worktree already lifted part of the old stack, but it drifted in ways that matter:

- `src/components/live/LiveSessionsCarousel.tsx` collapses the feed back into one card per session
- `archive_trail` is ignored by the renderer
- `tool_call` and `tool_result` are filtered to fit the carousel model
- `src/hooks/useInniesMonitorActivity.ts` polls every `2_000ms` instead of `7_500ms`
- the current route accepts a `window` query, which the old monitor route did not
- the current item model carries `buyerApiKeyId`, which the old monitor payload did not
- the current server softens archive requirements and falls back to live-only behavior, while the old server used the original stricter contract

All of this drift must be removed.

## Scope

Included:

- literal port of the old monitor activity route, server normalizer, client hook, adapter, and rail UI behavior
- replacement of the current live-tab carousel mount with the old activity rail model
- minimal styling and import rewiring required to make the old rail run in this repo
- test updates that lock the old rail behavior instead of the current carousel behavior

Excluded:

- preserving `buyerApiKeyId` in the monitor payload
- preserving the current `window` query parameter or `window="24h"` tab prop
- keeping the current carousel as a fallback, companion, or hybrid mode
- adding new filtering, grouping, pagination, or personalization not present in the old monitor stack
- fixing unrelated `/v2` tab work or unrelated dirty files in the worktree

## Recommended Approach

Transplant the old monitor stack directly and let the current `/v2` live tab act only as the host surface.

Why this is the right approach:

- the user requirement is literal `1:1`, not approximation
- the exact old source files have been recovered locally
- the current partial lift already proved that rebuilding from the live-session wall causes drift
- the old stack already solves the real shape problem by separating session heartbeat, prompt/event trail, and archive context

## Architecture

### Live Tab Host

Keep the current `/v2` tab routing:

- `src/components/vscodeV2/TabContent.tsx`
- `src/components/live/InniesV2LiveSessionsTab.tsx`

But change the mounted content so the tab renders the old activity rail flow instead of `LiveSessionsCarousel`.

The `/v2` shell remains the outer host. The inner live-tab content becomes the old monitor activity rail.

### Backend Contract

Port the old route and server behavior exactly:

- `GET /api/innies/monitor/activity`
- no `window` query parameter
- `cache-control: no-store`
- response payload shape:
  - `generatedAt`
  - `liveStatus`
  - `items`

The server must merge:

- `/v1/public/innies/live-sessions`
- `/v1/admin/archive/sessions`
- bounded `/v1/admin/archive/sessions/:sessionKey/events`

And flatten them into exactly three streams:

- `live_sessions`
- `latest_prompts`
- `archive_trail`

### Old Server Semantics To Preserve

The port must preserve these old semantics:

- strict env-driven config
- no optional live-only archive fallback
- global `MAX_ACTIVITY_ITEMS = 160` trim after sort
- archive fan-out bounded by:
  - `ARCHIVE_SESSION_LIMIT = 12`
  - `ARCHIVE_EVENT_SESSION_FANOUT = 6`
  - `ARCHIVE_EVENTS_PER_SESSION_LIMIT = 8`
- `liveStatus` derived from the old stale/degraded rules
- item model fields limited to the old set:
  - `id`
  - `stream`
  - `kind`
  - `occurredAt`
  - `title`
  - `detail`
  - `sessionKey`
  - `sessionType`
  - `provider`
  - `model`
  - `status`
  - `href`

Notably, the old payload did not include `buyerApiKeyId`, so the port must not invent or preserve it.

### Client Polling

Port the old client hook behavior exactly:

- `INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS = 7_500`
- `STALE_GRACE_PERIOD_MS = poll interval * 2`
- initial load shows `loading`
- last good payload is preserved through one stale cycle
- failures degrade the feed instead of blanking immediately
- polling hits `/api/innies/monitor/activity` with `cache: 'no-store'`

The hook should match the old monitor behavior, not the current live-tab hook signature.

### Activity Rail Adapter

Port the old adapter logic that transforms the payload into three sections:

- `LIVE SESSIONS`
- `LATEST PROMPTS`
- `ARCHIVE TRAIL`

The adapter must preserve:

- old section order
- old section summaries
- old empty-state titles and details
- old tone mapping
- old “preferred section” selection behavior when some streams are empty

This adapter is what prevents the UI from collapsing back to “one card per chat.”

### Activity Rail UI

Port the old `ActivityRailModule` behavior exactly:

- segmented stream tabs
- live-status badge
- summary line showing poll cadence, freshness, and degraded error text
- one list surface for the currently selected stream
- row/card rendering for entries derived from the adapter
- exact old empty-state logic for `loading`, `degraded`, and empty sections

This is the old shape that felt smoother. The tab must stop rendering horizontal session cards entirely.

## Repo-Local Adaptations Allowed

Only non-behavioral adaptations are allowed:

- import path rewrites to match this repo layout
- extensionless TypeScript imports where this repo requires them
- local relocation of the module CSS used by the old rail
- local formatting helper extraction if the old module depended on helpers not present here

These are compatibility rewires, not design changes.

## CSS Strategy

The old `ActivityRailModule` depended on `ui/src/features/innies-monitor/inniesMonitor.module.css`.

This repo should port only the CSS selectors actually needed by the old rail module into a local CSS module, preserving the old visual treatment used by:

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

The goal is to preserve the old rail presentation inside the `/v2` tab, not to keep the current carousel styling.

## File Shape

Expected worktree changes:

- Modify: `src/components/live/InniesV2LiveSessionsTab.tsx`
- Remove or stop using: `src/components/live/LiveSessionsCarousel.tsx`
- Remove or stop using: `src/components/live/liveSessionsCarousel.module.css`
- Modify: `src/app/api/innies/monitor/activity/route.ts`
- Modify: `src/lib/inniesMonitor/server.ts`
- Modify: `src/hooks/useInniesMonitorActivity.ts`
- Create: `src/features/innies-monitor/adapters/activityFeed.ts`
- Create: `src/features/innies-monitor/modules/ActivityRailModule.tsx`
- Create: `src/features/innies-monitor/inniesMonitor.module.css`
- Modify: `tests/v2LiveSessionsTab.test.mjs`

Possible env/runtime verification inputs:

- `.env.local`

## Testing

Source-level regression coverage should lock the literal-port boundary:

- `InniesV2LiveSessionsTab` mounts the old activity rail path, not `LiveSessionsCarousel`
- `useInniesMonitorActivity.ts` uses `7_500` polling and no `window` parameter
- `route.ts` no longer normalizes or reads a `window` query
- `server.ts` exposes only the old monitor item shape and old stream flattening behavior
- `activityFeed.ts` defines the three old stream sections with the old labels and summaries
- the live tab no longer filters the feed through session-card grouping code

Runtime verification should cover:

- local route returns the merged three-stream payload with `cache-control: no-store`
- degraded behavior preserves last good payload through one stale cycle
- archive trail appears when admin env is present
- the `/v2` live tab renders stream tabs and entry rows, not horizontal session cards

## Risks And Constraints

- The old server contract is stricter than the current partial lift. Missing archive env now fails differently, and that is part of the literal-port requirement.
- The old monitor payload omitted `buyerApiKeyId`. Any current code depending on that field in the live tab must be removed, not adapted.
- The old route worktree used a `.ts` import suffix that caused a build issue in that repo. The port should preserve behavior while adapting import syntax to this repo’s build conventions.

## Acceptance Criteria

The work is correct only if all of the following are true:

- the `/v2` live tab no longer feels like a public live-session wall or a session carousel
- the tab exposes the exact old three-stream model: `live_sessions`, `latest_prompts`, `archive_trail`
- polling cadence and stale/degraded behavior match the old monitor hook
- the route and server contract match the old monitor stack rather than the current partial lift
- the implementation is a transplant of the recovered old source, not a new approximation
