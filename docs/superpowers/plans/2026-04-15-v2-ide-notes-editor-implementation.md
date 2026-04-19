# V2 Monaco Notes Editor Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake `notes.md` editor in `/v2` with an embedded Monaco editor that feels native to the shell while preserving the existing shared-notes backend, autosave, refresh persistence, and realtime updates.

**Architecture:** Keep `SharedNotesTab` as the shared-notes state and sync host, but move the editing surface to Monaco. Add a focused Monaco wrapper component or client-only integration seam, preserve the existing `/api/v2/notes` and SSE routes, and hide the shell-level line-number rail while `notes.md` is active so Monaco owns the gutter.

**Tech Stack:** Next.js App Router, React client components, TypeScript, `@monaco-editor/react`, existing shared notes API, Node test runner

---

## File Map

- `package.json`
  Add the Monaco React dependency.
- `pnpm-lock.yaml`
  Record the dependency graph update.
- `src/components/vscodeV2/SharedNotesTab.tsx`
  Keep load/save/SSE state management, remove the hand-rolled editor surface, host Monaco, preserve status messaging and lifecycle flush behavior.
- `src/components/vscodeV2/MonacoSharedNotesEditor.tsx`
  New focused client-only editor wrapper responsible for Monaco mount, theme, options, blur hooks, and value synchronization without resetting cursor state on every keystroke.
- `src/components/vscodeV2/VscodeShell.tsx`
  Hide shell line numbers when `notes.md` is active.
- `tests/percentV2Landing.test.mjs`
  Add/replace source-level assertions for Monaco integration and shell gutter suppression.

Implementation should follow `@superpowers/test-driven-development` and finish with `@superpowers/verification-before-completion`.

## Chunk 1: Lock Regression Coverage To The New Architecture

### Task 1: Replace the old custom-editor assertions with Monaco-specific source coverage

**Files:**
- Modify: `tests/percentV2Landing.test.mjs`

- [ ] **Step 1: Write failing assertions for Monaco integration**

Update the `v2 notes tab` assertions so they expect:

- `package.json` references `@monaco-editor/react`
- `SharedNotesTab.tsx` no longer contains the custom caret math helpers such as `getLineStarts`, `getCaretPosition`, or a hidden offscreen textarea editor seam
- `SharedNotesTab.tsx` references a Monaco wrapper or `@monaco-editor/react`
- Monaco options include note-appropriate settings such as:

```ts
wordWrap: 'on'
minimap: { enabled: false }
glyphMargin: false
folding: false
lineNumbers: 'on'
automaticLayout: true
scrollBeyondLastLine: false
```

- `VscodeShell.tsx` conditionally suppresses shell line numbers for `notes.md`
- save-on-blur and page lifecycle flush hooks still exist

- [ ] **Step 2: Run the focused notes assertions to verify they fail**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 notes tab"`
Expected: FAIL because the current implementation still uses the custom editor surface.

- [ ] **Step 3: Record the baseline unrelated suite failure**

Run: `node --test tests/percentV2Landing.test.mjs`
Expected: FAIL for two reasons:

- the new Monaco notes assertions should fail
- the worktree already has an unrelated pre-existing failure in `v2 route is isolated from the current innies landing page and carries the shirtless founder hero copy`

Do not expand scope to fix the unrelated landing-page assertion in this plan.

### Task 2: Add the Monaco dependency before touching production code

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add the dependency**

Run: `pnpm add @monaco-editor/react`
Expected: `package.json` and `pnpm-lock.yaml` update.

- [ ] **Step 2: Verify the dependency landed in source control**

Run: `git diff -- package.json pnpm-lock.yaml`
Expected: shows `@monaco-editor/react` and only the lockfile changes needed for it.

- [ ] **Step 3: Re-run the focused notes assertions**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 notes tab"`
Expected: still FAIL because the notes tab has not been migrated yet.

## Chunk 2: Build The Monaco Editor Seam

### Task 3: Create a focused Monaco wrapper instead of inflating `SharedNotesTab.tsx`

**Files:**
- Create: `src/components/vscodeV2/MonacoSharedNotesEditor.tsx`

- [ ] **Step 1: Create the client-only Monaco wrapper file**

Start the file with:

```tsx
'use client';
```

and wire a client-safe Monaco import, either directly or through `next/dynamic` if needed to avoid SSR issues.

- [ ] **Step 2: Define the wrapper interface**

Give the wrapper one clear job. It should accept only the state and callbacks the parent actually needs:

```ts
type MonacoSharedNotesEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onMount?: () => void;
  status: string;
};
```

Adjust names if the implementation needs slightly different props, but keep the surface narrow.

- [ ] **Step 3: Add the Monaco theme and options**

Configure Monaco to feel embedded in the current shell, not like a separate app:

```ts
const options = {
  automaticLayout: true,
  folding: false,
  glyphMargin: false,
  lineNumbers: 'on',
  minimap: { enabled: false },
  renderLineHighlight: 'line',
  scrollBeyondLastLine: false,
  wordWrap: 'on'
} satisfies editor.IStandaloneEditorConstructionOptions;
```

Also set:

- `fontFamily` to the existing Monaco-style stack used in the app
- `fontSize` and `lineHeight` to match the surrounding shell rhythm
- dark background colors that align with `/v2`

- [ ] **Step 4: Preserve cursor and selection state during parent re-renders**

Implement the wrapper so it does **not** blindly recreate the editor or call `setValue()` on every render. The update rule should be:

- compare incoming `value` with `editor.getValue()`
- only push external value changes when they differ
- treat `onDidChangeModelContent` from local typing as the source for parent updates

- [ ] **Step 5: Wire Monaco blur events back to the parent**

Use Monaco’s blur hook so `SharedNotesTab` can keep its immediate-save behavior.

- [ ] **Step 6: Keep the notes status overlay inside the pane**

Render status text in the wrapper or keep a slot for the parent so the live/saved/remote-update state remains visually integrated with the notes pane.

## Chunk 3: Replace The Hand-Rolled Editor With Monaco

### Task 4: Reduce `SharedNotesTab.tsx` to shared-note state and sync logic

**Files:**
- Modify: `src/components/vscodeV2/SharedNotesTab.tsx`

- [ ] **Step 1: Remove the fake editor helpers**

Delete the custom editing helpers and state that only existed to fake a text editor, including the manual caret math and offscreen textarea rendering path.

- [ ] **Step 2: Import and render the new Monaco wrapper**

The render path should become a simple host:

```tsx
<MonacoSharedNotesEditor
  value={content}
  onChange={setContent}
  onBlur={() => {
    void persistSharedNotesRef.current({ immediate: true });
  }}
  status={status}
/>
```

Thread any additional props only if needed for saved timestamp or loading state.

- [ ] **Step 3: Keep the existing load/save/SSE behavior intact**

Preserve:

- initial load from `/api/v2/notes`
- debounced `PUT /api/v2/notes`
- `pagehide` and `visibilitychange` keepalive flush
- dirty-draft protection when remote updates arrive

Do **not** redesign the backend contract in this task.

- [ ] **Step 4: Apply remote updates without clobbering an active draft**

Keep the current behavior:

- clean editor -> apply incoming server content immediately
- dirty editor -> keep local content, set `remote update available`

Because Monaco now owns selection/cursor behavior, ensure remote clean updates do not destroy the editing experience by remounting the wrapper.

- [ ] **Step 5: Keep the notes pane full-width and visually integrated**

Remove the old `max-w-5xl` style constraint if it makes Monaco feel boxed in. The notes pane should read as the content area of `notes.md`, not a widget placed inside it.

- [ ] **Step 6: Run the focused notes assertions**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 notes tab"`
Expected: PASS

## Chunk 4: Hand Monaco The Gutter, Not The Shell

### Task 5: Hide shell line numbers when `notes.md` is active

**Files:**
- Modify: `src/components/vscodeV2/VscodeShell.tsx`

- [ ] **Step 1: Add a single conditional for shell line-number rendering**

Use a focused branch such as:

```tsx
const showShellLineNumbers = activeTab !== 'notes.md';
```

- [ ] **Step 2: Render `LineNumbers` only when the shell should own that gutter**

Keep other tabs unchanged. `notes.md` should rely entirely on Monaco’s gutter.

- [ ] **Step 3: Re-run the shell and notes-focused assertions**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 shell preserves|v2 notes tab"`
Expected: PASS for the shell/notes tests.

## Chunk 5: Verification And Runtime Handoff

### Task 6: Verify the migration with honest scope boundaries

**Files:**
- Verify: `src/components/vscodeV2/MonacoSharedNotesEditor.tsx`
- Verify: `src/components/vscodeV2/SharedNotesTab.tsx`
- Verify: `src/components/vscodeV2/VscodeShell.tsx`

- [ ] **Step 1: Run the focused notes regression set**

Run: `node --test tests/percentV2Landing.test.mjs --test-name-pattern "v2 notes tab|v2 shell preserves"`
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `pnpm build`
Expected: PASS

- [ ] **Step 3: Run the full suite and record the known unrelated failure if it remains**

Run: `pnpm test`
Expected: likely FAIL on the pre-existing landing-page assertion unless it has been fixed elsewhere in the worktree. Document that this is outside the Monaco notes scope.

- [ ] **Step 4: Manually verify editor fidelity in the browser**

Open `/v2`, switch to `notes.md`, and verify:

- line numbers are Monaco’s gutter, not the shell’s fake rail
- line numbers only appear for real lines
- soft wrap works for long lines
- arrow navigation feels native
- `Option+Left/Right`, `Cmd+Left/Right`, and `Cmd+Up/Down` behave correctly on macOS
- the editor looks embedded in the existing shell, not like a separate window

- [ ] **Step 5: Manually verify shared-notes behavior still works**

With a working `DATABASE_URL`, verify:

- edits autosave
- blur and fast refresh still persist content
- two `/v2` tabs stay in sync when one is idle
- a dirty local draft is not overwritten by an incoming remote update

Plan complete and saved to `docs/superpowers/plans/2026-04-15-v2-ide-notes-editor-implementation.md`. Ready to execute?
