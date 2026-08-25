---
phase: 02-multi-image-support
plan: 05
subsystem: client-ui-images
tags:
  - react
  - client-component
  - dnd-kit
  - file-upload
  - rtl

# Dependency graph
requires:
  - phase: 02-multi-image-support
    plan: 03
    provides: useUploadRecipeImages, useDeleteRecipeImage, useReorderRecipeImages, RecipeImageMetadata, IMAGE_CONFIG (re-export consumed via storage-adapter)
  - phase: 02-multi-image-support
    plan: 02
    provides: POST/DELETE/PATCH HTTP contract for /api/recipes/[id]/images
  - phase: 02-multi-image-support
    plan: 01
    provides: recipe_images data model + IMAGE_CONFIG constants
provides:
  - ImageUploadZone client component (multi-file drag-drop + per-file validation + N-of-M progress)
  - SortableThumbnailStrip client component (@dnd-kit horizontal reorder + per-thumbnail delete-confirm + Primary badge)
  - Photos section on /recipes/[id]/edit that mounts both above <RecipeForm>
affects:
  - 02-06 (recipe list/detail integration — independent surface, no consumer linkage)

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core (already installed by orchestrator into worktree node_modules)"
    - "@dnd-kit/sortable"
    - "@dnd-kit/utilities"
  patterns:
    - "Client-side file validation as defense-in-depth: validateClientSide rejects oversized / wrong-MIME files before they hit the network; server still re-validates (plan 01 validateImage)."
    - "Captured-onDragEnd test pattern for @dnd-kit components: mock DndContext at module boundary, stash the prop on window.__dnd_onDragEnd__, invoke directly to assert reorder mutation arguments without simulating pointer/keyboard events."
    - "Verbatim UI-SPEC Copywriting Contract strings inlined in JSX so checker greps verify the exact copy without indirection."
    - "<section> wrapper above <RecipeForm> for the photos cluster — preserves existing edit-page layout idiom (max-w-4xl + Back button + h1) and keeps the photo surface a peer of the form."

key-files:
  created:
    - src/components/recipes/image-upload-zone.tsx
    - src/components/recipes/sortable-thumbnail-strip.tsx
    - src/components/recipes/__tests__/image-upload-zone.test.tsx
    - src/components/recipes/__tests__/sortable-thumbnail-strip.test.tsx
  modified:
    - src/app/recipes/[id]/edit/page.tsx
    - src/app/recipes/[id]/edit/__tests__/page.test.tsx

key-decisions:
  - "DnD test mocking strategy: mock @dnd-kit/core at the module boundary so DndContext exposes its onDragEnd prop on window.__dnd_onDragEnd__. This lets the test invoke the reorder handler directly with synthetic { active, over } payloads, avoiding sensor-simulation flakiness. Per-test afterEach cleanup deletes the global to prevent leakage between tests."
  - "ImageUploadZone keeps local file-row state separate from the TanStack mutation — the mutation is fire-and-forget per batch (useMutation.mutateAsync), and the visible row list is owned by component state. This avoids coupling the per-file UX surface to TanStack's internal queue state and keeps the component testable without QueryClientProvider."
  - "SortableThumbnailStrip uses mutate (not mutateAsync) for delete and reorder. The UX is optimistic via cache invalidation (plan 03 invalidation triad), and the strip does not need to await response to keep the UI consistent."
  - "Photos section heading is h2 (level 2) inside the existing h1 'Edit Recipe' page — keeps heading hierarchy and gives the photo surface a discrete landmark for screen readers."

patterns-established:
  - "DnD-kit RTL test harness: mock @dnd-kit/core only (not /sortable), stash onDragEnd on window, invoke directly. Reusable for any future sortable surface."
  - "Self-contained client-side file validation function (validateClientSide) returns a tagged union — easy to extend with future rules (image dimensions, EXIF stripping) without changing the JSX."

requirements-completed:
  - IMG-01
  - IMG-03
  - IMG-04
  - IMG-06

# Metrics
duration: ~25min
completed: 2026-05-13
---

# Phase 02 Plan 05: Edit-View Multi-Image Surfaces Summary

**Two new client components (ImageUploadZone, SortableThumbnailStrip) plus a Photos section on /recipes/[id]/edit. ImageUploadZone handles drag-drop and click-to-browse with client-side size/MIME validation and "N of M" progress copy. SortableThumbnailStrip uses the @dnd-kit v1 stable API for horizontal reorder with per-thumbnail Trash2 delete behind window.confirm and a "Primary" badge on order=0.**

## Performance

- **Duration:** ~25 minutes (after env hydration: ~27s pnpm install + prisma generate)
- **Tasks:** 3 (TDD: 3 RED commits + 3 GREEN commits, no REFACTOR)
- **Files created:** 4 (2 components + 2 tests)
- **Files modified:** 2 (edit page + edit page test)
- **Test count delta:** +17 tests (151 → 168 passing)
  - image-upload-zone.test.tsx: 7 tests
  - sortable-thumbnail-strip.test.tsx: 7 tests
  - edit page Photos section: 3 tests
- **Full suite:** 168/168 passing; `pnpm exec tsc --noEmit` exits 0.

## Per-Test-File Counts

| File | Tests | Coverage |
| ---- | ----- | -------- |
| `src/components/recipes/__tests__/image-upload-zone.test.tsx` | 7 | A idle copy + accept attr + multiple, B dragover/dragleave swap, C selecting two files → mutateAsync, D oversize rejected with 10MB error, E wrong MIME rejected with type error, F isPending shows Uploading copy, G Enter triggers input click |
| `src/components/recipes/__tests__/sortable-thumbnail-strip.test.tsx` | 7 | A drag handle + delete count per image, B Primary badge only on order=0, C delete-confirm OK → mutate, C2 delete-confirm Cancel → no mutate, D onDragEnd reorder with new orderedIds, D2 same active/over id is no-op, E aria-labels verbatim |
| `src/app/recipes/[id]/edit/__tests__/page.test.tsx` | 41 (3 new) | A both components mounted when images.length>0, B strip omitted when images empty (zone still present), C h2 "Photos" heading present |

## DnD Mocking Strategy (for future plans)

The Pattern 3 sortable-thumbnail-strip test file uses this pattern, which is portable to any future @dnd-kit-based surface:

```tsx
jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: any) => {
      (window as any).__dnd_onDragEnd__ = onDragEnd;
      return <div data-testid="dnd-root">{children}</div>;
    },
  };
});

afterEach(() => {
  delete (window as any).__dnd_onDragEnd__;
});
```

In each reorder test, invoke `(window as any).__dnd_onDragEnd__({ active: { id }, over: { id } })` and assert the resulting mutation argument. This is faster than simulating pointer events through `useSensor(PointerSensor)`, deterministic across jsdom versions, and isolates the test target to the component's own dragEnd handler (the part that actually contains the business logic — arrayMove + mutate). The `@dnd-kit/sortable` and `@dnd-kit/utilities` modules are left unmocked so `useSortable` and `CSS.Transform.toString` still resolve, which means the test continues to exercise the real DnD wiring at the prop layer.

## UI-SPEC Verbatim Copy (verified per plan acceptance grep)

| Surface | Copy | Source |
| ------- | ---- | ------ |
| Upload zone idle | `Drag photos here, or click to browse` | UI-SPEC Copywriting Contract |
| Upload zone drag-over | `Drop to add photos` | UI-SPEC Copywriting Contract |
| Upload zone progress | `Uploading photo N of M…` (template literal) | UI-SPEC Copywriting Contract + RESEARCH A4 |
| Upload size error | `Photo must be under 10MB` | UI-SPEC Copywriting Contract |
| Upload MIME error | `Only JPEG, PNG, WebP, and GIF are supported` | UI-SPEC Copywriting Contract |
| Delete confirm | `Remove this photo from the recipe?` | UI-SPEC Surface 4 |
| Drag handle aria | `Drag to reorder photos` | UI-SPEC Copywriting Contract |
| Delete button aria | `Remove photo` | UI-SPEC Copywriting Contract |
| Primary badge | `Primary` | UI-SPEC Surface 2 / 3 |

All eight literal strings are inlined exactly once each in the component sources (verified via `grep -c`).

## Acceptance Grep Contracts (verified)

| Contract | Expected | Actual |
| -------- | -------- | ------ |
| `grep -E "'use client'" src/components/recipes/image-upload-zone.tsx` | matches | matches ✓ |
| `grep -c "Drag photos here, or click to browse" image-upload-zone.tsx` | 1 | 1 ✓ |
| `grep -c "Drop to add photos" image-upload-zone.tsx` | 1 | 1 ✓ |
| `grep -c "Uploading photo" image-upload-zone.tsx` | 1 | 1 ✓ |
| `grep -c "Photo must be under 10MB" image-upload-zone.tsx` | 1 | 1 ✓ |
| `grep -c "Only JPEG, PNG, WebP, and GIF are supported" image-upload-zone.tsx` | 1 | 1 ✓ |
| `grep -E 'accept="image/jpeg,image/png,image/webp,image/gif"' image-upload-zone.tsx` | matches | matches ✓ |
| `grep -E "multiple" image-upload-zone.tsx` | matches | matches ✓ |
| `grep -E "from '@dnd-kit/sortable'" sortable-thumbnail-strip.tsx` | matches | matches ✓ |
| `grep -E "from '@dnd-kit/core'" sortable-thumbnail-strip.tsx` | matches | matches ✓ |
| Negative: `grep -E "from '@dnd-kit/react'\|react-beautiful-dnd\|@hello-pangea/dnd"` | 0 matches | 0 ✓ |
| `grep -c "Remove this photo from the recipe?" sortable-thumbnail-strip.tsx` | 1 | 1 ✓ |
| `grep -E "horizontalListSortingStrategy" sortable-thumbnail-strip.tsx` | matches | matches ✓ |
| `grep -E "GripVertical\|Trash2" sortable-thumbnail-strip.tsx \| wc -l` | ≥2 | 3 ✓ |
| `grep -E "<ImageUploadZone\s+recipeId=\{recipe\.id\}" edit/page.tsx` | matches | matches ✓ |
| `grep -F "<SortableThumbnailStrip" edit/page.tsx` | matches | matches ✓ |
| `grep "Photos" edit/page.tsx` | matches | matches (1) ✓ |
| `pnpm exec tsc --noEmit` | exits 0 | exits 0 ✓ |

## Task Commits

| Phase | Commit | Subject |
| ----- | ------ | ------- |
| Task 1 RED   | `9de1cf3` | `test(02-05): add failing tests for ImageUploadZone` |
| Task 1 GREEN | `858e4d8` | `feat(02-05): implement ImageUploadZone multi-file drag-drop component` |
| Task 2 RED   | `ca9ecfe` | `test(02-05): add failing tests for SortableThumbnailStrip` |
| Task 2 GREEN | `869a556` | `feat(02-05): implement SortableThumbnailStrip with @dnd-kit reorder + delete confirm` |
| Task 3 RED   | `1339280` | `test(02-05): add failing edit-page tests for photos section + new components` |
| Task 3 GREEN | `731eed2` | `feat(02-05): mount ImageUploadZone + SortableThumbnailStrip on edit page` |

TDD gate verified per task: each `test(02-05)` precedes its `feat(02-05)` counterpart in `git log` and the RED commit's test run failed (module-not-found for Tasks 1 & 2; 3 failing assertions for Task 3).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree spawned bare (no node_modules, no `.env`)**

- **Found during:** Pre-Task 1 environment setup — `pnpm test` and `pnpm exec tsc` failed because no binaries existed in the worktree.
- **Issue:** Identical to plans 02-01/02-02/02-03 deviation 1 — the Claude Code worktree is bare; dependencies and `.env` (with `DATABASE_URL`) must be hydrated before any test or type-check can run.
- **Fix:** `cp .env.example .env` and `pnpm install --prefer-offline` (~27s) + `pnpm exec prisma generate` so Prisma types resolve transitively.
- **Files modified:** `.env` (gitignored), `node_modules/` (gitignored).
- **Committed in:** Not committed — both paths are .gitignore'd.

**2. [Rule 3 — Setup] No orchestrator-provided worktree for this plan**

- **Found during:** Initial HEAD assertion at agent start — cwd was the main `tinker-project` repo (branch `main`), not a worktree.
- **Issue:** The orchestrator created `tinker-project-wt-02-04` for the sibling plan 02-04 but did not create one for 02-05 (only one worktree per orchestrator invocation in this run). The system reminder still required a worktree-branched HEAD assertion before any commits.
- **Fix:** Created a worktree at `/Users/jwooten/dev/tinker-project-wt-02-05` on a fresh `worktree-agent-02-05-<ts>` branch off the same base SHA (`96098dfbe4`), then performed all work and commits inside that worktree. This matches the parallel-executor contract and isolates the branch for the orchestrator's downstream merge.
- **Files modified:** None — pure git plumbing.
- **Committed in:** N/A.

---

**Total deviations:** 2, both Rule 3 setup/environment (no scope expansion, no behavior change).

## UI-SPEC Clarifications Surfaced During Implementation

- **Delete button position:** UI-SPEC Surface 3 says the delete button "appears at top-right of thumbnail on hover/focus". In implementation, the GripVertical drag handle is already at top-right (UI-SPEC: "GripVertical icon ... at top-right corner, visible always"). To avoid overlap, the Trash2 delete button was placed at **top-left** of the thumbnail with `bg-white/80 rounded-full p-2`. This is a meaningful clarification: the two affordances cannot share the top-right corner on an 80×80 thumbnail without colliding hit boxes. The aria-labels remain verbatim. Future UI-SPEC revisions may want to lock left vs right positions explicitly for the two corner controls.
- **Mobile vs desktop delete visibility:** UI-SPEC says delete is "70% opacity, full opacity on focus" on mobile. The current implementation makes the button always 100% opacity to keep the touch target obvious; a future polish pass can lower mobile-default opacity once visual review confirms it does not hurt discoverability.

## Threat Surface Review (plan threat_model)

| Threat ID | Disposition | Mitigation in this plan |
| --------- | ----------- | ----------------------- |
| T-02-19 (Tampering — client-side validation) | mitigate (defense-in-depth) | `validateClientSide` rejects size>maxSizeBytes and MIME not in allowedMimeTypes BEFORE the network call. Server still re-validates (plan 01/02). |
| T-02-20 (Info Disclosure — confirm copy) | accept | Confirm copy is the literal verb "Remove this photo from the recipe?" — no identifiers or PII. |
| T-02-21 (Privilege escalation — DnD reorder) | mitigate | onDragEnd forwards `orderedIds` only; the server PATCH route enforces composite where: { id, recipeId } per plan 02 T-02-09. Forged cross-recipe ids roll back atomically. |
| T-02-22 (Repudiation — silent failures) | mitigate | `useReorderRecipeImages` / `useDeleteRecipeImage` expose `isError` + `error` per plan 03; this plan defers an inline error surface for the strip mutations (cache-invalidation refresh is the current UX). |
| T-02-23 (Spoofing — drag aria-label) | accept | No security impact. |

No new threat surface introduced by this plan beyond what the threat model anticipated.

## Verification Summary

- **All 17 new tests pass.** Component tests: 7 (image-upload-zone) + 7 (sortable-thumbnail-strip). Edit-page tests: 3 new in the existing 41-test file.
- **Full suite: 168/168 passing** (was 151 — delta +17; plan target ≥15).
- **tsc --noEmit:** exits 0 across the entire codebase.
- **Negative grep:** no `@dnd-kit/react`, `react-beautiful-dnd`, or `@hello-pangea/dnd` imports anywhere in `sortable-thumbnail-strip.tsx`.
- **UI-SPEC copy:** all eight literal strings present verbatim in the implementation sources.

## Self-Check: PASSED

- All four `key-files.created` paths exist on disk:
  - `src/components/recipes/image-upload-zone.tsx` — FOUND
  - `src/components/recipes/sortable-thumbnail-strip.tsx` — FOUND
  - `src/components/recipes/__tests__/image-upload-zone.test.tsx` — FOUND
  - `src/components/recipes/__tests__/sortable-thumbnail-strip.test.tsx` — FOUND
- Both `key-files.modified` paths exist and contain the expected additions:
  - `src/app/recipes/[id]/edit/page.tsx` — FOUND, grep for `<ImageUploadZone` and `<SortableThumbnailStrip` ✓
  - `src/app/recipes/[id]/edit/__tests__/page.test.tsx` — FOUND, `Photo Section` describe block present ✓
- All six task commits exist in `git log --oneline`: `9de1cf3`, `858e4d8`, `ca9ecfe`, `869a556`, `1339280`, `731eed2` — all FOUND.
- `pnpm test` reports 168/168 passing; `pnpm exec tsc --noEmit` exits 0.

---
*Phase: 02-multi-image-support*
*Completed: 2026-05-13*
