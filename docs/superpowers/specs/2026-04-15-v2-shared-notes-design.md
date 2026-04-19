# V2 Shared Notes Design

Date: 2026-04-15
Target: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone`
Route: `/v2`
Tab: `notes.md`

## Goal

Turn the existing placeholder `notes.md` tab in the `/v2` VS Code-style landing page into a durable, shared, free-form text editor.

Anyone who visits `/v2` should be able to open `notes.md`, type arbitrary text, create new lines, and see saved content that persists for future visitors. Updates should propagate to other open visitors in near real time.

## Scope

Included:

- Durable persistence for the shared `notes.md` document in Postgres
- Public read access
- Public write access
- Near-real-time propagation across open clients
- Autosave while typing
- Inline editor surface inside the existing `/v2` shell
- Manual SQL migration provided to the user

Excluded:

- Authentication or edit gating
- Per-user drafts or cursors
- Rich text or markdown rendering
- Multiple collaborative documents beyond the single `notes.md` document
- Character-level merge logic or CRDTs
- Edit history browser or rollback UI

## Recommended Approach

Use a single Postgres-backed document row plus Server-Sent Events driven by Postgres `LISTEN/NOTIFY`.

Why:

- The repo already has a clear adjacent pattern in the broader Innies codebase: `DATABASE_URL` plus `pg`.
- The feature needs durability and shared visibility, but not a full collaborative editing stack.
- SSE is enough for one-way fanout from the server to browsers and is simpler to operate in this Next.js app than introducing websocket infrastructure.
- A single shared document avoids premature abstraction while still leaving room to generalize later.

## Architecture

### Persistence

Add a Postgres table for shared text documents, seeded manually with one row for `notes.md`.

Suggested schema:

- `id text primary key`
- `content text not null default ''`
- `revision bigint not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Initial row:

- `id = 'v2:notes.md'`
- `content = ''`

### Server Runtime

Add a small server-only Postgres helper in this repo that reads `DATABASE_URL` and creates:

- a pooled query client for normal reads/writes
- ad hoc dedicated `pg.Client` connections for `LISTEN/NOTIFY` subscribers

The helper should stay local to this repo and mirror the simple shape already used in the Innies backend.

### HTTP Surface

Add three Next.js App Router endpoints:

- `GET /api/v2/notes`
  Returns the current document payload:
  - `id`
  - `content`
  - `revision`
  - `updatedAt`

- `PUT /api/v2/notes`
  Accepts:
  - `content: string`
  - optional `baseRevision: number | null`

  Behavior:
  - upsert or update the `v2:notes.md` row
  - increment `revision`
  - set `updated_at = now()`
  - emit a Postgres `NOTIFY`
  - return the saved payload

- `GET /api/v2/notes/stream`
  Opens an SSE stream.
  On connect:
  - subscribes to the Postgres notification channel
  - emits an initial keepalive or ready event
  - forwards new saved document payloads as SSE messages

### Client

Replace the blank `notes.md` tab content with a client editor component that:

- loads the current document from `GET /api/v2/notes`
- renders a full-size multiline plain-text editor
- tracks dirty state locally
- saves changes with a short debounce
- listens to `EventSource('/api/v2/notes/stream')`
- applies remote updates when safe

The visual treatment should stay aligned with the current `/v2` editor shell:

- monospaced editor text
- transparent or matching dark panel background
- no rich text toolbar
- simple inline status text only

## Sync and Conflict Model

This is not a CRDT editor. Use a pragmatic last-write-wins model with lightweight guardrails.

Client rules:

- If the editor is not dirty, apply remote document updates immediately.
- If the editor is dirty and a newer remote revision arrives, do not overwrite the local text in place.
- Instead, show a small status message like `remote update available` and keep the local draft intact.
- The next successful local save wins and becomes the newest shared revision.

Server rules:

- `baseRevision` is accepted for observability but does not block writes in the first pass.
- All successful writes increment the canonical revision and notify listeners.

This keeps the behavior understandable:

- visitors see live changes when idle
- active typists do not lose in-progress local text from remote pushes
- no merge UI is required

## Error Handling

### Database unavailable

- `GET /api/v2/notes` returns `500` with a small JSON error payload
- `PUT /api/v2/notes` returns `500`
- `GET /api/v2/notes/stream` terminates the SSE connection
- the client shows a terse status such as `offline` or `save failed`

### Invalid payload

- reject non-string `content` with `400`
- optionally cap size to a reasonable limit in the route, such as `50000` characters

### Stream disconnects

- rely on browser `EventSource` auto-reconnect behavior
- keep the SSE endpoint heartbeat alive so idle proxies do not close it as aggressively

## Testing

Follow repo-local tests first, then build/runtime verification.

Automated coverage in this repo should verify:

- `notes.md` no longer renders an empty tab
- the notes editor component is wired into the tab switch
- the new API routes exist
- the server notes layer references `DATABASE_URL`, `pg`, and `LISTEN/NOTIFY`
- the client editor uses `fetch` plus `EventSource`

Preferred runtime verification:

- open two `/v2` tabs locally
- edit in one tab
- confirm the other tab receives updates in near real time when idle
- confirm refresh preserves saved content

## Migration

Manual SQL migration is expected. The implementation should not attempt to manage migrations automatically.

Provide the user with SQL for:

- creating the table
- creating the trigger or helper function needed to keep `updated_at` fresh, if used
- inserting the initial `v2:notes.md` row if missing

Keep the SQL idempotent where practical.

## File Shape

Planned additions:

- `src/app/api/v2/notes/route.ts`
- `src/app/api/v2/notes/stream/route.ts`
- `src/components/vscodeV2/SharedNotesTab.tsx`
- `src/lib/v2Notes/db.ts`
- `src/lib/v2Notes/repository.ts`

Planned modifications:

- `package.json`
- `pnpm-lock.yaml`
- `src/components/vscodeV2/TabContent.tsx`
- `tests/percentV2Landing.test.mjs`

## Notes

- Public anonymous editing is intentional for this pass.
- The first pass optimizes for durability and shared visibility, not perfect concurrent merge semantics.
- If this becomes noisy or abused later, auth and rate limiting can be layered on without replacing the document model.
