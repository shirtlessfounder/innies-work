# V2 Shared Notes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/v2` `notes.md` into a durable shared text editor backed by Postgres and near-real-time SSE updates.

**Architecture:** Add a small Postgres-backed notes repository keyed by the single shared document id `v2:notes.md`, expose read/write plus SSE endpoints from Next.js App Router, and replace the blank `notes.md` tab with a client editor that loads, autosaves, and subscribes to remote updates. Keep the concurrency model intentionally simple: idle clients apply remote updates immediately and local dirty drafts are preserved until their next save wins.

**Tech Stack:** Next.js App Router, React client components, TypeScript, `pg`, Node test runner, Postgres `LISTEN/NOTIFY`

---

## Chunk 1: Server Notes Foundation

### Task 1: Add regression coverage for the new notes feature surface

**Files:**
- Modify: `tests/percentV2Landing.test.mjs`

- [ ] **Step 1: Write failing source-level assertions for the shared notes feature**

Add assertions that expect:

- `TabContent.tsx` to render a dedicated notes component for `notes.md`
- `src/app/api/v2/notes/route.ts` to exist
- `src/app/api/v2/notes/stream/route.ts` to exist
- the notes server code to reference `DATABASE_URL`, `LISTEN`, and `NOTIFY`
- the client notes tab to reference `EventSource` and the `/api/v2/notes` routes

- [ ] **Step 2: Run the targeted test to verify it fails**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: FAIL because the notes files and wiring do not exist yet

### Task 2: Add the Postgres dependency and server data layer

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/lib/v2Notes/db.ts`
- Create: `src/lib/v2Notes/repository.ts`

- [ ] **Step 1: Add `pg` to dependencies**

Update `package.json` so the Next app can talk to the existing Postgres instance via `DATABASE_URL`.

- [ ] **Step 2: Write the minimal pooled DB helper**

Create `src/lib/v2Notes/db.ts` with:

- env validation for `DATABASE_URL`
- a cached `Pool`
- a helper for creating dedicated `Client` connections for SSE listeners

- [ ] **Step 3: Write the notes repository**

Create `src/lib/v2Notes/repository.ts` with focused functions:

- `getSharedNotesDocument()`
- `saveSharedNotesDocument(content, baseRevision?)`
- `listenForSharedNotesUpdates(onUpdate)`

The save path should:

- update or insert `v2:notes.md`
- increment `revision`
- emit `pg_notify`
- return the saved payload

- [ ] **Step 4: Run the targeted test again**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: still FAIL because API routes and client wiring do not exist yet

## Chunk 2: API Routes

### Task 3: Add the read/write notes route

**Files:**
- Create: `src/app/api/v2/notes/route.ts`
- Modify: `src/lib/v2Notes/repository.ts`

- [ ] **Step 1: Write the GET/PUT route**

Implement:

- `GET` to return the current shared document
- `PUT` to validate `{ content, baseRevision? }`, persist it, and return the saved payload

Validation rules:

- `content` must be a string
- reject oversized payloads

- [ ] **Step 2: Run the targeted test**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: still FAIL because the SSE route and notes client are not wired yet

### Task 4: Add the SSE stream route

**Files:**
- Create: `src/app/api/v2/notes/stream/route.ts`
- Modify: `src/lib/v2Notes/repository.ts`

- [ ] **Step 1: Write the SSE endpoint**

Implement a streaming route that:

- sets `text/event-stream`
- subscribes to Postgres notifications for shared notes updates
- sends heartbeat frames
- closes cleanly on abort

- [ ] **Step 2: Run the targeted test**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: still FAIL because the `notes.md` tab is still blank

## Chunk 3: Notes Editor UI

### Task 5: Add the shared notes tab client component

**Files:**
- Create: `src/components/vscodeV2/SharedNotesTab.tsx`

- [ ] **Step 1: Write the client editor component**

Implement a client component that:

- fetches the initial document from `/api/v2/notes`
- opens `new EventSource('/api/v2/notes/stream')`
- renders a multiline plain-text editor
- debounces saves to `PUT /api/v2/notes`
- tracks `content`, `savedContent`, `revision`, `dirty`, `status`, and `hasRemoteUpdate`

- [ ] **Step 2: Keep the UI visually aligned with `/v2`**

Use the existing Monaco-like monospace stack and dark editor shell styling already used in the route. Keep the status UI small and non-intrusive.

- [ ] **Step 3: Run the targeted test**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: still FAIL until `TabContent.tsx` actually renders the component

### Task 6: Wire `notes.md` into the tab switch

**Files:**
- Modify: `src/components/vscodeV2/TabContent.tsx`

- [ ] **Step 1: Render `SharedNotesTab` for `notes.md`**

Add a dedicated branch so the tab no longer returns the empty placeholder div.

- [ ] **Step 2: Run the targeted test to verify it passes**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: PASS

## Chunk 4: End-to-End Verification and Handoff

### Task 7: Verify the app build and runtime behavior

**Files:**
- Verify: `src/app/api/v2/notes/route.ts`
- Verify: `src/app/api/v2/notes/stream/route.ts`
- Verify: `src/components/vscodeV2/SharedNotesTab.tsx`

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Manually verify shared notes behavior**

Run the app locally, open two `/v2` tabs, and verify:

- text persists across refresh
- idle tab receives remote updates in near real time
- a dirty local draft is not overwritten by an incoming remote update

### Task 8: Provide the manual migration SQL

**Files:**
- None in repo unless a SQL note is added later

- [ ] **Step 1: Prepare idempotent SQL for the user**

Include SQL that:

- creates the shared notes table if missing
- creates the initial `v2:notes.md` row if missing

- [ ] **Step 2: Summarize the env requirement**

Call out that local runtime needs `DATABASE_URL` set for the feature to work.

Plan complete and saved to `docs/superpowers/plans/2026-04-15-v2-shared-notes-implementation.md`. Ready to execute.
