# V2 Monaco Notes Shell Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Monaco-backed `notes.md` tab visually match the `/v2` shell spacing and gutter rhythm without changing the rest of the tabs.

**Architecture:** Keep the current Monaco notes editor and shared-notes backend intact. Introduce shared shell layout tokens for gutter width, divider styling, row rhythm, and content inset, then apply those tokens to both the shell line-number rail and the Monaco notes pane so `notes.md` conforms to the existing shell design instead of pulling other tabs toward Monaco defaults.

**Tech Stack:** Next.js App Router, React client components, TypeScript, `@monaco-editor/react`, Node test runner

---

## File Map

- `src/components/vscodeV2/LineNumbers.tsx`
  Source of truth for the shell gutter appearance today; update to consume shared tokens instead of hard-coded values.
- `src/components/vscodeV2/VscodeShell.tsx`
  Source of truth for non-notes tab inset; expose the same outer content inset to `notes.md`.
- `src/components/vscodeV2/MonacoSharedNotesEditor.tsx`
  Tune Monaco gutter, top padding, border treatment, and outer inset so the notes pane matches the shell.
- `src/components/vscodeV2/editorLayout.ts`
  New shared token module for gutter width, border color, row height, font sizing, and shell content inset.
- `tests/percentV2Landing.test.mjs`
  Add source-level assertions for the shared token usage and notes/shell alignment hooks.

Implementation should follow `@superpowers/test-driven-development` and finish with `@superpowers/verification-before-completion`.

## Chunk 1: Lock The Alignment Expectations In Tests

### Task 1: Add failing regression coverage for shared spacing and gutter alignment

**Files:**
- Modify: `tests/percentV2Landing.test.mjs`

- [ ] **Step 1: Write failing source assertions for alignment**

Add assertions that expect:

- a shared layout token file exists at `src/components/vscodeV2/editorLayout.ts`
- both `LineNumbers.tsx` and `MonacoSharedNotesEditor.tsx` reference the same shared constants
- the shared token file includes:

```ts
export const EDITOR_GUTTER_WIDTH = 48;
export const EDITOR_ROW_HEIGHT = 24;
export const EDITOR_FONT_SIZE = 13;
export const EDITOR_GUTTER_BORDER = '1px solid #2B2B2B';
```

- `VscodeShell.tsx` uses a shared content inset value instead of an inline `px-8 py-12` string
- `MonacoSharedNotesEditor.tsx` references the shared content inset and gutter sizing instead of relying on Monaco defaults alone

- [ ] **Step 2: Run the focused shell/notes assertions to verify they fail**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 shell preserves|v2 notes tab"`
Expected: FAIL because the shared layout token file and token usage do not exist yet.

- [ ] **Step 3: Record the known unrelated suite failure**

Run: `pnpm test`
Expected: FAIL on at least:

- the new alignment assertions
- the pre-existing unrelated landing-page assertion in `v2 route is isolated from the current innies landing page and carries the shirtless founder hero copy`

Do not widen scope to fix the landing-page assertion in this plan.

## Chunk 2: Extract Shared Shell Layout Tokens

### Task 2: Create a shared layout token module for shell and Monaco

**Files:**
- Create: `src/components/vscodeV2/editorLayout.ts`
- Modify: `src/components/vscodeV2/LineNumbers.tsx`
- Modify: `src/components/vscodeV2/VscodeShell.tsx`

- [ ] **Step 1: Create the shared token file**

Add the shared constants:

```ts
export const EDITOR_FONT_FAMILY = 'Monaco, Menlo, "Courier New", monospace';
export const EDITOR_FONT_SIZE = 13;
export const EDITOR_ROW_HEIGHT = 24;
export const EDITOR_GUTTER_WIDTH = 48;
export const EDITOR_GUTTER_BORDER = '1px solid #2B2B2B';
export const EDITOR_LINE_NUMBER_COLOR = '#858585';
export const EDITOR_CONTENT_INSET_CLASS_NAME = 'px-8 py-12';
```

Use names close to these even if the final identifiers differ slightly. Keep the file focused on layout tokens only.

- [ ] **Step 2: Make `LineNumbers.tsx` consume the shared tokens**

Replace hard-coded values for:

- font family
- font size
- gutter width
- gutter border
- line-number color
- row rhythm

- [ ] **Step 3: Make `VscodeShell.tsx` consume the shared content inset token**

Replace the inline non-notes wrapper class with a shared constant or helper based on the token module.

- [ ] **Step 4: Run the focused shell/notes assertions**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 shell preserves|v2 notes tab"`
Expected: still FAIL because Monaco has not been aligned to the new tokens yet.

## Chunk 3: Make Monaco Conform To The Shell

### Task 3: Align the Monaco notes pane to the shell’s gutter and inset rhythm

**Files:**
- Modify: `src/components/vscodeV2/MonacoSharedNotesEditor.tsx`
- Modify: `src/components/vscodeV2/VscodeShell.tsx`

- [ ] **Step 1: Import and apply the shared font and row tokens**

Use the shared token file for:

- font family
- font size
- line height / row height
- line-number color

- [ ] **Step 2: Align Monaco’s gutter and border to the shell**

Adjust the Monaco theme/options so the notes gutter visually matches:

- `48px` gutter width
- shell divider color
- shell line-number color

If Monaco cannot take an exact gutter width directly, use the closest supported control such as `lineNumbersMinChars` plus pane padding and theme tweaks to visually match the shell.

- [ ] **Step 3: Align outer content inset**

Do not leave the notes pane full-bleed if the other tabs are inset. Reintroduce the shell’s content inset around the Monaco pane so the first visible row starts in the same place that rows start on tabs like `watch-me-work.md`.

- [ ] **Step 4: Align top-of-file start position**

Tune Monaco padding so the first visible row sits on the same vertical rhythm as the shell’s line-number rows. Keep the status overlay out of the way so it does not distort line 1.

- [ ] **Step 5: Preserve the existing Monaco behavior**

Do not regress:

- soft wrap
- blur-triggered save
- `pagehide` / `visibilitychange` flush
- realtime updates
- dirty draft preservation

- [ ] **Step 6: Run the focused shell/notes assertions**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 shell preserves|v2 notes tab"`
Expected: PASS

## Chunk 4: Verification And Browser Comparison

### Task 4: Verify the alignment pass with scope-limited evidence

**Files:**
- Verify: `src/components/vscodeV2/editorLayout.ts`
- Verify: `src/components/vscodeV2/LineNumbers.tsx`
- Verify: `src/components/vscodeV2/MonacoSharedNotesEditor.tsx`
- Verify: `src/components/vscodeV2/VscodeShell.tsx`

- [ ] **Step 1: Run the focused alignment regression set**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 shell preserves|v2 notes tab"`
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Run the full suite and record the known unrelated failure if it remains**

Run: `pnpm test`
Expected: likely FAIL only on the pre-existing landing-page assertion unless that has been fixed elsewhere. Document that it is outside this alignment scope.

- [ ] **Step 4: Compare `watch-me-work.md` and `notes.md` visually**

Open `/v2` and compare the two tabs directly. Verify:

- outer content inset matches
- gutter width matches
- divider position matches
- first visible row starts at the same vertical rhythm
- notes still feel integrated rather than full-bleed

- [ ] **Step 5: Confirm the notes behavior still works after the visual pass**

Verify:

- Monaco still handles cursoring and keybindings
- notes still autosave
- blur and refresh persistence still work
- two tabs still sync when one is idle

Plan complete and saved to `docs/superpowers/plans/2026-04-15-v2-monaco-notes-shell-alignment-implementation.md`. Ready to execute?
