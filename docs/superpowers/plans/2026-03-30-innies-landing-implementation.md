# Innies Landing Visual Clone Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual-only 1:1 landing-page clone of `/Users/dylanvu/innies/ui` inside `/Users/dylanvu/innies-work`, with placeholders for live/auth/form behavior.

**Architecture:** Create a minimal Next 15 app that reuses the source landing page structure, CSS, and image assets. Replace only the dynamic data and backend-coupled form logic with static placeholder components so the rendered page stays visually aligned with the source.

**Tech Stack:** Next.js 15, React 18, TypeScript, CSS Modules, `node:test`

---

## File Structure

### Files to create

- `package.json`
- `tsconfig.json`
- `next.config.mjs`
- `next-env.d.ts`
- `.gitignore`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/app/page.module.css`
- `src/components/LandingHeroHeader.tsx`
- `src/components/PlaceholderOrgCreationForm.tsx`
- `src/components/placeholderForm.module.css`
- `tests/landingClone.test.mjs`
- `public/images/archive-computer.png`
- `public/images/innies-eye-logo-green-square.svg`

### File responsibilities

- `src/app/page.tsx`
  Assemble the source landing layout with the copied hero artwork, header, and placeholder form.
- `src/app/page.module.css`
  Carry over the source landing-page visual system and responsive rules.
- `src/components/LandingHeroHeader.tsx`
  Preserve the source header markup and typing animation while freezing live/auth/org values to placeholders.
- `src/components/PlaceholderOrgCreationForm.tsx`
  Match the source right-column form card visually without submit logic.
- `src/components/placeholderForm.module.css`
  Hold the extracted form-control styles from the source analytics CSS that the landing form depends on.
- `tests/landingClone.test.mjs`
  Guard the copied visual structure and critical style tokens with source-style static assertions.

## Chunk 1: Scaffold Minimal App Shell

### Task 1: Create app metadata and runtime config

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `next-env.d.ts`
- Create: `.gitignore`

- [ ] **Step 1: Write the failing test for required project files**

```js
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

test('project scaffold files exist', () => {
  assert.equal(existsSync('package.json'), true);
  assert.equal(existsSync('tsconfig.json'), true);
  assert.equal(existsSync('next.config.mjs'), true);
  assert.equal(existsSync('src/app/layout.tsx'), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/landingClone.test.mjs`
Expected: FAIL because the app scaffold files do not exist yet.

- [ ] **Step 3: Write minimal project config**

```json
{
  "name": "innies-work",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "node --test tests/*.test.mjs"
  },
  "dependencies": {
    "next": "15.0.7",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.19.13",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "typescript": "^5.9.2"
  }
}
```

- [ ] **Step 4: Add base layout and global styles entrypoint**

```tsx
import type { ReactNode } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Run test to verify scaffold now passes**

Run: `node --test tests/landingClone.test.mjs`
Expected: PASS for the scaffold existence assertion.

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`
Expected: lockfile created and install succeeds without peer-dependency errors.

- [ ] **Step 7: Commit scaffold if repo exists**

Run: `git rev-parse --is-inside-work-tree`
Expected: if true, commit scaffold files with `chore: scaffold innies-work landing clone`.

## Chunk 2: Lock Visual Structure With Tests

### Task 2: Add source-style assertions for the landing clone

**Files:**
- Modify: `tests/landingClone.test.mjs`

- [ ] **Step 1: Write failing tests for page structure, header placeholders, and CSS tokens**

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readSource(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('landing page links hero artwork to /innies and renders the placeholder form', () => {
  const pageSource = readSource('src/app/page.tsx');

  assert.ok(pageSource.includes('href="/innies"'));
  assert.ok(pageSource.includes('<LandingHeroHeader'));
  assert.ok(pageSource.includes('<PlaceholderOrgCreationForm'));
});

test('landing header keeps the welcome title and command animation targets', () => {
  const headerSource = readSource('src/components/LandingHeroHeader.tsx');

  assert.ok(headerSource.includes("welcome to innies computer"));
  assert.ok(headerSource.includes("['claude', 'codex', 'openclaw']"));
  assert.ok(headerSource.includes('PLACEHOLDER_GITHUB_LOGIN'));
});

test('landing styles preserve the hero and CTA sizing tokens from source', () => {
  const stylesSource = readSource('src/app/page.module.css');

  assert.ok(stylesSource.includes('--hero-frame-width: min(860px, 100vw - 96px);'));
  assert.ok(stylesSource.includes('width: calc(var(--hero-frame-width) * 0.76);'));
  assert.ok(stylesSource.includes('height: 48px;'));
  assert.ok(stylesSource.includes('cursor: grab;'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/landingClone.test.mjs`
Expected: FAIL because the page, header, and CSS content do not exist yet.

- [ ] **Step 3: Keep this test file open as the contract for the implementation**

No code beyond the test in this step.

- [ ] **Step 4: Commit test contract if repo exists**

Run: `git rev-parse --is-inside-work-tree`
Expected: if true, commit with `test: lock landing clone structure`.

## Chunk 3: Implement the Header, Form, Page, and Assets

### Task 3: Copy the landing page visuals into the new app

**Files:**
- Create: `src/app/page.tsx`
- Create: `src/app/page.module.css`
- Create: `src/app/globals.css`
- Create: `src/components/LandingHeroHeader.tsx`
- Create: `src/components/PlaceholderOrgCreationForm.tsx`
- Create: `src/components/placeholderForm.module.css`
- Create: `public/images/archive-computer.png`
- Create: `public/images/innies-eye-logo-green-square.svg`

- [ ] **Step 1: Implement the page shell with copied source structure**

```tsx
import Image from 'next/image';
import { LandingHeroHeader } from '../components/LandingHeroHeader';
import { PlaceholderOrgCreationForm } from '../components/PlaceholderOrgCreationForm';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.console}>
          <LandingHeroHeader brandSuffix="(BETA)" />
          <section className={styles.hero}>
            <div className={styles.heroInner}>
              <a href="/innies" className={styles.frame} aria-label="Open innies dashboard">
                {/* copied hero artwork block */}
              </a>
              <PlaceholderOrgCreationForm />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Copy `src/app/page.module.css` from the source landing page**

Source: `/Users/dylanvu/innies/ui/src/app/page.module.css`

Required outcome:
- Preserve the copied landing page gradients, shell, hero, CTA, footer, and responsive behavior
- Keep class names intact where the new page and header use them

- [ ] **Step 3: Copy `src/app/globals.css` from the source app**

Source: `/Users/dylanvu/innies/ui/src/app/globals.css`

- [ ] **Step 4: Implement `LandingHeroHeader.tsx` with static placeholders**

Use the source component as the base:
- Keep the typing animation constants and logic
- Remove `usePublicLiveMeta`
- Replace live status with a fixed object such as:

```ts
const PLACEHOLDER_META = {
  liveStatus: 'live',
  lastSuccessfulUpdateLabel: 'LAST 2026-03-30 18:26 EDT',
  githubLogin: 'shirtlessfounder',
  activeOrgs: ['innies', 'me-and-the-boys'],
};
```

- [ ] **Step 5: Implement `PlaceholderOrgCreationForm.tsx` using copied visual structure**

Use the source form as the visual reference:
- Keep one text input
- Keep the CTA button
- Keep the footer links row
- Do not call `fetch`, `router.push`, or auth redirects

```tsx
export function PlaceholderOrgCreationForm() {
  return (
    <form className={`${formStyles.managementFormGrid} ${pageStyles.heroForm}`}>
      <label className={`${formStyles.managementField} ${formStyles.managementFieldWide}`}>
        <input
          className={`${formStyles.managementInput} ${pageStyles.heroInput}`}
          defaultValue=""
          name="orgName"
          placeholder="me-and-the-boys"
          type="text"
        />
      </label>
      <div className={formStyles.managementActionRow}>
        <button className={pageStyles.primaryCta} type="button">
          <span>Create /me-and-the-boys org</span>
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Copy the minimal form-control CSS subset into `placeholderForm.module.css`**

Source blocks:
- `.managementFormGrid`
- `.managementField`
- `.managementFieldWide`
- `.managementActionRow`
- `.managementInput`
- `.managementInput::placeholder`
- `.managementInput:focus`

Source: `/Users/dylanvu/innies/ui/src/app/analytics/page.module.css`

- [ ] **Step 7: Copy the hero assets byte-for-byte**

Copy:
- `/Users/dylanvu/innies/ui/public/images/archive-computer.png`
- `/Users/dylanvu/innies/ui/public/images/innies-eye-logo-green-square.svg`

- [ ] **Step 8: Run tests to verify implementation passes**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 9: Commit implementation if repo exists**

Run: `git rev-parse --is-inside-work-tree`
Expected: if true, commit with `feat: add innies landing visual clone`.

## Chunk 4: Verify the App Boots and Renders

### Task 4: Run the build and local visual verification

**Files:**
- No new files unless fixes are needed

- [ ] **Step 1: Run production build**

Run: `pnpm build`
Expected: PASS with a built Next app and no TypeScript errors.

- [ ] **Step 2: Run the dev server**

Run: `pnpm dev`
Expected: local app available, typically at `http://localhost:3000`.

- [ ] **Step 3: Compare source and clone visually**

Run source app in `/Users/dylanvu/innies/ui` if needed:
- `pnpm dev`

Compare:
- Header title and prompt rows
- Typing animation cadence
- Live badge placement
- Hero artwork crop and hover treatment
- Right-side form width, spacing, and CTA sizing
- Footer links
- Mobile layout at narrow widths

- [ ] **Step 4: Fix any visible drift and rerun tests/build**

Run:
- `pnpm test`
- `pnpm build`

Expected: PASS after final adjustments.

- [ ] **Step 5: Commit verification fixes if repo exists**

Run: `git rev-parse --is-inside-work-tree`
Expected: if true, commit with `fix: align landing clone visuals`.

## Notes

- `innies-work` is currently not a git repo, so commit steps are conditional.
- Do not add live data fetching, auth, or backend wiring.
- If exact source visual parity requires copying more CSS from the source form path, prefer copying source rules over rewriting by hand.
