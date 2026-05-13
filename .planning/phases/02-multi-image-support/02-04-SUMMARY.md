---
phase: 02-multi-image-support
plan: 04
subsystem: ui
tags: [react, next-image, image-gallery, recipe-detail, tdd]

requires:
  - phase: 02-03
    provides: Recipe interface extended with images array and primaryImageId
  - phase: 02-02
    provides: Binary GET /api/recipes/[id]/images/[imageId] endpoint
provides:
  - Read-only ImageGallery client component (hero + clickable thumbnail strip + empty state)
  - Recipe detail page wired to ImageGallery (legacy imageUrl gate removed)
affects: [02-05, 02-06, future read-view phases]

tech-stack:
  added: []
  patterns:
    - "Component receives images as a prop; no TanStack hook calls inside the gallery itself"
    - "Defensive sort by order inside the component — does not rely on caller invariants"
    - "Hero <Image fill> requires position:relative on its parent (Pitfall 3 enforced)"
    - "Page test mocks ImageGallery via data-testid + data-image-count so detail page tests stay focused on wiring"

key-files:
  created:
    - src/components/recipes/image-gallery.tsx
    - src/components/recipes/__tests__/image-gallery.test.tsx
  modified:
    - src/app/recipes/[id]/page.tsx
    - src/app/recipes/[id]/__tests__/page.test.tsx

key-decisions:
  - "Component is purely props-driven; no hook usage so it can be reused in tests trivially"
  - "imageUrl field stays on the Recipe interface but is no longer gated on for display (RESEARCH A1 / Open Question 1 RESOLVED)"
  - "Page test mocks the gallery rather than rendering its internals — keeps detail page test scoped to wiring; the gallery's own tests cover its behavior"
  - "Empty state copy is verbatim from UI-SPEC Copywriting Contract (no paraphrasing)"

patterns-established:
  - "Client gallery component receives data via prop, not query hook — predictable rendering for tests and for callers that already have the images array"
  - "Active thumbnail is indicated via ring-2 ring-primary on the wrapping button; non-active thumbnails use opacity-80 hover:opacity-100"
  - "Primary badge is verbatim text 'Primary' on order=0 thumbnail (no other thumbnails)"

requirements-completed:
  - IMG-02

duration: ~25min (across worktree execution and inline finishing)
completed: 2026-05-13
---

# Plan 02-04: Read-Only Image Gallery Summary

**ImageGallery client component built and wired into recipe detail page; legacy `recipe.imageUrl` hero gate removed in favor of the new images array.**

## Performance

- **Duration:** ~25 min (Task 1 in worktree under gsd-executor; Task 2 completed inline on main after API errors took the wave-4 executors down)
- **Completed:** 2026-05-13
- **Tasks:** 2/2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- Brand-new `ImageGallery` component renders the hero image, clickable thumbnail strip, primary badge, and the documented empty state — six behavioral tests pass (A–F per plan).
- Recipe detail page replaces the legacy `recipe.imageUrl &&` gate with a single `<ImageGallery>` invocation; the gallery degrades gracefully when `recipe.images` is empty or undefined.
- Detail-page tests now mock the gallery via `data-testid="image-gallery"` + `data-image-count`, and three new assertions cover the populated, empty, and undefined image cases.

## Task Commits

1. **Task 1 RED** — `939d8e1` test(02-04): add failing tests for ImageGallery
2. **Task 1 GREEN** — `d1204bc` feat(02-04): implement ImageGallery client component
3. **Wave merge** — `8a398b0` chore: merge executor worktree (02-04 task 1 only — task 2 + summary pending)
4. **Task 2 GREEN** — `6dcf588` feat(02-04): replace recipe detail imageUrl gate with ImageGallery

Task 2's RED step was elided when finishing inline (the existing detail-page tests already asserted on the legacy `imageUrl` markup; updating them as part of the GREEN commit served the same purpose).

## Files Created/Modified

- `src/components/recipes/image-gallery.tsx` — `'use client'` component, props-driven hero + thumbnail strip + empty state.
- `src/components/recipes/__tests__/image-gallery.test.tsx` — six RTL tests (empty state, hero default, hero swap on click, active thumbnail ring, primary badge, keyboard-focusable buttons).
- `src/app/recipes/[id]/page.tsx` — removed legacy `recipe.imageUrl &&` block + unused `next/image` import; added `ImageGallery` import and single-line render.
- `src/app/recipes/[id]/__tests__/page.test.tsx` — added gallery mock, extended `mockRecipeComplete` with `images` and `primaryImageId`, replaced legacy image-rendering assertion with three new gallery-data-count assertions (populated / empty / undefined).

## Self-Check: PASSED

- `pnpm test` — 177/177 passing across 14 suites
- `pnpm exec tsc --noEmit` — exits 0
- `grep -E "<ImageGallery" 'src/app/recipes/[id]/page.tsx'` — matches exactly once
- `grep -E "recipe\\.imageUrl\\s*&&" 'src/app/recipes/[id]/page.tsx'` — no matches (legacy gate gone)
- `grep -F "'use client'" src/components/recipes/image-gallery.tsx` — top of file
- Copy strings match UI-SPEC verbatim ("No photos yet", "Add photos to help others follow along…", "Primary")

## Notes for downstream consumers

- Plan 02-05's edit-view sortable strip can match this strip's visual rhythm (`flex gap-2 overflow-x-auto py-2` outer, 80×80 thumbnails, primary badge overlay).
- `ImageGalleryProps` shape: `{ recipeId: string; recipeTitle: string; images: Array<{ id: string; order: number; fileName: string; mimeType: string }> }`.
- Component does not call any TanStack hook — parents that already have the images array (recipe detail page) pass them down directly.
