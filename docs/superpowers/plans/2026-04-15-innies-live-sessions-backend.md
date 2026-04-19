# Innies Live Sessions Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Point the lifted `/v2` live sessions tab at the production Innies live feed the current CLI sessions actually hit so live cards render here.

**Architecture:** Use Next.js local env loading in this worktree to supply the production Innies API base URL used by the current CLI sessions on this machine. Keep the existing lifted API route and normalization logic unchanged; only correct the local runtime configuration, then verify the route and app behavior against the production feed.

**Tech Stack:** Next.js App Router, local `.env.local`, Node fetch probes, pnpm

---

## Chunk 1: Local Backend Wiring

### Task 1: Add the correct Innies env config to this worktree

**Files:**
- Create: `.env.local`
- Reference: current shell / running Innies CLI environment

- [ ] **Step 1: Confirm the active Innies backend used by the running CLI**

Run: inspect the current shell or running process env for `INNIES_API_BASE_URL`
Expected: `https://api.innies.computer`

- [ ] **Step 2: Create the worktree-local env file**

Add `INNIES_API_BASE_URL=https://api.innies.computer` to `percent-v2-clone/.env.local`.

- [ ] **Step 3: Verify the file exists with the expected keys**

Run: `sed -n '1,20p' .env.local`
Expected: the production Innies base URL is present

## Chunk 2: Route Verification

### Task 2: Verify the lifted route reads from the configured backend

**Files:**
- Verify: `src/app/api/innies/monitor/activity/route.ts`
- Verify: `src/lib/inniesMonitor/server.ts`

- [ ] **Step 1: Probe the configured backend directly**

Run: a Node fetch against `https://api.innies.computer/v1/public/innies/live-sessions?window=24h`
Expected: reachable backend response, ideally with active sessions

- [ ] **Step 2: Probe the lifted local API route**

Run: `curl http://localhost:3000/api/innies/monitor/activity?window=24h`
Expected: JSON payload from the same backend with non-empty items if live sessions are available

- [ ] **Step 3: Run project verification**

Run: `pnpm test`
Expected: PASS

Run: `pnpm build`
Expected: PASS

Plan complete and saved to `docs/superpowers/plans/2026-04-15-innies-live-sessions-backend.md`. Ready to execute.
