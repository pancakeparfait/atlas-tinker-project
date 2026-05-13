---
phase: 02-multi-image-support
plan: 06
subsystem: ui
tags: [react, next-image, recipe-list, IMG-07, tdd]

requires:
  - phase: 02-02
    provides: Recipe list response carries primaryImageId per recipe
  - phase: 02-03
    provides: Recipe interface typed primaryImageId on the client
provides:
  - Primary image thumbnail (or Utensils placeholder) on every recipe Card in the list
affects: []

tech-stack:
  added: []
  patterns:
    - "Ternary on primaryImageId in the Card render to choose <Image> vs placeholder <div>"
    - "Utensils placeholder uses aria-label 'No photo for {title}' so tests can discover it"

key-files:
  created:
    - src/app/recipes/__tests__/page.test.tsx
  modified:
    - src/app/recipes/page.tsx

key-decisions:
  - "Use Utensils icon as placeholder rather than introducing a placeholder image asset (UI-SPEC Surface 5)"
  - "Render the thumbnail/placeholder ABOVE the existing CardHeader so the existing card layout (title, badge, description, footer) is preserved"
  - "alt text on the thumbnail equals the recipe title — discoverable via screen.getByAltText"

patterns-established:
  - "Recipe list Card now has an image slot at top; same primaryImageId field used by detail page is reused here for thumbnail src"

requirements-completed:
  - IMG-07

duration: ~15min (inline after wave 4 API instability)
completed: 2026-05-13
---

# Plan 02-06: Recipe List Primary Thumbnail Summary

**Recipe grid Cards now show a 160x120 primary thumbnail or a Utensils placeholder per Card; IMG-07 closed.**

## Performance

- **Duration:** ~15 min (inline RED + GREEN + SUMMARY on main after worktree-based attempts hit API errors)
- **Completed:** 2026-05-13
- **Tasks:** 1/1

## Accomplishments

- Each Card with `primaryImageId` renders a `next/image` at the documented dimensions and rounded top corners.
- Each Card without `primaryImageId` renders a Utensils icon placeholder with the same height utility and a discoverable `aria-label`.
- No regression on existing Card behavior (title, draft badge, rating, description, footer, click handler).

## Task Commits

1. **Task 1 RED** — `dc477a4` test(02-06): add failing tests for primary thumbnail on recipe list cards
2. **Task 1 GREEN** — `ee17465` feat(02-06): render primary thumbnail or Utensils placeholder on recipe Cards

## Files Created/Modified

- `src/app/recipes/page.tsx` — added `Utensils` to lucide-react import, added `next/image` import, inserted ternary thumbnail block above `<CardHeader>`.
- `src/app/recipes/__tests__/page.test.tsx` — three tests (A: thumbnail src + dimensions, B: Utensils placeholder for recipes without `primaryImageId`, C: alt text equals title).

## Self-Check: PASSED

- `npm test` — 180/180 passing across 15 suites
- `npm run type-check` — exits 0
- `grep -E "primaryImageId" src/app/recipes/page.tsx` — matches twice (ternary + interpolation)
- `grep -c "Utensils" src/app/recipes/page.tsx` — 2 (import + JSX)
- `grep -E "width=\\{160\\}.*height=\\{120\\}" src/app/recipes/page.tsx` — matches
- `grep -E "rounded-t-lg" src/app/recipes/page.tsx` — matches

## Phase 2 Test Count Delta

- Baseline (before phase): 111
- After phase: 180
- Net new tests in phase 2: +69

## Phase 2 Requirements Coverage

All seven IMG-* requirements observably satisfied end-to-end:

- IMG-01 (upload multiple): 02-02 routes + 02-05 ImageUploadZone
- IMG-02 (display all): 02-04 ImageGallery on detail page
- IMG-03 (reorder): 02-02 PATCH /reorder + 02-05 SortableThumbnailStrip via @dnd-kit
- IMG-04 (delete): 02-02 DELETE route + 02-05 thumbnail delete with window.confirm
- IMG-05 (10 MB / type validation): 02-01 schema constraints + 02-02 route validation + 02-05 client-side validation rows
- IMG-06 (primary as order=0): 02-01 adapter renormalization + 02-02 list/detail projections + 02-04 Primary badge
- IMG-07 (list thumbnails): 02-06 (this plan)

## Cross-cutting cleanup observed

- The legacy `/api/recipes/[id]/image` route (singular) is still in place but no longer used anywhere in the UI; the detail page no longer gates on `recipe.imageUrl`. A follow-up phase could remove the legacy single-image route and the `imageUrl` field on the Recipe model once the migration backfill is observed to be stable in production.
