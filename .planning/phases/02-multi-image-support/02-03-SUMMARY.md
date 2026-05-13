---
phase: 02-multi-image-support
plan: 03
subsystem: client-data-layer
tags:
  - tanstack-query
  - hooks
  - client
  - fetch
  - typescript

# Dependency graph
requires:
  - phase: 02-multi-image-support
    plan: 02
    provides: POST/GET /api/recipes/[id]/images, DELETE /api/recipes/[id]/images/[imageId], PATCH /api/recipes/[id]/images/reorder, primaryImageId on list responses, images[] on detail responses
  - phase: 02-multi-image-support
    plan: 01
    provides: recipe_images table + StorageAdapter extensions consumed by the routes
provides:
  - useRecipeImages(recipeId) query hook → GET /api/recipes/[id]/images
  - useUploadRecipeImages mutation → POST /api/recipes/[id]/images (multipart, N `images` parts)
  - useDeleteRecipeImage mutation → DELETE /api/recipes/[id]/images/[imageId]
  - useReorderRecipeImages mutation → PATCH /api/recipes/[id]/images/reorder
  - recipeImageKeys query-key factory (`['recipes','images',recipeId] as const`)
  - RecipeImageMetadata interface
  - Recipe interface extended with optional `images` array and `primaryImageId` field
affects:
  - 02-04 (image-gallery + image-upload-zone — call these hooks instead of bare fetch)
  - 02-05 (sortable-thumbnail-strip — calls useReorderRecipeImages / useDeleteRecipeImage)
  - 02-06 (recipe list/detail integration — reads `images` / `primaryImageId` off useRecipes / useRecipe)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TanStack Query key namespace per resource — recipeImageKeys.all(recipeId) as a const-asserted tuple matching recipeKeys factory style"
    - "Cross-resource invalidation on mutation: image mutations bust recipeImageKeys.all(id) + recipeKeys.detail(id) + recipeKeys.lists() so detail (images metadata) and list (primaryImageId) views stay fresh"
    - "FormData multi-part upload: loop `formData.append('images', file)` per file; do NOT set Content-Type so fetch sets the multipart boundary"
    - "Verb-specific Error messages on !response.ok so the UI can surface action-tailored failure copy"
    - "// prettier-ignore on each invalidate call to keep grep contracts greppable in one line (mirrors the 02-02 deviation pattern)"

key-files:
  created:
    - src/lib/queries/recipe-image-queries.ts
    - src/lib/queries/__tests__/recipe-image-queries.test.ts
  modified:
    - src/lib/queries/recipe-queries.ts

key-decisions:
  - "Recipe interface change is additive only: legacy `imageUrl?: string` is kept (RESEARCH A1) alongside new `images?: Array<{...}>` and `primaryImageId?: string | null` fields. No removals — UI fallbacks for the single-image era continue to compile."
  - "Each mutation invalidates the same three-key set (recipeImageKeys.all + recipeKeys.detail + recipeKeys.lists). This is intentional: even a reorder changes which image is `primary` (order=0), so the list view must re-fetch primaryImageId."
  - "uploadRecipeImages does NOT set headers — fetch sets `multipart/form-data; boundary=...` only when headers are absent and body is FormData. Setting Content-Type manually breaks boundary handshake (already a documented Pitfall in RESEARCH.md)."
  - "Hook test harness uses renderHook + QueryClientProvider with retry: false to avoid retry-induced false negatives on the 500 Test F path; gcTime: 0 so each test starts with a clean cache."
  - "// prettier-ignore around invalidateQueries calls keeps the plan grep contract greppable (>=9 invalidate calls visible on a single line). Same workaround the 02-02 SUMMARY documented for `formData.getAll('images')`."

patterns-established:
  - "Multi-mutation cache-invalidation triad — every domain mutation that affects (i) sub-list, (ii) parent detail, (iii) parent list-view projection invalidates all three keys"
  - "Test harness pattern for TanStack Query hooks: jest fetch mock + freshClient() + jest.spyOn(qc, 'invalidateQueries') for behavioral verification without snapshot-coupling to library internals"

requirements-completed:
  - IMG-01
  - IMG-02
  - IMG-03
  - IMG-04
  - IMG-07

# Metrics
duration: ~15min
completed: 2026-05-13
---

# Phase 02 Plan 03: Client Data Layer (TanStack Hooks) Summary

**Four TanStack Query hooks (one query, three mutations) + a key-namespace factory in a new `recipe-image-queries.ts` module; Recipe interface extended additively with optional `images` and `primaryImageId` fields. Hooks own fetch URL, method, body, and cache invalidation — UI components in plans 04/05/06 stay declarative.**

## Performance

- **Duration:** ~15 minutes (after env hydration; ~30s install + ~25s prisma generate)
- **Tasks:** 1 (TDD: 1 RED commit + 1 GREEN commit)
- **Files created:** 2 (`recipe-image-queries.ts`, `__tests__/recipe-image-queries.test.ts`)
- **Files modified:** 1 (`recipe-queries.ts` — additive interface extension)
- **Test count delta:** +11 tests (140 → 151 passing). Plan target ≥6 behavioral tests; actual 11.

## Accomplishments

### New Module: `src/lib/queries/recipe-image-queries.ts`

Exports (verbatim):

```typescript
export interface RecipeImageMetadata {
  id: string;
  order: number;
  fileName: string;
  mimeType: string;
}

export const recipeImageKeys = {
  all: (recipeId: string) => ['recipes', 'images', recipeId] as const,
};

export function useRecipeImages(recipeId: string);          // UseQueryResult<{ images: RecipeImageMetadata[] }>
export function useUploadRecipeImages();                    // UseMutationResult<{ imageIds; failed }, Error, { recipeId; files }>
export function useDeleteRecipeImage();                     // UseMutationResult<{ ok: true }, Error, { recipeId; imageId }>
export function useReorderRecipeImages();                   // UseMutationResult<{ ok: true }, Error, { recipeId; orderedIds }>
```

Five exports total — `recipeImageKeys` + four hooks. Plan acceptance count == 5 ✓.

### Modified: `src/lib/queries/recipe-queries.ts`

`Recipe` interface extended after the existing `imageUrl?: string` line:

```typescript
images?: Array<{
  id: string;
  order: number;
  fileName: string;
  mimeType: string;
}>;
primaryImageId?: string | null;
```

Nothing else touched. Existing hooks (`useRecipes`, `useRecipe`, `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`, `useUploadRecipeImage`, `useDeleteRecipeImage` — note: the older single-image hooks live in this same file under different names and are left untouched for legacy callers).

## Fetch Call Signatures (consumer reference for plans 04/05/06)

| Hook | URL | Method | Headers | Body |
| ---- | --- | ------ | ------- | ---- |
| `useRecipeImages(recipeId)` | `/api/recipes/${recipeId}/images` | GET (default) | — | — |
| `useUploadRecipeImages` | `/api/recipes/${recipeId}/images` | POST | (none — fetch sets multipart boundary) | FormData with one `images` part per file |
| `useDeleteRecipeImage` | `/api/recipes/${recipeId}/images/${imageId}` | DELETE | — | — |
| `useReorderRecipeImages` | `/api/recipes/${recipeId}/images/reorder` | PATCH | `Content-Type: application/json` | `JSON.stringify({ orderedIds })` |

On `!response.ok` each helper throws an Error with verb-tailored copy:

| Helper | Error.message |
| ------ | ------------- |
| fetchRecipeImages | `'Failed to fetch images'` |
| uploadRecipeImages | `'Failed to upload images'` |
| deleteRecipeImage | `'Failed to delete image'` |
| reorderRecipeImages | `'Failed to reorder images'` |

Each successful mutation triggers exactly three `queryClient.invalidateQueries` calls:

```typescript
queryClient.invalidateQueries({ queryKey: recipeImageKeys.all(recipeId) });
queryClient.invalidateQueries({ queryKey: recipeKeys.detail(recipeId) });
queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
```

## Tests

**11 tests** in `__tests__/recipe-image-queries.test.ts`:

| Test | What it asserts |
| ---- | --------------- |
| A — query URL | `useRecipeImages('r1')` → fetch called with `'/api/recipes/r1/images'`, no method override, returns `{ images: [...] }` |
| B — upload body | `useUploadRecipeImages.mutateAsync({recipeId,files:[a,b]})` → POST to `/api/recipes/r1/images`, FormData with 2 `images` parts, no headers set |
| C — delete URL | `useDeleteRecipeImage.mutateAsync({recipeId:'r1',imageId:'i9'})` → DELETE `/api/recipes/r1/images/i9` |
| D — reorder body | `useReorderRecipeImages.mutateAsync(...)` → PATCH with `Content-Type: application/json` and `JSON.stringify({orderedIds})` body |
| E.1 — upload invalidation | Spy on `qc.invalidateQueries` shows 3 calls with the three documented keys |
| E.2 — delete invalidation | Same — 3 calls with the three keys |
| E.3 — reorder invalidation | Same — 3 calls with the three keys |
| F.1 — upload 500 | `mutateAsync` rejects with `/Failed to upload images/` |
| F.2 — delete 500 | `mutateAsync` rejects with `/Failed to delete image/` |
| F.3 — reorder 500 | `mutateAsync` rejects with `/Failed to reorder images/` |
| Key factory | `recipeImageKeys.all('r1')` deep-equals `['recipes','images','r1']` |

Full suite: **151/151 passing** (was 140 at plan start). `pnpm exec tsc --noEmit` exits 0.

## Task Commits

| Phase | Commit | Subject |
| ----- | ------ | ------- |
| RED   | `2ce9118` | `test(02-03): add failing tests for recipe-image TanStack hooks` |
| GREEN | `0d440d8` | `feat(02-03): implement recipe-image TanStack hooks + extend Recipe interface` |

TDD gate verified: `test(02-03)` precedes `feat(02-03)` in git log.

## Acceptance Grep Contracts

All plan acceptance contracts verified after the GREEN commit:

| Contract | Expected | Actual |
| -------- | -------- | ------ |
| `grep -cE "export\s+(function\|const)\s+(useRecipeImages\|useUploadRecipeImages\|useDeleteRecipeImage\|useReorderRecipeImages\|recipeImageKeys)" src/lib/queries/recipe-image-queries.ts` | 5 | 5 ✓ |
| `grep -E "formData\.append\('images'" src/lib/queries/recipe-image-queries.ts` | match | match ✓ |
| `grep -E "method:\s*'PATCH'" src/lib/queries/recipe-image-queries.ts` | match | match ✓ |
| `grep -cE "invalidateQueries.*recipeImageKeys\.all\|invalidateQueries.*recipeKeys\.detail\|invalidateQueries.*recipeKeys\.lists" src/lib/queries/recipe-image-queries.ts` | ≥9 | 9 ✓ |
| `grep -E "primaryImageId" src/lib/queries/recipe-queries.ts` | match | match ✓ |
| `grep -E "images\?:\s*Array" src/lib/queries/recipe-queries.ts` | match | match ✓ |
| `grep -cE "from\s+'@/lib/(prisma\|storage)" src/lib/queries/recipe-image-queries.ts` | 0 (no server imports) | 0 ✓ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree spawned bare (no node_modules, no `.env`)**

- **Found during:** Pre-Task 1 environment setup (`pnpm exec tsc` / `pnpm test` failed because no binaries existed).
- **Issue:** Same as plans 02-01 and 02-02 deviation 1 — Claude Code worktree is bare; dependencies and `.env` (with `DATABASE_URL`) must be hydrated before any test or type-check can run.
- **Fix:** `cp .env.example .env` and `pnpm install --prefer-offline` (~31s) + `pnpm exec prisma generate` so the Prisma client types in `recipe-queries.ts` resolve.
- **Files modified:** `.env` (gitignored), `node_modules/` (gitignored).
- **Committed in:** Not committed — both paths are .gitignore'd.

**2. [Rule 1 — Bug] Prettier auto-wrap broke the `invalidateQueries` grep contract**

- **Found during:** Task 1 acceptance verification — the plan requires `grep -cE "invalidateQueries.*recipeImageKeys\.all|invalidateQueries.*recipeKeys\.detail|invalidateQueries.*recipeKeys\.lists"` to return ≥9, but my initial Prettier-default output split each `invalidateQueries({ queryKey: ... })` across three lines, so only the inline `.lists()` calls (3) matched. Same root cause documented in 02-02 SUMMARY deviation 3.
- **Fix:** Added `// prettier-ignore` immediately above the two longer-form invalidate calls in each of the three `onSuccess` blocks so Prettier preserves the single-line form. Six `// prettier-ignore` lines total; three inline `.lists()` calls need none. Acceptance grep now returns 9. Tests still pass; tsc still clean.
- **Files modified:** `src/lib/queries/recipe-image-queries.ts`.
- **Committed in:** `0d440d8` (GREEN commit).

---

**Total deviations:** 2 auto-fixed (1 blocking env setup that repeats 02-01/02-02, 1 Prettier-grep contract bug repeating the 02-02 pattern). None expanded plan scope.

## Issues Encountered

- **Jest CLI flag.** Plan's verify command uses singular `--testPathPattern`; the local Jest 30.2.0 emits a deprecation warning and remaps it. Used plural `--testPathPatterns` throughout to silence the warning.

## TDD Gate Compliance

- **RED gate present:** `2ce9118` — `test(02-03): add failing tests for recipe-image TanStack hooks`. Confirmed failing-to-load before implementation existed (`Cannot find module '../recipe-image-queries'`).
- **GREEN gate present:** `0d440d8` — `feat(02-03): implement recipe-image TanStack hooks + extend Recipe interface`. Immediately follows the RED commit; all 11 tests pass.
- **REFACTOR:** Not used. The `// prettier-ignore` adjustment was rolled into the GREEN commit as a contract-correctness fix, not a behavior change.

## Threat Flags

None — plan threat register entries T-02-13/14/15 are all addressed by code that lives in this module:

- **T-02-13 (Information Disclosure / cache):** accept — single-user app, in-memory cache, no PII in keys.
- **T-02-14 (Tampering / id interpolation):** mitigate — server routes (plan 02 T-02-08/09) enforce ownership; client interpolation can't bypass.
- **T-02-15 (Repudiation / swallowed mutation errors):** mitigate — every helper throws a verb-specific Error on `!response.ok` (verified by Tests F.1-F.3); callers receive `error` in mutation result.

No new security-relevant surface introduced.

## Verification Summary

- **All 11 new tests pass** (1 query + 3 mutations × URL/method/body + 3 invalidation + 3 error + 1 key-factory).
- **Full suite: 151/151 passing** (was 140 — delta +11; ≥6 plan target).
- **tsc --noEmit:** exits 0 (entire codebase, including `src/lib/queries/**`).
- **Negative grep:** No `'@/lib/prisma'` or `'@/lib/storage'` imports anywhere in `recipe-image-queries.ts` — client-only purity preserved.
- **Recipe interface change additive:** legacy `imageUrl?: string` still present.

## Self-Check: PASSED

- Both `key-files.created` paths exist on disk:
  - `src/lib/queries/recipe-image-queries.ts` — FOUND
  - `src/lib/queries/__tests__/recipe-image-queries.test.ts` — FOUND
- `key-files.modified` path exists and contains the new fields:
  - `src/lib/queries/recipe-queries.ts` — FOUND, `primaryImageId` and `images?: Array` both grep ✓
- Both commits exist in `git log --oneline`:
  - `2ce9118` (RED) — FOUND
  - `0d440d8` (GREEN) — FOUND
- `pnpm test` reports 151/151 passing; `pnpm exec tsc --noEmit` exits 0.

---
*Phase: 02-multi-image-support*
*Completed: 2026-05-13*
