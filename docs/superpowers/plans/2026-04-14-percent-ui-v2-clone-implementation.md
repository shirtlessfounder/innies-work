# Percent UI V2 Clone Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/v2` route to `innies-work` that visually clones the October 18, 2025 Percent app UI from commit `a5dacbdf573229abf6522c4f678cafac24ee43ee`, while leaving the current `/` route unchanged.

**Architecture:** Add Tailwind and route-scoped font/layout support, then build a self-contained `percentV2` component slice powered by local mock data. Preserve the source shell, text, assets, and control surfaces as closely as practical, but replace Privy/Solana/chart/runtime dependencies with local state and placeholders.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, `next/font`, `lucide-react`, `node:test`

---

## File Structure

### Files to create

- `postcss.config.mjs`
- `tailwind.config.js`
- `tests/percentV2Landing.test.mjs`
- `src/app/v2/layout.tsx`
- `src/app/v2/page.tsx`
- `src/components/percentV2/Header.tsx`
- `src/components/percentV2/StatusBadge.tsx`
- `src/components/percentV2/CountdownTimer.tsx`
- `src/components/percentV2/ProposalHeader.tsx`
- `src/components/percentV2/ChartPlaceholder.tsx`
- `src/components/percentV2/MarketPanel.tsx`
- `src/components/percentV2/MarketEntryControls.tsx`
- `src/components/percentV2/TradingInterface.tsx`
- `src/components/percentV2/TradeHistoryTable.tsx`
- `src/lib/percentV2/mockData.ts`
- `public/percent-v2/fonts/Rinter.ttf`
- `public/percent-v2/long-logo.svg`
- `public/percent-v2/solana-logo.jpg`
- `public/percent-v2/zc-logo.jpg`

### Files to modify

- `package.json`
- `pnpm-lock.yaml`
- `src/app/globals.css`

### File responsibilities

- `src/app/v2/layout.tsx`
  Load the cloned Percent fonts, title, and route-scoped dark wrapper without changing the global Innies layout.
- `src/app/v2/page.tsx`
  Compose the full Percent clone shell for `/v2`.
- `src/lib/percentV2/mockData.ts`
  Freeze the page into a stable, locally rendered “live proposal” state.
- `src/components/percentV2/Header.tsx`
  Recreate the top app chrome from the source commit.
- `src/components/percentV2/ProposalHeader.tsx`
  Render title, date, tabs, countdown, and PFG block in source style.
- `src/components/percentV2/MarketPanel.tsx`
  Wrap pass/fail cards and the chart placeholder for the left pane.
- `src/components/percentV2/TradingInterface.tsx`
  Render the right-rail trading shell with local state only.
- `tests/percentV2Landing.test.mjs`
  Lock the `/v2` route, key source markers, and component contracts with static assertions.

## Chunk 1: Add Route and Tailwind Infrastructure

### Task 1: Introduce `/v2` route scaffolding and Tailwind support

**Files:**
- Modify: `package.json`
- Modify: `src/app/globals.css`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.js`
- Create: `tests/percentV2Landing.test.mjs`
- Create: `src/app/v2/layout.tsx`
- Create: `src/app/v2/page.tsx`

- [ ] **Step 1: Write the failing test for the new route and Tailwind scaffold**

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function fileUrl(relativePath) {
  return new URL(`../${relativePath}`, import.meta.url);
}

function readSource(relativePath) {
  assert.equal(existsSync(fileUrl(relativePath)), true, `${relativePath} should exist`);
  return readFileSync(fileUrl(relativePath), 'utf8');
}

test('percent v2 scaffold files exist', () => {
  assert.equal(existsSync(fileUrl('src/app/v2/page.tsx')), true);
  assert.equal(existsSync(fileUrl('src/app/v2/layout.tsx')), true);
  assert.equal(existsSync(fileUrl('tailwind.config.js')), true);
  assert.equal(existsSync(fileUrl('postcss.config.mjs')), true);
});

test('v2 route is isolated from the current innies landing page', () => {
  const pageSource = readSource('src/app/v2/page.tsx');

  assert.ok(!pageSource.includes('LandingHeroHeader'));
  assert.ok(!pageSource.includes('LiveSessionsSection'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: FAIL because the `/v2` files and Tailwind config do not exist yet.

- [ ] **Step 3: Install the minimal dependencies needed to support the source-style clone**

Run: `pnpm add -D tailwindcss postcss autoprefixer && pnpm add lucide-react`
Expected: install succeeds and `package.json` plus `pnpm-lock.yaml` are updated.

- [ ] **Step 4: Add Tailwind config and preserve the existing global reset**

`tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'ibm-plex-mono': ['var(--font-ibm-plex-mono)', 'monospace'],
        'roboto-mono': ['var(--font-roboto-mono)', 'monospace'],
        rinter: ['var(--font-rinter)', 'monospace']
      }
    }
  },
  plugins: []
};
```

`postcss.config.mjs`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

Prepend `src/app/globals.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Keep the existing Innies reset rules below those directives.

- [ ] **Step 5: Add a minimal `/v2` layout and page shell**

`src/app/v2/layout.tsx`

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Percent | ZC',
  description: 'Trade decision markets'
};

export default function PercentV2Layout({ children }: { children: ReactNode }) {
  return children;
}
```

`src/app/v2/page.tsx`

```tsx
export default function PercentV2Page() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div>Percent V2 scaffold</div>
    </main>
  );
}
```

- [ ] **Step 6: Run the route scaffold test again**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: PASS for scaffold assertions.

- [ ] **Step 7: Run a build sanity check**

Run: `pnpm build`
Expected: the app builds successfully with the new Tailwind infrastructure and empty `/v2` shell.

- [ ] **Step 8: Commit the scaffold**

```bash
git add package.json pnpm-lock.yaml postcss.config.mjs tailwind.config.js src/app/globals.css tests/percentV2Landing.test.mjs src/app/v2/layout.tsx src/app/v2/page.tsx
git commit -m "feat: scaffold percent v2 route"
```

## Chunk 2: Lock Assets, Fonts, and Header Chrome

### Task 2: Add source assets, route-scoped fonts, mock data, and the top header

**Files:**
- Create: `src/lib/percentV2/mockData.ts`
- Create: `src/components/percentV2/Header.tsx`
- Create: `public/percent-v2/fonts/Rinter.ttf`
- Create: `public/percent-v2/long-logo.svg`
- Create: `public/percent-v2/solana-logo.jpg`
- Create: `public/percent-v2/zc-logo.jpg`
- Modify: `tests/percentV2Landing.test.mjs`
- Modify: `src/app/v2/layout.tsx`
- Modify: `src/app/v2/page.tsx`

- [ ] **Step 1: Extend the test contract for assets, fonts, and source header links**

Add to `tests/percentV2Landing.test.mjs`:

```js
test('percent v2 assets and layout font wiring exist', () => {
  const layoutSource = readSource('src/app/v2/layout.tsx');

  assert.ok(layoutSource.includes('localFont'));
  assert.ok(layoutSource.includes('percent-v2/fonts/Rinter.ttf'));
  assert.equal(existsSync(fileUrl('public/percent-v2/long-logo.svg')), true);
  assert.equal(existsSync(fileUrl('public/percent-v2/solana-logo.jpg')), true);
  assert.equal(existsSync(fileUrl('public/percent-v2/zc-logo.jpg')), true);
});

test('percent v2 header preserves source branding and links', () => {
  const headerSource = readSource('src/components/percentV2/Header.tsx');

  assert.ok(headerSource.includes('/percent-v2/long-logo.svg'));
  assert.ok(headerSource.includes('https://www.zcombinator.io/presale/zcQPTGhdiTMFM6erwko2DWBTkN8nCnAGM7MUX9RpERC'));
  assert.ok(headerSource.includes('https://docs.percent.markets/'));
  assert.ok(headerSource.includes('http://discord.gg/zcombinator'));
  assert.ok(headerSource.includes('https://x.com/percentmarkets'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: FAIL because the assets, header component, and font wiring do not exist yet.

- [ ] **Step 3: Copy the exact source assets from the Percent repo**

Source files:

- `/Users/dylanvu/percent/ui/public/fonts/Rinter.ttf`
- `/Users/dylanvu/percent/ui/public/long-logo.svg`
- `/Users/dylanvu/percent/ui/public/solana-logo.jpg`
- `/Users/dylanvu/percent/ui/public/zc-logo.jpg`

Destination files:

- `public/percent-v2/fonts/Rinter.ttf`
- `public/percent-v2/long-logo.svg`
- `public/percent-v2/solana-logo.jpg`
- `public/percent-v2/zc-logo.jpg`

- [ ] **Step 4: Add the frozen mock data contract**

`src/lib/percentV2/mockData.ts`

```ts
export const percentV2MockData = {
  walletAddress: '7xKXrF9v2L3M9F5Q2b4R8n7Q3t6J2mV1P8wX9Y2zA1Bc',
  solBalance: 12.345,
  zcBalance: 125000,
  status: 'Pending' as const,
  finalizedAt: Date.parse('2025-10-18T20:57:03Z'),
  pfgPercentage: 8.42
};
```

- [ ] **Step 5: Update `src/app/v2/layout.tsx` to load the source-style fonts and wrapper**

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, IBM_Plex_Mono, Roboto_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-ibm-plex-mono' });
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono' });
const rinter = localFont({ src: '../../../public/percent-v2/fonts/Rinter.ttf', variable: '--font-rinter' });

export const metadata: Metadata = {
  title: 'Percent | ZC',
  description: 'Trade decision markets'
};

export default function PercentV2Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.variable} ${ibmPlexMono.variable} ${robotoMono.variable} ${rinter.variable} min-h-screen bg-[#0a0a0a] text-white font-sans antialiased`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Implement the source-style header component**

Use the source file `/Users/dylanvu/percent` commit as the base and keep these visible elements intact:

- left logo block using `/percent-v2/long-logo.svg`
- slash separators
- wallet prefix block
- SOL and `$ZC` balance blocks
- right-side links for `$PERC`, Docs, Discord, and Twitter

Required shell:

```tsx
export function Header() {
  return (
    <div className="h-14 flex items-center justify-between px-8 bg-[#0a0a0a] border-b border-[#494949]">
      {/* source-style content */}
    </div>
  );
}
```

- [ ] **Step 7: Replace the `/v2` placeholder with the real header import**

Minimal page update:

```tsx
import { Header } from '../../components/percentV2/Header';

export default function PercentV2Page() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />
    </main>
  );
}
```

- [ ] **Step 8: Run the test contract again**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: PASS for the asset, font, and header assertions.

- [ ] **Step 9: Commit the header slice**

```bash
git add src/lib/percentV2/mockData.ts src/components/percentV2/Header.tsx src/app/v2/layout.tsx src/app/v2/page.tsx tests/percentV2Landing.test.mjs public/percent-v2/fonts/Rinter.ttf public/percent-v2/long-logo.svg public/percent-v2/solana-logo.jpg public/percent-v2/zc-logo.jpg
git commit -m "feat: add percent v2 header shell"
```

## Chunk 3: Build the Left Pane Proposal Surface

### Task 3: Recreate the proposal header, chart shell, pass/fail panels, and trade history table

**Files:**
- Create: `src/components/percentV2/StatusBadge.tsx`
- Create: `src/components/percentV2/CountdownTimer.tsx`
- Create: `src/components/percentV2/ProposalHeader.tsx`
- Create: `src/components/percentV2/ChartPlaceholder.tsx`
- Create: `src/components/percentV2/MarketPanel.tsx`
- Create: `src/components/percentV2/TradeHistoryTable.tsx`
- Modify: `src/lib/percentV2/mockData.ts`
- Modify: `src/app/v2/page.tsx`
- Modify: `tests/percentV2Landing.test.mjs`

- [ ] **Step 1: Write the failing test for left-pane source markers**

Add to `tests/percentV2Landing.test.mjs`:

```js
test('percent v2 proposal header preserves source tabs and PFG copy', () => {
  const proposalHeaderSource = readSource('src/components/percentV2/ProposalHeader.tsx');

  assert.ok(proposalHeaderSource.includes('TWAP Pass-Fail Gap (PFG)'));
  assert.ok(proposalHeaderSource.includes('Trade'));
  assert.ok(proposalHeaderSource.includes('Description'));
});

test('percent v2 trade history preserves source table headings', () => {
  const tableSource = readSource('src/components/percentV2/TradeHistoryTable.tsx');

  assert.ok(tableSource.includes('Trader'));
  assert.ok(tableSource.includes('Bet'));
  assert.ok(tableSource.includes('Type'));
  assert.ok(tableSource.includes('Amount'));
  assert.ok(tableSource.includes('Tx'));
  assert.ok(tableSource.includes('Age'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: FAIL because the left-pane components do not exist yet.

- [ ] **Step 3: Extend `mockData.ts` with proposal and trade fixtures**

Add a stable proposal payload and trade rows:

```ts
export const proposalMock = {
  id: 42,
  title: 'Should Percent launch the October growth market?',
  description: 'This is a frozen UI clone of the Percent app shell.',
  status: 'Pending' as const,
  finalizedAt: Date.parse('2025-10-25T20:57:03Z'),
  pfgPercentage: 8.42,
  passValue: { zc: 182340, sol: 14.821 },
  failValue: { zc: 92310, sol: 8.217 }
};

export const tradeMock = [
  { id: 1, userAddress: '9h3n...K2R4', market: 'pass', side: 'Buy', amount: '1200 ZC', txSignature: '5nX1...9KpL', age: '2m' }
];
```

- [ ] **Step 4: Implement `StatusBadge.tsx` and `CountdownTimer.tsx`**

Keep these components tiny and local. `CountdownTimer` may render a simple computed string from `finalizedAt`; it does not need live intervals in the first pass if that risks drift elsewhere.

Minimal shell:

```tsx
export function StatusBadge({ status }: { status: 'Pending' | 'Passed' | 'Failed' | 'Executed' }) {
  return <span className="px-2 py-1 rounded-full text-xs border border-[#2A2A2A] bg-[#1A1A1A]">{status}</span>;
}
```

- [ ] **Step 5: Implement `ProposalHeader.tsx` using the source structure**

Keep the source-style sections:

- status badge
- timestamp
- countdown block
- PFG box
- title
- `Trade` / `Description` tab row
- description panel when active tab is `description`

- [ ] **Step 6: Implement the left-pane market shells**

Create:

- `ChartPlaceholder.tsx`
- `MarketPanel.tsx`
- `TradeHistoryTable.tsx`

Required outcomes:

- pass and fail cards use the source dark panel styling
- chart areas render as styled placeholders, not blank boxes
- trade history rows use the source column labels and hover feel

- [ ] **Step 7: Wire the left pane into `src/app/v2/page.tsx`**

Compose the left pane like the source commit:

```tsx
<div className="flex-1 p-8 pr-10 overflow-y-auto border-r border-[#2A2A2A]">
  <ProposalHeader />
  <div className="mb-8">
    <div className="grid grid-cols-2 gap-4 mt-1">
      <MarketPanel variant="pass" />
      <MarketPanel variant="fail" />
    </div>
  </div>
  <TradeHistoryTable />
</div>
```

- [ ] **Step 8: Run the left-pane test contract**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: PASS for the proposal-header and trade-table assertions.

- [ ] **Step 9: Commit the left-pane implementation**

```bash
git add src/components/percentV2/StatusBadge.tsx src/components/percentV2/CountdownTimer.tsx src/components/percentV2/ProposalHeader.tsx src/components/percentV2/ChartPlaceholder.tsx src/components/percentV2/MarketPanel.tsx src/components/percentV2/TradeHistoryTable.tsx src/lib/percentV2/mockData.ts src/app/v2/page.tsx tests/percentV2Landing.test.mjs
git commit -m "feat: add percent v2 proposal pane"
```

## Chunk 4: Build the Right Rail and Final Page Composition

### Task 4: Add the market-entry and trading shells, then compose the full `/v2` page

**Files:**
- Create: `src/components/percentV2/MarketEntryControls.tsx`
- Create: `src/components/percentV2/TradingInterface.tsx`
- Modify: `src/app/v2/page.tsx`
- Modify: `src/lib/percentV2/mockData.ts`
- Modify: `tests/percentV2Landing.test.mjs`

- [ ] **Step 1: Write the failing test for the right rail and final route composition**

Add to `tests/percentV2Landing.test.mjs`:

```js
test('percent v2 action controls preserve the source entry shell', () => {
  const entrySource = readSource('src/components/percentV2/MarketEntryControls.tsx');

  assert.ok(entrySource.includes('MAX'));
  assert.ok(entrySource.includes('Enter / Exit'));
  assert.ok(entrySource.includes('Enter Market'));
  assert.ok(entrySource.includes('Exit Market'));
});

test('percent v2 route composes the full source shell', () => {
  const pageSource = readSource('src/app/v2/page.tsx');

  assert.ok(pageSource.includes('Header'));
  assert.ok(pageSource.includes('ProposalHeader'));
  assert.ok(pageSource.includes('TradingInterface'));
  assert.ok(pageSource.includes('TradeHistoryTable'));
  assert.ok(pageSource.includes('w-[352px]'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: FAIL because the trading shell components are missing.

- [ ] **Step 3: Implement `MarketEntryControls.tsx` with local state props only**

Preserve the source surface:

- amount input
- `MAX` button
- token toggle button
- `Enter / Exit` switch
- action button text and disabled styling

Minimal prop contract:

```tsx
interface MarketEntryControlsProps {
  marketMode: 'enter' | 'exit';
  amount: string;
  selectedToken: 'sol' | 'zc';
  onAmountChange: (amount: string) => void;
  onTokenChange: (token: 'sol' | 'zc') => void;
  onMarketModeChange: (mode: 'enter' | 'exit') => void;
  onMaxClick: () => void;
}
```

- [ ] **Step 4: Implement `TradingInterface.tsx` as a static shell with local toggles**

Required outcomes:

- preserve pass/fail selection controls
- preserve dark panels and source spacing
- remove all wallet/API imports
- keep actions inert or wire them to local no-op buttons only

Do not import:

- `usePrivyWallet`
- `useTokenPrices`
- Solana wallet hooks
- Percent API helpers

- [ ] **Step 5: Compose the final source-style page in `src/app/v2/page.tsx`**

The final page should follow the same high-level structure as the source commit:

```tsx
<main className="min-h-screen bg-[#0a0a0a] text-white">
  <div className="flex h-screen bg-[#0a0a0a]">
    <div className="flex-1 flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* left pane */}
        {/* right rail */}
      </div>
    </div>
  </div>
</main>
```

Right rail target:

```tsx
<div className="w-[352px] p-8 overflow-y-auto">
  <div className="sticky top-0 space-y-6">
    <MarketEntryControls ... />
    <TradingInterface ... />
  </div>
</div>
```

- [ ] **Step 6: Run the route composition test**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: PASS for the right-rail and route-composition assertions.

- [ ] **Step 7: Commit the final page composition**

```bash
git add src/components/percentV2/MarketEntryControls.tsx src/components/percentV2/TradingInterface.tsx src/app/v2/page.tsx src/lib/percentV2/mockData.ts tests/percentV2Landing.test.mjs
git commit -m "feat: compose percent v2 landing clone"
```

## Chunk 5: Verify the Clone and Protect the Existing Homepage

### Task 5: Run end-to-end verification before handoff

**Files:**
- Modify: none unless verification reveals defects

- [ ] **Step 1: Run the existing Innies landing tests plus the new `/v2` contract**

Run: `pnpm test`
Expected: PASS for:

- `tests/landingClone.test.mjs`
- `tests/liveSessionsHomepage.test.mjs`
- `tests/percentV2Landing.test.mjs`

- [ ] **Step 2: Run a production build**

Run: `pnpm build`
Expected: build completes successfully and emits the App Router routes including `/v2`.

- [ ] **Step 3: Verify the current homepage still uses the Innies landing implementation**

Inspect:

- `src/app/page.tsx`
- `src/components/LandingHeroHeader.tsx`

Expected:

- no changes required for `/`
- no `percentV2` imports on the current homepage

- [ ] **Step 4: Run the dev server and check the staged route manually**

Run: `pnpm dev`

Manual checks:

- `/` still shows the current Innies landing
- `/v2` shows the dark Percent clone shell
- header links point to the Percent destinations from the source commit
- pass/fail panels, proposal header, right rail, and trade table are visible
- no runtime errors appear in the terminal or browser console

- [ ] **Step 5: Capture follow-up polish items separately rather than blocking the clone**

If visual drift remains, record it as a flat follow-up list:

- typography drift
- spacing drift
- chart placeholder styling drift
- mobile overflow issues

- [ ] **Step 6: Commit verification-only fixes if needed**

```bash
git add package.json pnpm-lock.yaml postcss.config.mjs tailwind.config.js src/app/globals.css tests/percentV2Landing.test.mjs src/app/v2/layout.tsx src/app/v2/page.tsx src/components/percentV2 src/lib/percentV2 public/percent-v2
git commit -m "fix: polish percent v2 clone verification issues"
```
