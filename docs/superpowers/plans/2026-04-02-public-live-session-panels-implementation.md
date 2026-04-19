# Public Live Session Panels Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public, sanitized, semi-live wall of active `innies` AI sessions on the `innies-work` homepage, while excluding sessions tied to configured buyer keys that must never appear publicly.

**Architecture:** `innies/api` exposes one unauthenticated, CORS-enabled public feed at `GET /v1/public/innies/live-sessions`. That feed resolves the existing `innies` org by slug, resolves any configured excluded buyer-key token(s) to archived `api_key_id` values, filters matching traffic before transcript shaping, then reads active session truth from archive/session tables, shapes the last 1 hour of transcript entries per active session, redacts sensitive text server-side, and returns panel-ready JSON. `innies-work` polls that feed every 30 seconds from a client component rendered below the current hero, keeps the latest good payload for one stale cycle, and renders a featured row plus a collapsed overflow area using the existing console/panel language.

**Tech Stack:** Express, TypeScript, Vitest, Next.js 15, React 18, CSS Modules, `node:test`

---

## File Structure

### `innies/api`

#### Files to create

- `src/routes/publicInnies.ts`
- `src/services/publicInnies/publicLiveSessionsService.ts`
- `src/services/publicInnies/publicLiveSessionsTypes.ts`
- `src/services/publicInnies/publicTextSanitizer.ts`
- `tests/publicInnies.route.test.ts`
- `tests/publicLiveSessionsService.test.ts`
- `tests/publicTextSanitizer.test.ts`

#### Files to modify

- `src/repos/apiKeyRepository.ts`
- `src/server.ts`
- `../docs/API_CONTRACT.md`
- `tests/apiKeyRepository.test.ts`

#### Responsibilities

- `src/services/publicInnies/publicLiveSessionsTypes.ts`
  Define the public-safe response contract shared by the route and service.
- `src/services/publicInnies/publicTextSanitizer.ts`
  Redact secret-like spans and stringify public text safely. Never fail open.
- `src/services/publicInnies/publicLiveSessionsService.ts`
  Resolve org slug `innies`, resolve configured excluded buyer-key token(s) to `api_key_id`, filter matching sessions and attempts, query active sessions, load recent attempts/messages, derive transcript entries, cap payload size, and sanitize every emitted text field.
- `src/repos/apiKeyRepository.ts`
  Add a narrow hash-lookup method that resolves an API-key row id by `key_hash` without relying on the auth-only active-key path.
- `src/routes/publicInnies.ts`
  Expose `GET` and `OPTIONS` for `/v1/public/innies/live-sessions`, set CORS/cache headers, and serialize service output with no API-key auth.
- `tests/publicTextSanitizer.test.ts`
  Lock redaction behavior for tokens, auth headers, emails, and machine-local paths.
- `tests/publicLiveSessionsService.test.ts`
  Lock active-session filtering, revival history window, provider-switch markers, and transcript entry shaping.
- `tests/publicInnies.route.test.ts`
  Lock route contract, unauthenticated access, and CORS behavior.
- `tests/apiKeyRepository.test.ts`
  Lock the new id-by-hash lookup used for buyer-key exclusions.
- `../docs/API_CONTRACT.md`
  Document the new public endpoint, response shape, cross-origin usage expectations, and the exclusion config seam for hidden buyer keys.

### `innies-work`

#### Files to create

- `src/components/live/LiveSessionsSection.tsx`
- `src/components/live/LiveSessionPanel.tsx`
- `src/components/live/liveSessions.module.css`
- `src/lib/liveSessions/publicFeed.ts`
- `tests/liveSessionsHomepage.test.mjs`

#### Files to modify

- `src/app/page.tsx`
- `src/app/page.module.css`

#### Responsibilities

- `src/lib/liveSessions/publicFeed.ts`
  Hold the feed URL builder, typed fetch helper, and browser-safe env resolution for `NEXT_PUBLIC_INNIES_API_BASE_URL`.
- `src/components/live/LiveSessionsSection.tsx`
  Poll every 30 seconds, manage loading/live/stale/error state, split featured vs overflow sessions, and render empty-state/failure-state framing.
- `src/components/live/LiveSessionPanel.tsx`
  Render panel chrome, provider/model badges, transcript rows, and entry-type styling hooks.
- `src/components/live/liveSessions.module.css`
  Carry the `/onboard`-inspired panel wall styling, transcript row colors, scroll containers, and responsive layout rules.
- `tests/liveSessionsHomepage.test.mjs`
  Lock homepage integration, polling interval, endpoint path, section labels, and transcript row support with source-level assertions.
- `src/app/page.tsx`
  Keep the current hero intact and render the live wall immediately below it.
- `src/app/page.module.css`
  Add spacing/hooks needed to slot the live wall under the hero without breaking the existing landing layout.

## Chunk 1: Backend Safety Contract

### Task 1: Lock public redaction behavior with failing tests

**Files:**
- Create: `innies/api/tests/publicTextSanitizer.test.ts`
- Test: `innies/api/tests/publicTextSanitizer.test.ts`

- [ ] **Step 1: Write the failing sanitizer test**

```ts
import { describe, expect, it } from 'vitest';
import { sanitizePublicText } from '../src/services/publicInnies/publicTextSanitizer.js';

describe('sanitizePublicText', () => {
  it('redacts tokens, auth headers, emails, and local paths', () => {
    const input = [
      'Authorization: Bearer sk-live-secret-123',
      'cookie=session=abc123',
      'email me at dylan@example.com',
      'see /Users/dylanvu/private/project/.env'
    ].join('\n');

    expect(sanitizePublicText(input)).toContain('[REDACTED_CREDENTIAL]');
    expect(sanitizePublicText(input)).toContain('[REDACTED_EMAIL]');
    expect(sanitizePublicText(input)).toContain('[REDACTED_PATH]');
    expect(sanitizePublicText(input)).not.toContain('sk-live-secret-123');
  });
});
```

- [ ] **Step 2: Run the sanitizer test to verify it fails**

Run: `cd /Users/dylanvu/innies/api && npm test -- publicTextSanitizer.test.ts`
Expected: FAIL because `publicTextSanitizer.ts` does not exist yet.

- [ ] **Step 3: Implement the sanitizer module**

Create `src/services/publicInnies/publicTextSanitizer.ts` with:

```ts
export function sanitizePublicText(input: string): string {
  return input
    .replace(AUTH_HEADER_RE, '$1[REDACTED_CREDENTIAL]')
    .replace(TOKEN_RE, '[REDACTED_TOKEN]')
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(LOCAL_PATH_RE, '[REDACTED_PATH]');
}
```

Implementation requirements:
- return `''` for empty strings
- preserve non-secret surrounding text
- use readable placeholders, never hashes
- expose one helper for stringifying unknown tool payloads, capped to a sane length

- [ ] **Step 4: Re-run the sanitizer test**

Run: `cd /Users/dylanvu/innies/api && npm test -- publicTextSanitizer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit the safety seam**

Run:

```bash
cd /Users/dylanvu/innies
git add api/src/services/publicInnies/publicTextSanitizer.ts api/tests/publicTextSanitizer.test.ts
git commit -m "test: lock public transcript redaction"
```

## Chunk 2: Backend Feed Shaping

### Task 2: Lock active-session feed behavior with a failing service test

**Files:**
- Create: `innies/api/tests/publicLiveSessionsService.test.ts`
- Test: `innies/api/tests/publicLiveSessionsService.test.ts`

- [ ] **Step 1: Write the failing service test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { PublicLiveSessionsService } from '../src/services/publicInnies/publicLiveSessionsService.js';

describe('PublicLiveSessionsService', () => {
  it('returns active innies sessions with sanitized transcript entries and provider switch markers while excluding configured buyer keys', async () => {
    const sql = { query: vi.fn() };
    const orgAccess = { findOrgBySlug: vi.fn().mockResolvedValue({ id: 'org_innies', slug: 'innies', name: 'innies', ownerUserId: 'u1' }) };
    const apiKeys = { findIdByHash: vi.fn().mockResolvedValue('buyer_key_hidden') };

    // 1. active sessions
    // 2. recent attempts
    // 3. recent messages
    // 4. message blobs

    process.env.INNIES_PUBLIC_EXCLUDED_BUYER_KEYS = 'in_live_hidden_key';

    const service = new PublicLiveSessionsService({
      sql,
      orgAccess,
      apiKeys,
      now: () => new Date('2026-04-02T20:15:00.000Z')
    });
    const result = await service.listLiveSessions();

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.entries.map((entry) => entry.kind)).toEqual([
      'user',
      'tool_call',
      'tool_result',
      'provider_switch',
      'assistant_final'
    ]);
    expect(JSON.stringify(result)).not.toContain('sk-live-secret-123');
    expect(JSON.stringify(result)).not.toContain('buyer_key_hidden');
  });
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run: `cd /Users/dylanvu/innies/api && npm test -- publicLiveSessionsService.test.ts`
Expected: FAIL because the service and types do not exist yet.

- [ ] **Step 3: Create the public feed types**

Create `src/services/publicInnies/publicLiveSessionsTypes.ts` with explicit types for:

```ts
export type PublicTranscriptEntry =
  | { entryId: string; kind: 'user' | 'assistant_final' | 'tool_result'; at: string; text: string }
  | { entryId: string; kind: 'tool_call'; at: string; toolName: string; argsText: string }
  | { entryId: string; kind: 'provider_switch'; at: string; fromProvider: string | null; toProvider: string; fromModel: string | null; toModel: string };
```

Also define:
- `PublicLiveSession`
- `PublicLiveSessionsFeed`
- constants for `POLL_INTERVAL_SECONDS = 30`, `IDLE_TIMEOUT_SECONDS = 900`, `HISTORY_WINDOW_SECONDS = 3600`, `MAX_SESSIONS = 24`, `MAX_ENTRIES_PER_SESSION = 120`

- [ ] **Step 4: Add the narrow API-key hash lookup**

Modify `src/repos/apiKeyRepository.ts` to add:

```ts
async findIdByHash(keyHash: string): Promise<string | null> {
  const result = await this.db.query<{ id: string }>(
    `select id from in_api_keys where key_hash = $1 limit 1`,
    [keyHash]
  );
  return result.rowCount === 1 ? result.rows[0]!.id : null;
}
```

Add a matching test in `tests/apiKeyRepository.test.ts` that proves:
- the lookup returns an id when the hash exists
- it returns `null` when it does not
- it does not depend on `is_active`

- [ ] **Step 5: Implement the service with direct SQL reads**

Create `src/services/publicInnies/publicLiveSessionsService.ts`.

Implementation requirements:
- resolve org via `orgAccess.findOrgBySlug('innies')`
- read `INNIES_PUBLIC_EXCLUDED_BUYER_KEYS`, split on commas, trim, drop empties
- hash each configured plaintext token with `sha256Hex`
- resolve excluded ids via `apiKeys.findIdByHash`
- exclude individual attempts with an excluded `api_key_id` before transcript shaping, so mixed sessions do not leak hidden turns
- drop sessions that become empty after excluded-attempt filtering
- if org is missing, throw a deterministic server-side error instead of returning fake empty data
- query active sessions from `admin_sessions` with `last_activity_at >= now - interval '15 minutes'`
- limit to `24`, sort by `last_activity_at desc, session_key desc`
- query only recent attempts whose `coalesce(completed_at, started_at) >= now - interval '1 hour'`
- query only messages/blobs attached to those attempts
- derive `displayTitle` from `sessionType`, `sourceRunId`, `sourceSessionId`, and `sessionKey` fallback
- derive `currentProvider` and `currentModel` from the latest attempt in that session
- emit transcript entries in chronological order
- emit `provider_switch` when adjacent attempts change provider or model
- include only:
  - user messages
  - final assistant text
  - tool call rows
  - tool result rows
- exclude:
  - system messages
  - `json` parts
  - reasoning/thinking placeholders
  - raw SSE/debug payloads
- sanitize every emitted string field
- cap each session to the newest `120` emitted entries after shaping

- [ ] **Step 6: Re-run the service + repo tests**

Run: `cd /Users/dylanvu/innies/api && npm test -- publicTextSanitizer.test.ts apiKeyRepository.test.ts publicLiveSessionsService.test.ts`
Expected: PASS

- [ ] **Step 7: Commit the feed builder**

Run:

```bash
cd /Users/dylanvu/innies
git add api/src/repos/apiKeyRepository.ts api/src/services/publicInnies/publicLiveSessionsTypes.ts api/src/services/publicInnies/publicLiveSessionsService.ts api/tests/apiKeyRepository.test.ts api/tests/publicLiveSessionsService.test.ts
git commit -m "feat: add public live session feed service"
```

### Task 3: Lock the public route contract and CORS behavior

**Files:**
- Create: `innies/api/tests/publicInnies.route.test.ts`
- Modify: `innies/api/src/server.ts`
- Create: `innies/api/src/routes/publicInnies.ts`
- Modify: `innies/docs/API_CONTRACT.md`
- Test: `innies/api/tests/publicInnies.route.test.ts`

- [ ] **Step 1: Write the failing route test**

```ts
import { beforeAll, describe, expect, it, vi } from 'vitest';

describe('public innies route', () => {
  it('serves the live sessions feed without API-key auth and returns CORS headers for innies.work', async () => {
    const publicFeed = { listLiveSessions: vi.fn().mockResolvedValue({ generatedAt: '2026-04-02T20:15:00.000Z', pollIntervalSeconds: 30, idleTimeoutSeconds: 900, historyWindowSeconds: 3600, sessions: [] }) };
    // invoke GET /v1/public/innies/live-sessions with Origin: https://innies.work
    // assert 200, JSON body, access-control-allow-origin, vary: origin
  });
});
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `cd /Users/dylanvu/innies/api && npm test -- publicInnies.route.test.ts`
Expected: FAIL because the route is not wired yet.

- [ ] **Step 3: Implement `src/routes/publicInnies.ts`**

Create a route module following the `createAdminArchiveRouter` pattern.

Implementation requirements:
- expose:
  - `OPTIONS /v1/public/innies/live-sessions`
  - `GET /v1/public/innies/live-sessions`
- do not use `requireApiKey`
- instantiate a default `PublicLiveSessionsService` with `runtime.sql`, `runtime.repos.orgAccess`, and `runtime.repos.apiKeys`
- apply route-local CORS headers
- allow origins from `INNIES_PUBLIC_WEB_ORIGINS` when set
- fallback allowlist: `https://innies.work,http://localhost:3000`
- set:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Methods: GET, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`
  - `Vary: Origin`
- set conservative cache headers suitable for 30-second polling

- [ ] **Step 4: Wire the route in `src/server.ts`**

Add:

```ts
import publicInniesRoutes from './routes/publicInnies.js';
```

and mount it with the other top-level routers.

- [ ] **Step 5: Document the endpoint**

Update `innies/docs/API_CONTRACT.md` to add:
- public auth exception for this route
- request path
- response shape example
- CORS note for `innies-work`
- config note for `INNIES_PUBLIC_EXCLUDED_BUYER_KEYS`
- explicit note that content is sanitized and excludes reasoning/intermediate SSE

- [ ] **Step 6: Re-run backend tests and build**

Run:

```bash
cd /Users/dylanvu/innies/api
npm test -- publicTextSanitizer.test.ts apiKeyRepository.test.ts publicLiveSessionsService.test.ts publicInnies.route.test.ts adminArchive.route.test.ts
npm run build
```

Expected:
- tests PASS
- TypeScript build PASS

- [ ] **Step 7: Commit route + docs**

Run:

```bash
cd /Users/dylanvu/innies
git add api/src/routes/publicInnies.ts api/src/server.ts api/tests/publicInnies.route.test.ts docs/API_CONTRACT.md
git commit -m "feat: expose public innies live sessions feed"
```

## Chunk 3: Frontend Contract

### Task 4: Lock homepage integration and polling behavior with a failing test

**Files:**
- Create: `innies-work/tests/liveSessionsHomepage.test.mjs`
- Test: `innies-work/tests/liveSessionsHomepage.test.mjs`

- [ ] **Step 1: Write the failing homepage test**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

test('homepage renders the live sessions section below the hero content', () => {
  const pageSource = readSource('src/app/page.tsx');
  assert.ok(pageSource.includes('<LandingProductsTable />'));
  assert.ok(pageSource.includes('<LiveSessionsSection />'));
});

test('live session client polls the public innies feed every 30 seconds', () => {
  const sectionSource = readSource('src/components/live/LiveSessionsSection.tsx');
  const feedSource = readSource('src/lib/liveSessions/publicFeed.ts');

  assert.ok(sectionSource.includes('30_000'));
  assert.ok(sectionSource.includes('more active sessions'));
  assert.ok(sectionSource.includes('no active innies right now'));
  assert.ok(feedSource.includes('/v1/public/innies/live-sessions'));
  assert.ok(feedSource.includes('NEXT_PUBLIC_INNIES_API_BASE_URL'));
});
```

- [ ] **Step 2: Run the homepage test to verify it fails**

Run: `cd /Users/dylanvu/innies-work && node --test tests/liveSessionsHomepage.test.mjs`
Expected: FAIL because the live components do not exist yet.

- [ ] **Step 3: Commit the frontend contract**

Run:

```bash
cd /Users/dylanvu/innies-work
git add tests/liveSessionsHomepage.test.mjs
git commit -m "test: lock live sessions homepage contract"
```

## Chunk 4: Frontend Data and UI

### Task 5: Implement the feed client and polling section

**Files:**
- Create: `innies-work/src/lib/liveSessions/publicFeed.ts`
- Create: `innies-work/src/components/live/LiveSessionsSection.tsx`
- Modify: `innies-work/src/app/page.tsx`

- [ ] **Step 1: Implement the public feed client**

Create `src/lib/liveSessions/publicFeed.ts` with:

```ts
export const PUBLIC_LIVE_SESSIONS_PATH = '/v1/public/innies/live-sessions';

export async function fetchPublicLiveSessions(signal?: AbortSignal): Promise<PublicLiveSessionsFeed> {
  const baseUrl = process.env.NEXT_PUBLIC_INNIES_API_BASE_URL?.trim();
  if (!baseUrl) throw new Error('Missing NEXT_PUBLIC_INNIES_API_BASE_URL');

  const response = await fetch(new URL(PUBLIC_LIVE_SESSIONS_PATH, `${baseUrl}/`).toString(), {
    method: 'GET',
    signal,
    cache: 'no-store'
  });

  if (!response.ok) throw new Error(`Live sessions request failed: ${response.status}`);
  return response.json() as Promise<PublicLiveSessionsFeed>;
}
```

Include frontend-local types mirroring the API contract.

- [ ] **Step 2: Implement the polling client component**

Create `src/components/live/LiveSessionsSection.tsx`.

Implementation requirements:
- `'use client'`
- fetch on mount
- repeat fetch every `30_000` ms
- replace local sessions with latest server truth on success
- keep last successful payload visible for one failed refresh cycle
- show one of:
  - loading state
  - live state
  - stale state
  - empty state
  - error state when no successful payload has ever loaded
- split sessions into:
  - `featuredSessions = sessions.slice(0, 3)`
  - `overflowSessions = sessions.slice(3)`
- render overflow inside native `<details>` with summary text `more active sessions`

- [ ] **Step 3: Mount the live section below the hero**

Update `src/app/page.tsx` to import and render:

```tsx
import { LiveSessionsSection } from '../components/live/LiveSessionsSection';
```

and place `<LiveSessionsSection />` after the existing hero section, leaving the hero block untouched.

- [ ] **Step 4: Re-run the homepage test**

Run: `cd /Users/dylanvu/innies-work && node --test tests/liveSessionsHomepage.test.mjs`
Expected: partial PASS or new failures now isolated to missing panel/CSS details.

- [ ] **Step 5: Commit data client + section**

Run:

```bash
cd /Users/dylanvu/innies-work
git add src/lib/liveSessions/publicFeed.ts src/components/live/LiveSessionsSection.tsx src/app/page.tsx tests/liveSessionsHomepage.test.mjs
git commit -m "feat: add live sessions polling section"
```

### Task 6: Implement transcript panels and styling

**Files:**
- Create: `innies-work/src/components/live/LiveSessionPanel.tsx`
- Create: `innies-work/src/components/live/liveSessions.module.css`
- Modify: `innies-work/src/app/page.module.css`
- Modify: `innies-work/src/components/live/LiveSessionsSection.tsx`
- Test: `innies-work/tests/liveSessionsHomepage.test.mjs`

- [ ] **Step 1: Implement the panel renderer**

Create `src/components/live/LiveSessionPanel.tsx`.

Implementation requirements:
- show header fields:
  - `displayTitle`
  - live badge
  - relative or absolute last activity label
  - provider/model chips
- render transcript rows for:
  - `user`
  - `assistant_final`
  - `tool_call`
  - `tool_result`
  - `provider_switch`
- only display final assistant text, never “thinking” labels
- keep the panel body scrollable

- [ ] **Step 2: Add `/onboard`-inspired panel-wall styles**

Create `src/components/live/liveSessions.module.css`.

Required outcome:
- editor-window chrome with traffic lights
- mono console typography consistent with the homepage
- 3-column featured grid on large screens, collapsing responsively
- collapsed overflow section with max-height scroll container
- transcript row variants with distinct but restrained color cues
- no generic chat bubbles

- [ ] **Step 3: Add page-level spacing hooks**

Update `src/app/page.module.css` to add only the shell spacing needed for the new live section. Do not disturb the current hero sizing tokens already locked by `landingClone.test.mjs`.

- [ ] **Step 4: Tighten the homepage test contract**

Extend `tests/liveSessionsHomepage.test.mjs` to assert:
- `LiveSessionPanel.tsx` contains `assistant_final`, `tool_call`, `tool_result`, `provider_switch`
- `liveSessions.module.css` contains scrollable panel-body rules
- `LiveSessionsSection.tsx` contains `featuredSessions` and `overflowSessions`

- [ ] **Step 5: Run frontend tests and build**

Run:

```bash
cd /Users/dylanvu/innies-work
pnpm test
pnpm build
```

Expected:
- `node:test` suite PASS
- Next build PASS

- [ ] **Step 6: Commit the UI**

Run:

```bash
cd /Users/dylanvu/innies-work
git add src/components/live/LiveSessionPanel.tsx src/components/live/liveSessions.module.css src/components/live/LiveSessionsSection.tsx src/app/page.module.css tests/liveSessionsHomepage.test.mjs
git commit -m "feat: render public live session panels"
```

## Chunk 5: End-to-End Verification

### Task 7: Verify cross-repo behavior locally

**Files:**
- No new files unless fixes are needed

- [ ] **Step 1: Start the API locally**

Run: `cd /Users/dylanvu/innies/api && npm run dev`
Expected: API listening on `http://localhost:4010`

- [ ] **Step 2: Start the frontend against the local API**

Run: `cd /Users/dylanvu/innies-work && NEXT_PUBLIC_INNIES_API_BASE_URL=http://localhost:4010 pnpm dev`
Expected: homepage available, live section mounted below the hero

- [ ] **Step 3: Verify the public feed directly**

Run:

```bash
curl -i -H 'Origin: http://localhost:3000' http://localhost:4010/v1/public/innies/live-sessions
```

Expected:
- `200 OK`
- `Access-Control-Allow-Origin: http://localhost:3000`
- JSON body with `generatedAt`, `pollIntervalSeconds`, `idleTimeoutSeconds`, `historyWindowSeconds`, `sessions`

- [ ] **Step 4: Verify active-session lifecycle**

Using real traffic through the `innies` org:
- create one active CLI session
- create one active OpenClaw session
- confirm each renders as its own panel
- let one go idle past 15 minutes and confirm it disappears on the next poll
- revive it and confirm recent transcript history reappears

- [ ] **Step 5: Verify redaction and visibility rules**

Send or replay a known fake secret through a visible prompt/tool payload, such as:

```text
Authorization: Bearer sk-live-secret-123
```

Confirm:
- the session still renders
- the text is replaced with `[REDACTED_CREDENTIAL]` or `[REDACTED_TOKEN]`
- tool calls/results remain visible
- no reasoning/intermediate delta rows appear

- [ ] **Step 6: Run final automated gates**

Run:

```bash
cd /Users/dylanvu/innies/api && npm test -- publicTextSanitizer.test.ts publicLiveSessionsService.test.ts publicInnies.route.test.ts && npm run build
cd /Users/dylanvu/innies-work && pnpm test && pnpm build
```

Expected: all tests and builds PASS

- [ ] **Step 7: Commit any final fixes**

Run:

```bash
cd /Users/dylanvu/innies
git status --short

cd /Users/dylanvu/innies-work
git status --short
```

If fixes were needed, commit them in the repo they belong to with the narrowest message, for example:
- `fix: preserve stale live sessions state`
- `fix: cap public transcript entry counts`

## Notes

- Keep the trust boundary hard: raw/admin/archive access stays in `innies`; `innies-work` only consumes the sanitized public feed.
- Keep buyer-key suppression backend-only. Do not hardcode plaintext `in_live_...` keys in repo code, frontend code, tests, or the public API contract.
- Do not add an `innies-work` proxy route in v1 unless direct cross-origin fetch proves impossible after the public route CORS work lands.
- Prefer route-local instantiation in `src/routes/publicInnies.ts`; do not widen `runtime.services` unless a second caller actually needs this service.
- Use the existing `/Users/dylanvu/innies/ui/src/app/onboard/OnboardingPaneCarousel.tsx` and `/Users/dylanvu/innies/ui/src/app/onboard/page.module.css` as visual reference only. Do not copy onboarding-specific behavior like paging controls or line numbers into the public wall.
