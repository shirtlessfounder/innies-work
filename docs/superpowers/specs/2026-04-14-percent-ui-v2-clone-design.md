# Percent UI V2 Clone Design

Date: 2026-04-14
Target: `/Users/dylanvu/innies-work`
Route: `/v2`
Source of truth: commit `a5dacbdf573229abf6522c4f678cafac24ee43ee` in `/Users/dylanvu/percent`

## Goal

Stage a literal visual clone of the October 18, 2025 Percent app UI inside `innies-work` at `/v2`.

This is a UI transplant only. The clone should preserve the Percent text, logos, links, fonts, palette, panel layout, and visible controls from the source commit. Real trading, wallet, chart, and API behavior are explicitly out of scope for the first pass.

## Scope

Included:

- New `/v2` route in `innies-work`
- Percent app-shell layout from the source commit
- Percent header chrome with branding, wallet/balance blocks, and outbound links
- Main split-pane layout with large left content area and narrower right trading panel
- Proposal header with status, date, countdown, and PFG display
- Trade and Description tabs
- Pass and Fail market panels
- Entry controls and trading controls in their source visual style
- Trade history table in its source visual style
- Source fonts and image assets needed for visual fidelity
- Local mock data and lightweight UI state to make the page feel like a frozen live screen

Excluded:

- Real wallet/auth integration
- Privy, Solana, or API client setup
- TradingView or live chart integration
- Real quote fetching, balances, orders, claims, or transactions
- Replacing the current `/` route
- Innies branding changes in this pass

## Recommended Approach

Rebuild the source commit's UI surface as a self-contained static clone inside `innies-work`, while preserving the original visual structure and class-level styling patterns as closely as practical.

Why:

- A literal file transplant from the Percent repo will not run cleanly in `innies-work` because the source page depends on wallet hooks, API hooks, token formatters, charting libraries, and Solana transaction plumbing that do not exist in this smaller repo.
- A static clone keeps the visible design 1:1 enough to compare and modify, without pulling in unnecessary backend/runtime complexity.
- Staging on `/v2` gives a safe comparison route before any future replacement of `/`.

## Implementation Shape

Add the clone in isolated files so the current Innies landing remains untouched:

- `src/app/v2/page.tsx`
  Renders the cloned Percent app UI for `/v2`.
- `src/app/v2/layout.tsx`
  Loads clone-specific metadata and fonts so the Percent look is scoped to `/v2`.
- `src/app/v2/page.module.css` or a clone-specific global stylesheet if needed
  Hosts any non-Tailwind rules needed for fidelity.
- `src/components/percentV2/Header.tsx`
  Percent top bar with logo, wallet/balance blocks, and source links.
- `src/components/percentV2/ProposalHeader.tsx`
  Title, tabs, status, timestamp, countdown, and PFG shell.
- `src/components/percentV2/StatusBadge.tsx`
  Frozen proposal status pill styling.
- `src/components/percentV2/CountdownTimer.tsx`
  Local countdown display seeded from mock data.
- `src/components/percentV2/MarketEntryControls.tsx`
  Static version of the source entry/exit control surface.
- `src/components/percentV2/TradingInterface.tsx`
  Static or locally interactive version of the source trading panel shell.
- `src/components/percentV2/TradeHistoryTable.tsx`
  Trade table using local mock rows.
- `src/components/percentV2/MarketPanel.tsx`
  Visual wrapper for the pass/fail cards and chart placeholder.
- `src/components/percentV2/ChartPlaceholder.tsx`
  Styled placeholder that matches the panel shape of the original chart area.
- `src/lib/percentV2/mockData.ts`
  Fixed proposal, balances, price, countdown, and trade data.
- `public/percent-v2/*`
  Source logos, token icons, and fonts copied from the Percent repo/commit.

## Styling Strategy

Install and use Tailwind in `innies-work` for the `/v2` transplant.

Reasoning:

- The source commit is written in Tailwind-heavy JSX. Preserving those utilities keeps the clone closer to the original than translating the whole interface into CSS modules.
- `innies-work` currently has a small CSS-module landing page. Tailwind can coexist with that setup without forcing a redesign of the existing homepage.
- This minimizes visual drift when copying spacing, panel colors, borders, and typography from the source commit.

Tailwind should only be introduced as infrastructure needed to support the clone. The existing `/` page should continue working as-is.

## Visual Fidelity Rules

- Preserve Percent copy, logos, links, and text casing from the source commit
- Preserve the header structure, slash separators, balance blocks, and right-side links
- Preserve the dark palette, panel borders, spacing, and overall proportions
- Preserve the left-content and right-rail composition
- Preserve visible controls even when their logic is mocked
- Do not reinterpret, clean up, or rebrand the design in this pass
- If a source dependency is too coupled to business logic, replace only the logic layer and keep the rendered surface aligned with the source

## Mocking Rules

The clone should look alive, but nothing should depend on production systems.

Use local data for:

- Connected wallet address
- SOL and `$ZC` balances
- Proposal title and description
- Proposal status
- Finalization date and countdown seed
- PFG percentage
- Pass and Fail panel totals
- Trading form values and quick interactions
- Trade history rows

Allowed local interactions:

- Toggle `Trade` and `Description`
- Toggle `Pass` and `Fail`
- Type into the amount input
- Press `MAX`
- Toggle `Enter` and `Exit`
- Hover panels, rows, and links

Disallowed runtime behavior:

- Wallet login
- API requests
- Quote fetching
- Transaction signing
- Real chart loading
- Real order execution

Action buttons may remain enabled for fidelity, but they must not execute external effects. A local no-op message is acceptable if needed.

## Source References

Primary source files from commit `a5dacbdf573229abf6522c4f678cafac24ee43ee`:

- `ui/app/page.tsx`
- `ui/app/layout.tsx`
- `ui/components/Header.tsx`
- `ui/components/ProposalHeader.tsx`
- `ui/components/MarketEntryControls.tsx`
- `ui/components/TradingInterface.tsx`
- `ui/components/TradeHistoryTable.tsx`
- `ui/tailwind.config.js`
- `ui/public/fonts/Rinter.ttf`
- `ui/public/long-logo.svg`
- `ui/public/solana-logo.jpg`
- `ui/public/zc-logo.jpg`

These should guide the clone. Where exact source behavior is too coupled to the Percent runtime, keep the visible output and remove the integration.

## Error Handling

- If a copied component imports unavailable runtime hooks, replace those imports with local props or mock data instead of widening repo dependencies
- If a source asset path conflicts with `innies-work`, copy the asset contents into `public/percent-v2/` and update only the local path
- If the source UI assumes client-side browser APIs, keep those components client-only under `/v2`

## Verification

Minimum verification:

- `innies-work` builds and tests successfully after adding the clone
- `/` remains unchanged
- `/v2` renders without runtime errors
- `/v2` clearly reflects the source Percent UI rather than the current Innies landing
- Key source markers are present: Percent branding, header links, dark app shell, split-pane layout, proposal header, right trading rail, and trade history table

Preferred verification:

- Run the Percent source app at the historical commit and `innies-work` side by side
- Compare screenshots for visible drift in header spacing, typography, color, pane sizing, and control layout

## Notes

- This is intentionally a staging route, not a replacement for the current homepage
- The first pass optimizes for visual fidelity, not feature parity
- If `/v2` is approved later, a second pass can either replace `/` or begin a controlled rebrand from the Percent shell into Innies branding
