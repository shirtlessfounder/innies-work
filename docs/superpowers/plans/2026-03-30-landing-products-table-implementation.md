# Landing Products Table Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static products table under the landing link row in `innies-work`, mirroring the table shell from the source `innies` analytics UI.

**Architecture:** Keep the current landing hero and link row intact, then append a small static `LandingProductsTable` component beneath them. Reuse a landing-safe subset of the source `innies` table CSS and keep the rows hard-coded with placeholder one-liners plus icon links for GitHub and X.

**Tech Stack:** Next.js 15, React 18, TypeScript, CSS Modules, `node:test`

---

## File Structure

### Files to create

- `src/components/LandingProductsTable.tsx`
- `src/components/LandingLinkIcon.tsx`

### Files to modify

- `src/app/page.tsx`
- `src/app/page.module.css`
- `tests/landingClone.test.mjs`

### File responsibilities

- `src/components/LandingProductsTable.tsx`
  Static table rows and headers for `innies.computer` and `innies.live`.
- `src/components/LandingLinkIcon.tsx`
  Small inline icon renderer for `github` and `x`.
- `src/app/page.tsx`
  Places the new table directly below the current link row.
- `src/app/page.module.css`
  Holds the extracted landing table styling that mirrors the source analytics table shell.
- `tests/landingClone.test.mjs`
  Locks table structure, headers, products, and approved URLs.

## Chunk 1: Lock the Products Table Contract

### Task 1: Add failing tests for the landing products table

**Files:**
- Modify: `tests/landingClone.test.mjs`

- [ ] **Step 1: Write failing tests for the table structure**

```js
test('landing page renders a products table under the link row', () => {
  const pageSource = readSource('src/app/page.tsx');

  assert.ok(pageSource.includes('<LandingProductsTable />'));
});

test('landing products table contains the approved headers and product rows', () => {
  const tableSource = readSource('src/components/LandingProductsTable.tsx');

  assert.ok(tableSource.includes('product'));
  assert.ok(tableSource.includes('one-liner'));
  assert.ok(tableSource.includes('links'));
  assert.ok(tableSource.includes('innies.computer'));
  assert.ok(tableSource.includes('innies.live'));
});

test('landing products table includes the approved GitHub and X targets', () => {
  const tableSource = readSource('src/components/LandingProductsTable.tsx');

  assert.ok(tableSource.includes('https://github.com/shirtlessfounder/innies'));
  assert.ok(tableSource.includes('https://x.com/innies_computer'));
  assert.ok(tableSource.includes('https://github.com/shirtlessfounder/agentmeets'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL because the products table component does not exist yet.

- [ ] **Step 3: Commit test contract if desired**

Run: `git status --short`
Expected: updated test file plus current working changes from the landing clone.

## Chunk 2: Implement the Static Table and Icons

### Task 2: Build the landing products table component

**Files:**
- Create: `src/components/LandingProductsTable.tsx`
- Create: `src/components/LandingLinkIcon.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the icon component**

Implement a tiny icon renderer with cases for:
- `github`
- `x`

Keep it self-contained using inline SVG.

- [ ] **Step 2: Add the products table component**

Use static row data:

```ts
[
  {
    product: 'innies.computer',
    oneLiner: 'placeholder',
    links: [
      { kind: 'github', href: 'https://github.com/shirtlessfounder/innies', label: 'GitHub for innies.computer' },
      { kind: 'x', href: 'https://x.com/innies_computer', label: 'X for innies.computer' },
    ],
  },
  {
    product: 'innies.live',
    oneLiner: 'placeholder',
    links: [
      { kind: 'github', href: 'https://github.com/shirtlessfounder/agentmeets', label: 'GitHub for innies.live' },
    ],
  },
]
```

Render a simple static table with headers:
- `product`
- `one-liner`
- `links`

- [ ] **Step 3: Insert the table below the current link row**

Modify `src/app/page.tsx` to render:

```tsx
<PlaceholderOrgCreationForm />
<LandingProductsTable />
```

inside the existing `heroInner` stack.

- [ ] **Step 4: Run tests to verify the new structure passes**

Run: `pnpm test`
Expected: PASS

## Chunk 3: Mirror the Source Table Shell

### Task 3: Add landing table styles based on source `innies`

**Files:**
- Modify: `src/app/page.module.css`
- Test: `tests/landingClone.test.mjs`

- [ ] **Step 1: Extend tests to require table shell tokens**

Add assertions for:
- `.landingTableWrap`
- `.landingTable`
- sticky-style header background tokens matching the source family
- hover row background

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test`
Expected: FAIL because those landing table classes do not exist yet.

- [ ] **Step 3: Add landing-safe table CSS**

Mirror the source shell from `/Users/dylanvu/innies/ui/src/app/analytics/page.module.css` using local classes such as:

```css
.landingTableWrap { ... }
.landingTable { ... }
.landingTable th,
.landingTable td { ... }
.landingTable th { ... }
.landingTable tbody tr:hover { ... }
```

Keep the palette and border language aligned with the source `innies` table shell.

- [ ] **Step 4: Apply those classes in `LandingProductsTable.tsx`**

Wrap the table in the mirrored container and keep it centered under the hero link row.

- [ ] **Step 5: Run tests to verify all are green**

Run: `pnpm test`
Expected: PASS

## Chunk 4: Final Verification

### Task 4: Verify build and rendered structure

**Files:**
- No new files unless fixes are needed

- [ ] **Step 1: Run production build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 2: Optional local dev sanity check**

Run: `pnpm dev`
Expected: landing page serves with the products table under the current link row.

- [ ] **Step 3: Commit if desired**

Run: `git status --short`
Expected: table-related file additions and modifications ready to review.

## Notes

- Keep the one-liner values as placeholders for now.
- Keep the table static; do not add sorting, hooks, state, or analytics dependencies.
- Prefer copying the visual language of the source table shell over inventing new table chrome.
