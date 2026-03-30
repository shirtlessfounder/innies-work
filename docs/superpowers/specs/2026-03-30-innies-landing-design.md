# Innies Landing Page Visual Clone Design

Date: 2026-03-30
Target: `/Users/dylanvu/innies-work`
Source of truth: `/Users/dylanvu/innies/ui`

## Goal

Reproduce the current Innies landing page visually, as close to 1:1 as practical, inside `innies-work`.

This clone is visual-only. Any live data, auth state, org state, or backend form behavior may be replaced with static placeholders as long as the rendered output matches the source layout, styling, and motion.

## Scope

Included:

- Header layout and styling
- Brand line, title, prompt rows, and typed command animation
- Live-status panel layout with placeholder values
- Hero frame, preview badge cluster, and linked image treatment
- Right-side form card visual structure
- Footer links styling
- Shared background, gradients, shell, console styling, and spacing
- Source image assets required for the landing page

Excluded:

- Real auth/session integration
- Real org creation flow
- Real live-meta polling
- Real org links
- Any non-landing routes beyond what is needed to satisfy local rendering

## Recommended Approach

Use a direct transplant of the source landing page implementation, then replace dynamic dependencies with static props and placeholder markup.

Why:

- Lowest risk of visual drift
- Preserves exact spacing, CSS, and animation behavior
- Faster than recreating by eye

## Implementation Shape

Create a minimal Next app in `innies-work` with these pieces:

- `src/app/page.tsx`
  Renders the landing page with the same structure as the source page.
- `src/app/page.module.css`
  Copied from the source page so the page renders with matching layout and styling.
- `src/app/globals.css`
  Copied from the source app for base typography and element resets.
- `src/components/LandingHeroHeader.tsx`
  Copied from source, but converted to use static placeholder data instead of live hooks.
- `src/components/PlaceholderOrgCreationForm.tsx`
  Visual stand-in for the source org creation form, matching the card and control layout without submitting anywhere.
- `public/images/archive-computer.png`
- `public/images/innies-eye-logo-green-square.svg`

## Placeholder Rules

Dynamic content should be frozen to stable placeholder values:

- Live badge: static status such as `LIVE`
- Last updated timestamp: fixed string
- Auth state: fixed label or placeholder login link text
- Active org list: fixed org names or omitted if that matches the current unauthenticated layout best
- Form submit: no backend call; button may be inert

The placeholders must not change the visible composition of the page.

## Visual Fidelity Rules

- Preserve source class names and CSS values wherever possible
- Preserve exact text casing, tracking, spacing, and button labels unless a dynamic value must be frozen
- Preserve image dimensions and asset paths where possible
- Preserve the header typing animation timing from the source component
- Do not introduce redesign, cleanup, or visual interpretation

## Error Handling

- If a copied source dependency is too coupled to backend code, replace only that dependency with a local static equivalent
- If an asset path differs in the new app, keep the file contents identical and update only the local reference path

## Verification

Minimum verification:

- App boots locally
- Landing page renders without runtime errors
- Header, hero, and form card visually match the source structure
- Placeholder values do not break layout

Preferred verification:

- Run the source app and the clone app side by side
- Compare screenshots for visible drift in header, hero, form card, spacing, and gradients

## Notes

`innies-work` is not currently a git repo, so this spec can be written locally but not committed unless the directory is initialized as a repository.
