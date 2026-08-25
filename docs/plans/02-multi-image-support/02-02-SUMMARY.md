---
phase: 02-multi-image-support
plan: 02
subsystem: api
tags:
  - api
  - next-route-handler
  - prisma
  - multipart
  - zod

# Dependency graph
requires:
  - phase: 02-multi-image-support
    plan: 01
    provides: StorageAdapter extensions (saveRecipeImage, getRecipeImage, deleteRecipeImage, listRecipeImages, reorderRecipeImages), recipe_images table
provides:
  - POST /api/recipes/[id]/images (multi-file upload, multipart form-data)
  - GET /api/recipes/[id]/images (metadata list sorted ascending by order)
  - GET /api/recipes/[id]/images/[imageId] (binary body with cache headers, 404 on cross-recipe)
  - DELETE /api/recipes/[id]/images/[imageId] (200 ok; P2025 -> 404)
  - PATCH /api/recipes/[id]/images/reorder (zod-validated; delegates to adapter)
  - GET /api/recipes (list) now projects primaryImageId per recipe and drops raw images array
  - GET /api/recipes/[id] (detail) now returns images metadata array sorted by order, no bytes
affects:
  - 02-03 (TanStack hooks — will call these endpoints)
  - 02-04 (UI components — render against returned metadata)
  - 02-05 (recipe list/detail integration — depends on primaryImageId and detail images array)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js 16 route handler with awaited params Promise"
    - "Multi-file multipart upload via formData.getAll('images') filtered by File type guard"
    - "Per-file validation with per-file failed[] entries (no partial-batch DB writes)"
    - "Ownership guard pattern: prisma.recipeImage.findFirst({ where: { id, recipeId } }) -> 404 not 403"
    - "Prisma P2025 -> 404 mapping on cross-recipe DELETE via adapter composite where"
    - "Zod parse inside try/catch with z.ZodError -> 400 details branch"
    - "List route projects order=0 image to primaryImageId via destructure-and-drop"
    - "Detail route adds images include sorted by order, metadata-only select (no data: true)"

key-files:
  created:
    - src/app/api/recipes/[id]/images/route.ts
    - src/app/api/recipes/[id]/images/__tests__/route.test.ts
    - src/app/api/recipes/[id]/images/[imageId]/route.ts
    - src/app/api/recipes/[id]/images/[imageId]/__tests__/route.test.ts
    - src/app/api/recipes/[id]/images/reorder/route.ts
    - src/app/api/recipes/[id]/images/reorder/__tests__/route.test.ts
    - src/app/api/recipes/__tests__/route.test.ts
    - src/app/api/recipes/[id]/__tests__/route.test.ts
  modified:
    - src/app/api/recipes/route.ts
    - src/app/api/recipes/[id]/route.ts
    - jest.setup.js

key-decisions:
  - "Use @jest-environment node per-file annotation for API route tests (Next.js Request/FormData need a node-like global). jest.setup.js guarded with typeof window check so it loads safely under both environments."
  - "Multi-file POST loops sequentially (not Promise.all) so per-file validateImage results stream into imageIds/failed in input order; sequential is also kinder on a single-user dev setup."
  - "Cross-recipe imageId returns 404 not 403 (T-02-08) — does not leak imageId existence."
  - "DELETE handler does NOT call findFirst separately — the adapter's composite where { id, recipeId } already enforces ownership and yields P2025 on mismatch."
  - "List route serialization uses destructure-and-spread { images: _images, ...rest } to drop the raw images array; primaryImageId is appended after rest spread."
  - "T-02-12 concurrency race is left intentionally unmitigated and formalized by a test named 'T-02-12: concurrent uploads ...' (greppable trace)."

patterns-established:
  - "Per-file failure isolation: validateImage gate before saveRecipeImage; failed files do NOT advance nextOrder."
  - "Composite-where ownership guard for binary GET runs BEFORE pulling bytes."
  - "Module-scope zod schema for PATCH body validation, parsed inside try/catch with z.ZodError -> 400 branch."

requirements-completed:
  - IMG-01
  - IMG-02
  - IMG-03
  - IMG-04
  - IMG-06
  - IMG-07

# Metrics
duration: ~25min
completed: 2026-05-13
---

# Phase 02 Plan 02: Multi-Image API Routes Summary

**Three new route files for upload/list, binary/delete, and reorder; recipes list and detail routes extended to project primaryImageId and an images metadata array respectively — all delegating to the storageAdapter extensions from plan 02-01.**

## Performance

- **Duration:** ~25 minutes
- **Tasks:** 5 (each with paired RED + GREEN commits per TDD gate)
- **Files created:** 8 (3 route files, 5 test files)
- **Files modified:** 3 (recipes list route, recipe detail route, jest.setup.js for env compat)
- **Test count delta:** +21 tests (119 → 140 passing). Plan target ≥21; actual 21.

## Accomplishments

### New Routes

1. **POST /api/recipes/[id]/images** — Accepts multipart form-data with one or more `images` parts. Reads `prisma.recipeImage.aggregate` to compute `nextOrder = (_max.order ?? -1) + 1`, then for each file runs `validateImage` and (if valid) `saveRecipeImage(id, buffer, metadata, nextOrder++)`. Returns 201 with `{ imageIds: string[]; failed: Array<{ fileName, error }> }`. Empty `images` body → 400 `{ error: 'No image files provided' }`. Internal errors → 500 with the canonical envelope.
2. **GET /api/recipes/[id]/images** — Delegates to `storageAdapter.listRecipeImages`. Returns `{ images: [{ id, order, fileName, mimeType }] }` sorted ascending by order. No bytes.
3. **GET /api/recipes/[id]/images/[imageId]** — Ownership guard via `prisma.recipeImage.findFirst({ where: { id: imageId, recipeId: id } })` runs BEFORE pulling bytes (T-02-08). On hit, calls `storageAdapter.getRecipeImage(imageId)` and returns a `NextResponse(Uint8Array, { headers: { Content-Type, Content-Length, Cache-Control: public, max-age=3600 } })`. Cross-recipe or missing → 404 `{ error: 'Image not found' }` (never 403, no existence leak).
4. **DELETE /api/recipes/[id]/images/[imageId]** — Delegates to `storageAdapter.deleteRecipeImage(imageId, id)`. Catch branches Prisma `P2025` → 404; unrelated errors → 500 `{ error: 'Failed to delete image' }`. The adapter's transaction renormalizes remaining orders to 0..n-1.
5. **PATCH /api/recipes/[id]/images/reorder** — Module-scope `ReorderSchema = z.object({ orderedIds: z.array(z.string().min(1)).min(1) })`. On parse success, delegates to `storageAdapter.reorderRecipeImages`. `z.ZodError` → 400 with `details: error.errors`; else 500.

### Extended Routes

6. **GET /api/recipes (list)** — Added `images: { where: { order: 0 }, take: 1, select: { id: true } }` to the prisma include. Serializer destructures `{ images: _images, ...rest } = recipe` and appends `primaryImageId = _images?.[0]?.id ?? null` — the raw `images` key is dropped from the response.
7. **GET /api/recipes/[id] (detail)** — Added `images: { orderBy: { order: 'asc' }, select: { id: true, order: true, fileName: true, mimeType: true } }` to the prisma include. The serializer already spreads `recipe`, so the metadata array passes through unchanged. No bytes (no `data: true` anywhere in the select).

### Tests

- **21 new tests**, all paired into RED → GREEN commits per task:
  - Task 1: 7 tests (A multi-file happy, B empty 400, C partial failure, D server 500, E GET list, F order offset, G T-02-12 concurrency)
  - Task 2: 6 tests (binary A happy/B cross-recipe-404/C missing-404, DELETE D happy/E P2025-404/F 500)
  - Task 3: 3 tests (reorder A happy / B zod 400 / C server 500)
  - Task 4: 3 tests (D1 primaryImageId set, D2 null, D3 include shape + negative data grep)
  - Task 5: 2 tests (E1 images array, E2 include shape + negative data grep)
- Full suite: **140/140 passing** (was 119 at plan start).

## Task Commits

Each task follows the TDD RED → GREEN gate sequence:

| Task | RED commit | GREEN commit |
| ---- | ---------- | ------------ |
| 1 — POST + GET list           | `3c76edf` | `cf6652f` |
| 2 — Binary GET + DELETE       | `cee9301` | `600909e` |
| 3 — PATCH /reorder            | `029b5bc` | `3fe8b38` |
| 4 — List route primaryImageId | `7ef5c22` | `f68dd3a` |
| 5 — Detail route images array | `0358109` | `28267cf` |

TDD gates verified: every task has a `test(02-02)` commit immediately before its `feat(02-02)` commit.

## Response Shape Examples

```jsonc
// POST /api/recipes/r1/images (multipart with 2 files, both valid)
// 201
{ "imageIds": ["img-abc", "img-def"], "failed": [] }

// POST /api/recipes/r1/images (1 valid + 1 oversized)
// 201
{ "imageIds": ["img-abc"], "failed": [{ "fileName": "big.jpg", "error": "File size exceeds 10MB" }] }

// POST /api/recipes/r1/images (no images part)
// 400
{ "error": "No image files provided" }

// GET /api/recipes/r1/images
// 200
{ "images": [
  { "id": "img-abc", "order": 0, "fileName": "front.jpg", "mimeType": "image/jpeg" },
  { "id": "img-def", "order": 1, "fileName": "side.png",  "mimeType": "image/png" }
] }

// GET /api/recipes/r1/images/img-abc
// 200 — raw bytes; headers:
//   Content-Type: image/jpeg
//   Content-Length: 12345
//   Cache-Control: public, max-age=3600

// DELETE /api/recipes/r1/images/img-abc
// 200
{ "ok": true }
// 404 (cross-recipe or missing)
{ "error": "Image not found" }

// PATCH /api/recipes/r1/images/reorder
// Body: { "orderedIds": ["img-def", "img-abc"] }
// 200
{ "ok": true }
// 400 (empty array)
{ "error": "Invalid request data", "details": [ /* ZodIssue[] */ ] }

// GET /api/recipes (list) — per recipe:
{
  "id": "r1", "title": "Carbonara",
  /* …existing fields… */
  "primaryImageId": "img-abc"
  // note: NO "images" key
}

// GET /api/recipes/r1 (detail) — adds:
{
  /* …existing fields… */
  "images": [
    { "id": "img-abc", "order": 0, "fileName": "front.jpg", "mimeType": "image/jpeg" },
    { "id": "img-def", "order": 1, "fileName": "side.png",  "mimeType": "image/png" }
  ]
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree spawned without node_modules and without an `.env`**

- **Found during:** Pre-Task 1 environment setup (`pnpm exec tsc` failed with "tsc not found").
- **Issue:** Same as plan 02-01 deviation 1 — Claude Code worktree is bare; pnpm dependencies and `.env` (with `DATABASE_URL`) must be hydrated before any test or type-check can run.
- **Fix:** `cp .env.example .env` (no secrets, just `DATABASE_URL=postgres://postgres:password@localhost:5432/recipe_organizer`) and `pnpm install --prefer-offline` (~32s from the global store) + `pnpm exec prisma generate` so the Prisma client types resolve.
- **Files modified:** `.env` (gitignored), `node_modules/` (gitignored).
- **Committed in:** Not committed — both paths are .gitignore'd.

**2. [Rule 2 — Missing Critical Infrastructure] jest.setup.js referenced `window` unconditionally**

- **Found during:** Task 1 RED test run — first API route test failed with `ReferenceError: window is not defined` even with `@jest-environment node` on the test file.
- **Issue:** The project's `jest.setup.js` runs once for every test file and unconditionally does `Object.defineProperty(window, 'matchMedia', …)`. This makes it impossible to use the `node` jest environment anywhere in the project — which Next.js API route tests need (Next.js `Request` polyfill assumes a Web-API global like Node's `global.Request`, and the jsdom shim doesn't expose enough for `request.formData()`).
- **Fix:** Wrapped the matchMedia stub in `if (typeof window !== 'undefined') { … }`. Behavior under the jsdom env (the project's default) is unchanged; the node env (API route tests) now also loads the setup file cleanly.
- **Files modified:** `jest.setup.js`
- **Verification:** `pnpm test` runs all 140 tests across both jsdom and node environments without errors.
- **Committed in:** `3c76edf` (Task 1 RED commit, alongside the first node-env test file).

**3. [Rule 1 — Bug] Prettier auto-wrap broke a plan grep contract**

- **Found during:** Task 1 acceptance verification — the plan requires `grep -F "formData.getAll('images')"` to match, but my initial implementation wrote `formData.getAll('images').filter(...)` split across three lines (Prettier's default for chained calls), so the grep returned 0.
- **Fix:** Inlined the chain onto a single line with a `// prettier-ignore` directive directly above. The acceptance grep now matches; tests still pass; tsc still clean. Tracks the same pattern the plan 02-01 SUMMARY's deviation 3 documented for the composite-where assertion.
- **Files modified:** `src/app/api/recipes/[id]/images/route.ts`
- **Committed in:** `cf6652f` (Task 1 GREEN commit).

---

**Total deviations:** 3 auto-fixed (1 blocking env setup that repeats 02-01, 1 missing critical infra in jest.setup.js, 1 grep-contract bug). None expanded plan scope.

## Issues Encountered

- **Jest CLI flag still `--testPathPatterns` (Jest 30).** Plan's verify commands say `--testPathPattern` (singular); the SDK swallowed the deprecation warning. Used the plural form throughout.
- **NextRequest under jsdom.** Even with `Request` polyfilled, `new NextRequest(...)` needs the `node` jest env. Solved by the `@jest-environment node` per-file pragma — no changes to jest.config.js global env.

## TDD Gate Compliance

- **RED gates present** (5/5): `3c76edf`, `cee9301`, `029b5bc`, `7ef5c22`, `0358109` — each is a `test(02-02): add failing tests …` commit.
- **GREEN gates present** (5/5): `cf6652f`, `600909e`, `3fe8b38`, `f68dd3a`, `28267cf` — each is a `feat(02-02): implement / project / include …` commit immediately after its RED partner.
- **REFACTOR:** Not used. Implementation landed in its final form; one tiny `// prettier-ignore` adjustment in Task 1 was rolled into the GREEN commit, not a separate refactor.

## Threat Flags

None — every modification is in the plan's threat register. Cross-recipe ownership (T-02-08/09), no-bytes-in-list (T-02-11), and accepted T-02-12 race are each covered by the listed mitigations and tests.

## Verification Summary

- **All 21 new tests pass** (7+6+3+3+2).
- **Full suite: 140/140 passing** (delta +21 from the 119 baseline; > 111 phase-1 baseline as required).
- **tsc --noEmit:** exits 0.
- **Negative grep:** no `data:` field appears in any route response or include in this plan.
- **Acceptance greps:** All grep contracts (formData.getAll, T-02-12, jest.clearAllMocks, P2025, Cache-Control, ReorderSchema, primaryImageId, orderBy asc) match per-task.

## Self-Check: PASSED

- All 8 `key-files.created` and 3 `key-files.modified` paths exist on disk.
- All 10 plan commits (`3c76edf`, `cf6652f`, `cee9301`, `600909e`, `029b5bc`, `3fe8b38`, `7ef5c22`, `f68dd3a`, `0358109`, `28267cf`) exist in `git log --oneline`.
- `pnpm test` reports 140/140 passing; `pnpm exec tsc --noEmit` exits 0.

---
*Phase: 02-multi-image-support*
*Completed: 2026-05-13*
