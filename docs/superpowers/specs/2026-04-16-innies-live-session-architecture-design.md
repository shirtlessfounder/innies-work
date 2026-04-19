# Innies Live Session Architecture Design

Date: 2026-04-16
UI worktree: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone`
Backend repo: `/Users/dylanvu/Projects/oss/innies`
Primary surface: `/v2?tab=watch-me-work.md`

## Goal

Refactor the Watch Me Work live-session pipeline so:

- one real routed live session maps to one stable lane/card/panel
- multiple real sessions are never collapsed into one live pane
- every persisted message/event between the buyer key and Innies routes remains queryable and renderable
- the existing monitor UI contract stays unchanged:
  - `live_sessions`
  - `latest_prompts`
  - `archive_trail`

## Decision Summary

Chosen approach: Option 2, backend-first.

- `innies` becomes the source of truth for canonical live-lane identity.
- `innies-work` stays a consumer and cleanup repo, not the place that decides lane identity.
- The local duplicate-key issue remains in scope as a separate reliability cleanup, not the main architecture fix.

## Non-Goals

- implementing the refactor in this session
- redesigning `/v2`
- treating the local `4010` proxy shim as the desired architecture
- making the UI responsible for reconstructing canonical lanes from DB/admin fragments
- making `in_live_lane_events` a second authoritative transcript store

## Source-Backed Diagnosis

The root fault is in Innies live-session materialization, not raw persistence and not React.

What was proven:

1. `innies codex` already injects stable session identity and provider pin.
   - `cli/src/commands/codex.js`
   - sends `x-openclaw-session-id`
   - sends `x-innies-provider-pin`

2. The proxy already preserves `openclaw_session_id`.
   - `api/src/routes/proxy.ts`
   - `resolveOpenClawCorrelation()` reads explicit or recovered OpenClaw session identity
   - `buildTokenRouteDecision()` persists both `request_source` and `openclaw_session_id`

3. Raw archive persistence already contains the real session truth.
   - `in_request_attempt_archives`
   - `in_request_attempt_messages`
   - `in_message_blobs`
   - DB re-verification showed multiple distinct `openclaw_session_id` values for buyer key `f3f97490-540f-4d13-ba1b-2ad1adff1ff1`

4. The current projector path collapses those real sessions.
   - On checked-in ref `origin/main`, `api/src/services/adminArchive/sessionGrouping.ts` assigns `cli:idle:*`
   - `normalizeAdminRequestSource()` gives explicit `request_source` precedence over `openclaw_session_id`
   - current affected traffic is being stored as `request_source = cli-codex` and `provider_selection_reason = cli_provider_pinned` while still carrying distinct `openclaw_session_id`s
   - `in_admin_sessions` currently projects those attempts into a single `cli:idle:*` lane

5. The production public feed reads projected session identity rather than raw archive truth.
   - On checked-in ref `origin/main`, `/v1/public/innies/live-sessions` is owned by `api/src/routes/publicInnies.ts`
   - `api/src/services/publicInnies/publicLiveSessionsService.ts` reads from `in_admin_sessions` and `in_admin_session_attempts`
   - therefore the public feed inherits the same collapsed lane identity

6. The local shim looks correct only because it bypasses that collapse.
   - `scripts/localInniesMonitorProxy.mjs` reads raw archive/message tables and groups by `openclaw_session_id`
   - it reconstructs `cli:openclaw:<openclaw_session_id>` lanes downstream of the real backend

7. The specific React duplicate-key error is a local reliability bug.
   - `src/lib/inniesMonitor/localLiveOverlay.mjs` emits ids like `${ordinal}:user`
   - repeated ordinals across merged attempts collide
   - `src/components/live/LiveSessionsCarousel.tsx` correctly keys on those ids

Plain-English diagnosis:

Innies already knows the real live session identity at ingress and persistence time. The architecture goes wrong when the backend converts persisted attempts into a live lane model that is still anchored to `cli:idle` and idle-gap grouping. The local UI stack then compensates by rebuilding lanes from raw DB state. That compensation proves the data exists. It also proves the current backend lane model is not durable.

## Requirements

### Primary

- one real Innies Codex/OpenClaw instance equals one stable live lane
- no grouping of multiple real sessions into one pane
- every persisted message/event between the buyer key and Innies routes remains queryable and renderable
- preserve the old monitor UI contract:
  - `live_sessions`
  - `latest_prompts`
  - `archive_trail`

### Secondary

- design should work for all routed traffic, not just Codex/OpenClaw
- phase 1 can still prioritize the currently broken traffic, but the underlying live-lane model must be generalized

### Reliability

- unique event ids end to end
- no duplicate React key warnings in the canonical consumer path
- no dependency on the local DB-backed shim for correctness

## Approaches Considered

### Option 1: Keep the local reconstruction shim and harden it

What changes:

- minimal backend change
- keep `localInniesMonitorProxy.mjs`
- keep `localLiveOverlay.mjs`
- fix local `entryId` generation and dedupe locally

Trade-offs:

- lowest short-term effort
- highest long-term risk
- production semantics remain wrong
- backend ownership remains unclear

Verdict:

Reject as the long-term solution.

### Option 2: Refactor Innies backend to own canonical live lanes, keep current UI contract

What changes:

- add canonical live-lane materialization in `innies`
- rebuild `/v1/public/innies/live-sessions` on canonical lanes/events
- add backend monitor activity surface that still emits `live_sessions`, `latest_prompts`, `archive_trail`
- keep `innies-work` as a thin consumer

Trade-offs:

- moderate scope
- fixes the actual ownership boundary
- preserves current UI contract
- requires additive schema, projector, and read-path work in `innies`

Verdict:

Recommended.

### Option 3: Leave archive/admin and public paths in place, but tweak grouping precedence in the current projector

What changes:

- patch `sessionGrouping.ts`
- make stable session identity outrank `request_source` in the existing projector
- keep using existing `in_admin_sessions` as the main live substrate

Trade-offs:

- lower migration cost than option 2
- fixes part of the current bug
- still couples live lane identity to the archive/admin indexing model
- keeps `cli:idle` semantics too deep in the backend

Verdict:

Useful as temporary intuition, but not the final architecture for all traffic.

## Recommended Architecture

### 1. Ownership and boundaries

`innies` owns:

- lane classification
- canonical `lane_id`
- canonical event identity
- live-lane projection
- public live feed
- backend monitor activity surface

`innies-work` owns:

- consuming the existing monitor item shape
- minimal adapter cleanup
- temporary fallback/shim cleanup

Key correction:

- routing choice and lane identity are separate concerns
- `provider_selection_reason = cli_provider_pinned` can continue to mean "do not reroute provider plan"
- it must stop meaning "this request belongs in `cli:idle`"

### 2. Canonical identity model

Canonical identities:

- `lane_id`
  - canonical backend storage identity
  - internal joins and projections key on `lane_id`, not `session_key`
- `session_key`
  - canonical external/read identity for current consumers
  - derived from canonical lane identity
  - stable for the lifetime of a lane within its published scheme version
  - versionable later without changing `lane_id`
- `lane_source_kind`
  - describes the real underlying grouping source
- `lane_source_id`
  - the stable source identifier for that lane
- `lane_event_id`
  - canonical unique event identity

Internal rule:

- all joins, projector state, and derived read models key on `lane_id`
- `session_key` is a public/read representation, not the backend primary key

### 3. Lane classification rules

Every routed archived attempt must classify into exactly one lane.

Classification order:

1. durable stable session container
2. durable stable route-specific session container
3. request scope fallback

Phase 1 concrete rules:

- if `openclaw_session_id` is present and meaningful for the routed attempt:
  - `lane_source_kind = openclaw_session`
  - `lane_source_id = <openclaw_session_id>`
  - `session_key = cli:openclaw:<openclaw_session_id>`
- if another provider/route later has its own durable reusable session id:
  - map it to its own stable `lane_source_kind`
  - derive a route-specific `session_key`
- otherwise:
  - `lane_source_kind = request`
  - `lane_source_id = <request_id>`
  - `session_key = cli:request:<request_id>`

Explicit caution:

- do not use a run id as a lane source unless it truly represents a durable reusable conversational container
- a transient execution artifact must not outrank request scope
- phase 1 does not require `route_run` as a live-lane source

Important negative rule:

- `cli:idle:*` is not a canonical live-lane identity
- idle-gap timing is not a valid substitute for durable session identity

### 4. Canonical event identity

Canonical event ids must be deterministic from persisted source rows.

Recommended pattern:

- attempt status:
  - `laneevt:<request_attempt_archive_id>:attempt_status`
- request message:
  - `laneevt:<request_attempt_archive_id>:request:<ordinal>`
- response message:
  - `laneevt:<request_attempt_archive_id>:response:<ordinal>`

Properties:

- unique across attempts
- unique across request vs response sides
- rebuildable from archive truth
- safe for React keys

### 5. Live-lane storage model

Add a new additive live-lane projection in `innies`.

Suggested tables:

- `in_live_lane_projection_outbox`
  - queue of archived attempts awaiting live-lane projection
- `in_live_lanes`
  - keyed by `lane_id`
  - stores lane summary, timestamps, buyer key, provider/model rollups, latest request reference
- `in_live_lane_attempts`
  - maps every archived attempt to `lane_id`
  - enables membership diffs and auditability
- `in_live_lane_events`
  - keyed by `lane_event_id`
  - derived event read model for fast live rendering/querying

### 6. Event storage policy

`in_live_lane_events` is a projection, not a second transcript authority.

Authoritative provenance remains in:

- `in_request_attempt_archives`
- `in_request_attempt_messages`
- `in_message_blobs`
- `in_request_attempt_raw_blobs`
- `in_raw_blobs`

`in_live_lane_events` should be reference-first with selected render fields.

Store:

- provenance fields
  - `lane_event_id`
  - `lane_id`
  - `request_attempt_archive_id`
  - `request_id`
  - `attempt_no`
  - `side`
  - `ordinal`
  - `event_kind`
  - `event_time`
- render/query fields
  - `role`
  - `provider`
  - `model`
  - `status`
  - `render_text` or `render_summary`
  - small structured `render_meta` where needed
- bookkeeping
  - `projection_version`
  - `created_at`
  - `updated_at`

Do not:

- copy full normalized payloads wholesale into `in_live_lane_events`
- copy raw blobs there
- create independent retention semantics in phase 1

Retention/update policy:

- append-only or idempotent upsert per persisted source event
- rebuildable from archive truth if render shaping changes
- deleted or rebuilt consistently with archive retention, not independently

### 7. Backend read surfaces

#### Public live route

Keep:

- `GET /v1/public/innies/live-sessions`

Change:

- implementation reads canonical `in_live_lanes` and `in_live_lane_events`
- preserve current response shape

Required properties:

- one session per canonical lane
- stable `sessionKey`
- `buyerApiKeyId` populated when known
- unique `entries[].entryId`
- provider/model/timestamps derived from canonical lane state

#### Backend monitor activity route

Add a backend route that emits the same merged item shape the UI already consumes:

- `stream = live_sessions | latest_prompts | archive_trail`
- stable `id`
- stable `sessionKey`
- renderable provider/model/timestamp metadata

Phase 1 sourcing:

- `live_sessions` from canonical live lanes
- `latest_prompts` from canonical live-lane events
- `archive_trail` from existing archive/admin read services

### 8. Rollout

#### Phase 1: add canonical live-lane substrate

Add:

- new tables
- new outbox
- new projector job
- lane classifier
- read service

Do not cut consumers yet.

#### Phase 2: shadow verification

For affected traffic, continuously compare:

- raw archive truth
- legacy public feed
- canonical live-lane projection

Diff dimensions:

- lane count
- attempt membership per lane
- event count per lane
- latest activity timestamp per lane

Required reports:

- buyer-key filtered comparisons
- explicit mismatch buckets:
  - legacy-only lanes
  - canonical-only lanes
  - membership mismatches
  - event-count mismatches
  - timestamp mismatches

#### Phase 3: public live cutover

Switch `/v1/public/innies/live-sessions` to canonical lanes/events while preserving shape.

#### Phase 4: backend monitor activity route

Expose canonical backend monitor activity so `innies-work` can stop stitching together:

- public live feed
- archive sessions
- archive events
- latest request detail fallbacks
- local DB overlays

#### Phase 5: consumer cleanup in `innies-work`

Minimal adaptation only:

- switch the monitor server route to the backend monitor activity endpoint
- keep the current item shape
- remove local lane reconstruction from the correctness path
- keep duplicate-key cleanup as a separate reliability task until legacy fallback is gone

### 9. Cutover gates

Before advancing phases, require:

- no collapsed multi-session lanes for buyer-key filtered Codex/OpenClaw traffic
- unique event ids end to end
- no duplicate React key warnings in the canonical consumer path
- projector lag and feed latency within agreed thresholds
- no regression in the existing public response shape

### 10. `innies-work` cleanup strategy

Post-cutover:

- `src/lib/inniesMonitor/server.ts` should prefer the backend monitor activity path
- `localLiveOverlay.mjs` becomes fallback/debug only, then removable
- `archiveSessionBridge.mjs` becomes unnecessary for the live path
- `scripts/localInniesMonitorProxy.mjs` should not be required for normal `/v2` correctness

The duplicate-key cleanup remains separate:

- fix local synthesized ids only for fallback safety
- do not treat that fix as the architecture completion signal

## Success Criteria

- one real routed live session container equals one live lane
- no grouping of multiple real sessions into one live pane
- every persisted buyer-key-to-Innies message/event remains queryable through archive provenance
- `live_sessions`, `latest_prompts`, and `archive_trail` stay stable for consumers
- canonical feeds use unique ids throughout
- local reconstruction is no longer required for correctness

## Risks and Implementation Notes

- the current checkout of `innies` does not contain the public live route owner, while `origin/main` does; resolve that route-ownership mismatch early
- the current archive/admin projector remains useful for historical audit and indexing during migration, but it should stop being the live lane owner
- do not bake public `session_key` strings into backend joins or foreign keys
- do not let a run id become the next fake grouping source

