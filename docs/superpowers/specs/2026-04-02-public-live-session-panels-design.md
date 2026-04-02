# Public Live Session Panels Design

Date: 2026-04-02
Primary frontend target: `/Users/dylanvu/innies-work`
Upstream data source and trust boundary: `/Users/dylanvu/innies`

## Goal

Turn `innies-work` into a public proof-of-work surface that shows semi-live panels for AI conversations currently happening through the public `innies` org.

The page should feel like a live wall of work:

- each active session gets its own panel
- panels appear when a session becomes active
- panels disappear after inactivity
- revived sessions come back with recent context
- transcript text should be close to exact conversation text, but secrets and other sensitive material must be redacted before anything becomes public

## Product Intent

This is primarily a public proof-of-work surface, not an internal admin dashboard.

That means the design should optimize for:

- spectators quickly seeing that real work is happening
- preserving the character of real transcripts instead of collapsing everything into summaries
- keeping the panel language visually aligned with the existing `innies` console and `/onboard` workspace aesthetic

It should not optimize for:

- full internal observability
- raw admin fidelity
- exhaustively exposing every event and every archived artifact

## Current State

### `innies`

`innies` already owns the useful session and conversation truth:

- admin archive session index
- admin archive session events
- admin archive request attempt drilldown

These surfaces are admin-only and are not safe to expose directly to the public web.

For this feature, archive/session truth is sufficient. The analysis projection should stay out of scope because it is derived metadata, not transcript-grade conversation truth.

### `innies-work`

`innies-work` is currently a standalone Next app with a static landing page. It already shares the `innies` visual language and includes a homepage shell that can be extended with a live section under the hero.

### Existing panel language

The `/onboard` route in `innies` already has the right panel aesthetic:

- editor-window chrome
- monospaced workspace framing
- multi-panel grid
- active workspace metadata
- scrollable pane bodies

That panel language should be reused in spirit for the live conversation wall, but the body content should become transcript rows rather than markdown line rows.

## Chosen Architecture

Use a two-repo split:

1. `innies` produces a public-safe live session feed for the `innies` org.
2. `innies-work` consumes that feed and renders the panel wall.

This is the chosen approach because the redaction boundary belongs in the system that owns the raw transcript data.

### Why not redact in `innies-work`

Redacting in `innies-work` would make the public microsite responsible for deciding what is safe. That is the wrong trust boundary because:

- `innies-work` should never need admin credentials or raw archive access
- redaction rules would drift away from the source system
- future public consumers would duplicate the same logic

### Why not use a precomputed cron snapshot first

A cron-written snapshot would work, but it adds extra moving parts before the public feed contract is stable. A live feed with polling every 30 seconds is simpler, more flexible, and still comfortably within the requested latency budget.

### Scope simplifications

To keep the first version tight without meaningful product loss:

- use archive/session truth only
- ship one public feed only in v1
- keep panel ranking/layout decisions in `innies-work`, not the API
- poll and replace the full session list every 30 seconds
- avoid a local `innies-work` proxy unless deployment or CORS constraints force one

## High-Level Flow

```text
Innies archive/admin session truth
  -> public live session feed builder in innies
  -> strict transcript sanitization and event shaping
  -> public safe JSON feed
  -> innies-work polling every 30s
  -> homepage live panel section
```

## Session Model

Each panel represents one Innies session identity, not one request.

Examples:

- one OpenClaw session gets one panel
- one CLI session gets one panel
- retries and provider failovers within that session stay inside the same panel

The source identity should come from the archive session projection, using the existing session model already exposed by archive/admin surfaces.

### Active session rule

A session is active if:

- `lastActivityAt >= now - 15 minutes`

### Panel lifecycle

- inactive -> active: panel appears
- active -> still active: panel stays and refreshes
- active -> idle for more than 15 minutes: panel disappears
- previously idle -> active again: panel reappears as a revived session

### Revived session behavior

When a session reappears after being idle, the panel should preload recent transcript context so the viewer does not experience it as an empty new card.

The feed should include:

- up to the last 1 hour of transcript history for that session

The public API does not need an explicit `isRevived` field in v1. Reappearance plus recent warm history is enough to communicate revival.

## Transcript Model

The public transcript must feel real without exposing unsafe internal content.

### Include

- user messages
- final assistant responses
- tool call messages
- tool result messages
- provider/model switch markers

### Exclude

- chain-of-thought
- reasoning blocks
- thinking deltas
- intermediate streaming fragments
- raw SSE noise
- raw blob payloads and diagnostics

### Final assistant response rule

The public feed should only emit finalized assistant response text that reads like a complete turn. It should not show partial in-flight deltas or internal intermediate thoughts.

### Tool event handling

Tool calls and tool results should remain visible because they make the work legible and impressive for public viewers. They are part of the proof-of-work story.

### Provider/model switch markers

When a later attempt in the same session changes provider or model, the feed should emit a synthetic transcript marker so viewers can see the routing change. This is especially valuable for failover and rescue scenarios.

## Public Feed Contract

Add a new public endpoint in `innies`.

Suggested path:

- `GET /v1/public/innies/live-sessions`

The exact path can change if route organization demands it, but the contract should remain stable.

### Feed responsibilities

The `innies` public feed should:

- be hard-wired to the public `innies` org
- expose only active sessions
- sort sessions by newest activity first
- include a bounded recent transcript per session
- sanitize all public text before returning it
- return panel-ready entries so `innies-work` stays presentation-focused

### Suggested response shape

```json
{
  "generatedAt": "2026-04-02T20:15:00.000Z",
  "pollIntervalSeconds": 30,
  "idleTimeoutSeconds": 900,
  "historyWindowSeconds": 3600,
  "sessions": [
    {
      "sessionKey": "openclaw:run:run_1",
      "sessionType": "openclaw",
      "displayTitle": "openclaw · run_1",
      "startedAt": "2026-04-02T19:40:00.000Z",
      "lastActivityAt": "2026-04-02T20:14:41.000Z",
      "currentProvider": "openai",
      "currentModel": "gpt-5.4",
      "entries": [
        {
          "entryId": "req_1:1:user:0",
          "kind": "user",
          "at": "2026-04-02T20:12:00.000Z",
          "text": "ship the endpoint"
        },
        {
          "entryId": "req_1:1:tool_call:1",
          "kind": "tool_call",
          "at": "2026-04-02T20:12:10.000Z",
          "toolName": "grep",
          "argsText": "pattern=migration"
        },
        {
          "entryId": "req_1:1:tool_result:2",
          "kind": "tool_result",
          "at": "2026-04-02T20:12:14.000Z",
          "text": "2 matches found"
        },
        {
          "entryId": "req_1:2:provider_switch",
          "kind": "provider_switch",
          "at": "2026-04-02T20:12:20.000Z",
          "fromProvider": "anthropic",
          "toProvider": "openai",
          "fromModel": "claude-opus-4-6",
          "toModel": "gpt-5.4"
        },
        {
          "entryId": "req_1:2:assistant:0",
          "kind": "assistant_final",
          "at": "2026-04-02T20:12:30.000Z",
          "text": "I found the mismatch and updated the migration."
        }
      ]
    }
  ]
}
```

## Feed Limits

The feed should be bounded even though the UI is public and scrollable.

Recommended limits:

- active sessions returned: newest 24 sessions maximum
- transcript window per session: last 1 hour
- transcript entries per session: cap at 120 display entries after shaping

Reason:

- prevents one noisy session from exploding payload size
- keeps the public page responsive
- still preserves enough context for revived sessions and tool-heavy workflows

## Deriving Public Transcript Entries

The public feed builder in `innies` should not call its own HTTP endpoints. It should use internal services or repository-backed readers directly.

Suggested derivation steps:

1. read candidate sessions from archive/admin session truth for the `innies` org
2. filter to `lastActivityAt >= now - 15 minutes`
3. for each active session, load session events covering the last 1 hour
4. shape events into public entries
5. sanitize every public text field
6. sort sessions by `lastActivityAt desc`
7. emit bounded response

### Event-to-entry mapping

- request message with user text -> `user`
- response message with final assistant text -> `assistant_final`
- message content with tool call parts -> `tool_call`
- message content with tool result parts -> `tool_result`
- provider/model changes across attempts -> `provider_switch`

Attempt status should remain an internal derivation aid in v1, not a public transcript row.

### Display title derivation

Each panel needs a readable public identity.

Recommended shape:

- one `displayTitle`
  - `openclaw · run_1`
  - `cli codex · abc123`
  - `cli claude · req_42`

This keeps panels understandable even when several concurrent sessions share the same session type.

## Redaction and Sanitization

This is the critical security boundary.

### Rule

No text reaches the public feed until it passes a sanitization pass.

### Text fields to sanitize

- user message text
- assistant final text
- tool call argument text
- tool result text
- any synthesized labels that embed raw metadata

### Redaction targets

At minimum:

- API keys
- bearer tokens
- session tokens
- cookie values
- OAuth credentials
- credential-like headers
- obvious secret env var values

Recommended additional protection:

- email addresses
- phone numbers
- clearly sensitive machine-local paths if they expose private operator details

### Replacement style

Replace sensitive spans with readable placeholders rather than deleting them outright:

- `[REDACTED_TOKEN]`
- `[REDACTED_CREDENTIAL]`
- `[REDACTED_EMAIL]`
- `[REDACTED_PATH]`

This keeps the conversation coherent while still protecting secrets.

### Non-goal

Do not attempt to make this a perfect enterprise DLP system on day one. Start with robust secret-pattern redaction plus a clear allow-public boundary, then tighten over time as real transcripts surface edge cases.

## `innies-work` Frontend Design

The homepage should keep its hero for now and render the live panel wall below it.

### Placement

- hero stays at the top
- live session section appears directly below the current homepage content

### Visual language

Reuse the `/onboard` panel aesthetic:

- workspace framing
- pane chrome
- monospaced operator styling
- translucent console surfaces

But replace line-number markdown rendering with transcript rows.

### Section structure

The live section should have:

1. a featured row for the newest active sessions
2. a collapsed overflow area labeled like `more active sessions`
3. expandable scroll behavior for the overflow area

### Ordering

Panels are ordered by most recently active first and should reorder as activity changes.

This is the right trade-off for a proof-of-work wall because freshness matters more than stable physical position.

### Panel header

Each panel header should show:

- session display title
- live status
- last activity time
- current provider/model chips or compact badges

### Panel body

The transcript body should show styled row types:

- user turns
- final assistant turns
- tool call rows
- tool result rows
- provider/model switch rows

This should feel closer to a wall of active terminals than a consumer chat UI.

## Polling Model

`innies-work` should poll every 30 seconds.

Recommended client behavior:

- initial fetch on mount
- repeat fetch every 30 seconds
- replace local session list with latest server truth
- preserve simple loading and failure states

The frontend should call the Innies public feed directly by default. Add an `innies-work` pass-through route only if deployment constraints require it.

### Why polling is sufficient

- the requested freshness is semi-live, not second-by-second
- public proof-of-work does not need websocket complexity
- 30-second polling keeps the implementation simple and robust

## Failure Behavior

### Upstream feed unavailable

If the public feed fails:

- keep the last successful payload rendered for one refresh cycle if possible
- show a subtle stale badge or timestamp
- do not blank the whole page immediately unless no successful payload has ever loaded

### Empty active set

If no sessions are active:

- show an intentional empty state like `no active innies right now`
- keep the section framing visible so the page still reads as a live workspace, just currently quiet

### Sanitization failure

If any transcript entry cannot be safely sanitized:

- drop or replace only the affected text field
- keep the session visible when possible
- never fail open

## Performance Considerations

The public feed builder in `innies` should:

- keep the number of candidate sessions bounded
- only read the last 1 hour of events per returned session
- avoid building transcript state from the entire archive history

The `innies-work` frontend should:

- render compact transcript panels
- avoid excessive client-side reconciliation complexity
- support scrolling in overflow rather than inflating the whole page indefinitely

## Security Boundary

This feature must preserve a clean boundary:

- `innies` may read admin/archive truth internally
- public clients and `innies-work` may only read the sanitized public feed
- `innies-work` must not hold or use admin credentials

## Verification

Minimum validation:

- active sessions appear within the polling window
- sessions disappear after crossing the 15 minute idle threshold
- revived sessions return with recent history
- tool call and tool result rows render correctly
- provider/model switch markers appear when attempts change routing
- reasoning text is not shown
- secrets are redacted before public output

Preferred validation:

- create one OpenClaw session and one CLI session and confirm they render as separate panels
- trigger a provider failover and confirm a switch marker appears
- include a known fake secret in a prompt or tool result and confirm replacement text appears instead of the raw value
- compare the `/onboard` panel language with the new live panel wall and keep them in the same visual family

## Out of Scope

- full public transcript search
- public transcript replay for inactive sessions
- multi-org public switching
- exact raw archive drilldown on `innies-work`
- websocket streaming
- exposing chain-of-thought or private reasoning
- public attempt-status transcript rows in v1

## Implementation Direction

The implementation should proceed in two tracks:

1. `innies`
   - add the public live session feed and sanitization pipeline
2. `innies-work`
   - add the live panel section and polling client below the homepage hero

The API and sanitization boundary should ship before the frontend depends on unstable internal admin endpoints.
