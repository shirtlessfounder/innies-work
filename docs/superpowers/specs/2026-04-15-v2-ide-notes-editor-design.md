# V2 Monaco Notes Editor Design

Date: 2026-04-15
Target: `/Users/dylanvu/.config/superpowers/worktrees/innies-work/percent-v2-clone`
Route: `/v2`
Tab: `notes.md`
Supersedes: editor-surface decisions in `2026-04-15-v2-shared-notes-design.md`

## Goal

Replace the current fake editor in `notes.md` with a real Monaco editor that feels native to the existing `/v2` shell.

The notes tab should keep the current shared-document backend and realtime behavior, but the editing surface should behave like an actual macOS editor:

- line numbers only for real lines
- native cursoring and selection behavior
- proper arrow-key navigation
- `Option+Left/Right` word movement
- `Cmd+Left/Right` line-edge movement
- `Cmd+Up/Down` document-bound movement
- soft wrap for long lines

The result should look embedded in the app, not like a separate IDE window dropped into the page.

## Scope

Included:

- Replace the custom notes surface with Monaco in the `notes.md` tab
- Keep the existing shared-notes API and Postgres persistence model
- Keep autosave, blur/page-hide flush, and SSE-driven remote updates
- Hide shell-level line numbers while `notes.md` is active so Monaco owns the gutter
- Style Monaco to match the current dark shell
- Enable soft wrap for notes
- Align `notes.md` spacing, gutter width, border, and row rhythm to the existing shell layout

Excluded:

- Multiple shared documents
- Markdown preview
- Find panel, command palette, diagnostics, or language tooling in first pass
- CRDT or OT-style concurrent editing
- Whole-shell editor abstraction for all tabs
- Restyling the other `/v2` tabs to match Monaco defaults

## Recommended Approach

Embed Monaco directly inside `SharedNotesTab` and treat it as a plain-text document editor backed by the existing shared-notes APIs.

Why:

- Monaco already solves the behaviors the current custom editor fakes poorly.
- It provides the keyboard fidelity the user asked for without rebuilding cursor, gutter, selection, and wrapping logic by hand.
- The current backend contract is already sufficient for a single shared note document.
- Limiting Monaco to `notes.md` avoids a larger shell refactor while still making the notes tab feel correct.

## Architecture

### Editor Host

`SharedNotesTab.tsx` becomes a Monaco host component instead of a hand-rendered editor.

Responsibilities:

- create and own the Monaco instance
- load initial content from `/api/v2/notes`
- mirror Monaco changes into local dirty/saved state
- debounce saves
- flush immediate saves on blur and page lifecycle transitions
- apply remote updates when the editor is idle

The shared-notes backend stays unchanged:

- `GET /api/v2/notes`
- `PUT /api/v2/notes`
- `GET /api/v2/notes/stream`

### Shell Integration

The `/v2` shell stays intact:

- same header
- same sidebar
- same footer
- same `notes.md` tab

Only the content region for `notes.md` changes.

Because Monaco provides its own gutter and line numbers, the shell-level `LineNumbers` rail should not render while `activeTab === 'notes.md'`. Other tabs can keep the current shell behavior.

This prevents:

- double gutters
- mismatched line counts
- empty fake lines before the first real newline

The existing shell remains the visual source of truth. `notes.md` should conform to the spacing rhythm already used by the other tabs instead of pulling the rest of the shell toward Monaco defaults.

### Monaco Configuration

Monaco should be configured as an embedded notes editor, not a full IDE takeover.

First-pass settings:

- plain text model
- `wordWrap: 'on'`
- minimap off
- glyph margin off
- folding off
- line numbers on
- automatic layout on
- scroll beyond last line off
- overview ruler kept minimal
- dark theme aligned to the existing shell
- subtle active-line highlight

The editor should fill the notes pane and visually sit on the same dark background used by the shell content area.

### Visual Alignment

The current mismatch is mostly about layout rhythm, not editor behavior. Monaco already solves the cursoring and keybinding fidelity problem; this pass should tune its visual layout to match the shell.

The alignment target is the existing shell chrome:

- `13px` editor text
- `24px` row rhythm
- `48px` gutter width
- `1px solid #2B2B2B` gutter divider
- `#858585` inactive line-number color
- the same outer content inset used by the non-notes tabs

Implementation should prefer shared layout tokens over scattered magic numbers so the shell and the Monaco notes pane cannot drift independently again.

## Behavior

### Local Editing

Monaco becomes the source of truth for:

- caret movement
- selection
- line-number generation
- vertical navigation
- wrapped-line display
- platform keybindings

The document remains plain shared text. No markdown rendering layer is introduced.

### Save Model

The existing durability behavior stays:

- initial load from `GET /api/v2/notes`
- debounced save during edits
- immediate save on blur
- immediate keepalive save on `pagehide` and hidden-tab transitions

Monaco content changes should update the same local state already used for:

- `content`
- `savedContent`
- `revision`
- `status`
- `lastSavedAt`

### Remote Updates

The current simple conflict model stays in place:

- if local editor is clean, apply remote updates immediately
- if local editor is dirty, do not overwrite it
- show `remote update available`
- next successful local save wins

This pass does not add merge UI or collaborative cursors.

## UX Constraints

The notes tab should feel integrated into the app instead of standing apart as its own window.

That means:

- no extra editor frame inside the pane
- no separate titlebar
- no visible nested app chrome
- gutter and content should align naturally with the surrounding shell spacing
- status text should stay subtle and remain part of the existing pane

The editor should read as "the content of `notes.md` in this shell", not "an embedded external tool."

Consistency is more important than adopting Monaco defaults. In this pass, other tabs do not move; `notes.md` moves to them.

## Error Handling

If the notes API fails to load:

- keep the tab mounted
- show a terse offline or error state
- do not start misleading realtime behavior

If save fails:

- preserve the local Monaco buffer
- show `save failed`

If SSE disconnects:

- keep the local editor interactive
- preserve the current reconnect behavior for the stream path

## Testing

Automated coverage should verify:

- `notes.md` mounts a Monaco-backed notes component
- shell line numbers are hidden for `notes.md`
- shared-notes API and stream wiring still exist
- save-on-blur and lifecycle flush behavior still exist
- realtime update handling still preserves dirty local drafts

Manual verification should cover:

- line numbers appear only after actual newlines
- arrow keys feel native
- `Option+Left/Right`, `Cmd+Left/Right`, and `Cmd+Up/Down` behave correctly on macOS
- soft wrap works for long lines
- saved content survives refresh
- two tabs stay in sync when one is idle
- notes still look visually integrated with the `/v2` shell
- `watch-me-work.md` and `notes.md` have matching outer inset, gutter width, divider position, and first-line start

## File Shape

Planned modifications:

- `package.json`
- `pnpm-lock.yaml`
- `src/components/vscodeV2/SharedNotesTab.tsx`
- `src/components/vscodeV2/VscodeShell.tsx`
- `src/components/vscodeV2/LineNumbers.tsx`
- `tests/percentV2Landing.test.mjs`

Possible additions:

- a small Monaco loader/helper under `src/components/vscodeV2/` if needed to keep `SharedNotesTab.tsx` focused
- a shared layout token module under `src/components/vscodeV2/` if needed to keep shell spacing and Monaco spacing aligned

## Risks

- Monaco adds bundle weight relative to the current custom editor.
- Theme/styling work must be deliberate or the tab will look pasted-in.
- Monaco model updates must be applied carefully so remote sync does not reset cursor state unnecessarily.
- If spacing is copied loosely instead of tokenized, the shell and the notes tab will drift again the next time one side changes.

## Notes

- This is an editor-surface redesign, not a backend redesign.
- The shared document remains `v2:notes.md`.
- The right first pass is plain text plus real editor fidelity, not feature sprawl.
