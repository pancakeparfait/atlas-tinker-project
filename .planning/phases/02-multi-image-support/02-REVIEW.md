---
phase: 02-multi-image-support
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 30
files_reviewed_list:
  - prisma/schema.prisma
  - prisma/migrations/20260513174137_add_recipe_images/migration.sql
  - src/lib/storage/storage-adapter.ts
  - src/lib/storage/database-adapter.ts
  - src/lib/storage/__tests__/database-adapter.test.ts
  - src/app/api/recipes/route.ts
  - src/app/api/recipes/[id]/route.ts
  - src/app/api/recipes/[id]/images/route.ts
  - src/app/api/recipes/[id]/images/[imageId]/route.ts
  - src/app/api/recipes/[id]/images/reorder/route.ts
  - src/app/api/recipes/__tests__/route.test.ts
  - src/app/api/recipes/[id]/__tests__/route.test.ts
  - src/app/api/recipes/[id]/images/__tests__/route.test.ts
  - src/app/api/recipes/[id]/images/[imageId]/__tests__/route.test.ts
  - src/app/api/recipes/[id]/images/reorder/__tests__/route.test.ts
  - src/lib/queries/recipe-queries.ts
  - src/lib/queries/recipe-image-queries.ts
  - src/lib/queries/__tests__/recipe-image-queries.test.ts
  - src/components/recipes/image-gallery.tsx
  - src/components/recipes/image-upload-zone.tsx
  - src/components/recipes/sortable-thumbnail-strip.tsx
  - src/components/recipes/__tests__/image-gallery.test.tsx
  - src/components/recipes/__tests__/image-upload-zone.test.tsx
  - src/components/recipes/__tests__/sortable-thumbnail-strip.test.tsx
  - src/app/recipes/page.tsx
  - src/app/recipes/[id]/page.tsx
  - src/app/recipes/[id]/edit/page.tsx
  - src/app/recipes/__tests__/page.test.tsx
  - src/app/recipes/[id]/__tests__/page.test.tsx
  - src/app/recipes/[id]/edit/__tests__/page.test.tsx
findings:
  critical: 4
  warning: 8
  info: 5
  total: 17
status: fixed
fix_report: 02-REVIEW-FIX.md
fixed_at: 2026-05-13
---

# Phase 2: Code Review Report

**Reviewed:** 2026-05-13T00:00:00Z
**Depth:** standard
**Files Reviewed:** 30
**Status:** issues_found

## Summary

Phase 2 adds a `RecipeImage` table, a multi-image storage adapter, four new API
routes, a React Query layer, three image-handling React components, and
list/detail/edit page integrations. The adapter and route layer correctly use
composite `{id, recipeId}` predicates to prevent cross-recipe access, and the
delete path renormalizes orders inside a transaction. Tests are reasonably
thorough at the unit level.

However, four BLOCKER defects must be fixed before this code ships:

1. The data migration will crash on any existing row where `image_data IS NOT
   NULL` but `image_mime_type IS NULL` (a state the prior schema explicitly
   permitted), aborting the entire deploy.
2. The recipes list and detail endpoints still pull the legacy `imageData`
   BLOB into every response payload — every list response now ships multi-MB
   binary payloads in JSON, plus exposes the legacy bytes the migration just
   copied into `recipe_images`.
3. The `ImageUploadZone` ignores the `failed` array returned by the upload
   API, so files the server rejected (oversize, bad MIME, corrupt header) are
   rendered with a green "done" checkmark.
4. `reorderRecipeImages` uses `prisma.$transaction([updates])`. Updates that
   target a row not belonging to the recipe throw P2025, but the route maps
   every adapter error to a generic 500 — so a partial mismatch returns 500
   while in fact rolling back the whole reorder. Combined with the fact that
   shape-validated `orderedIds` is not checked against the actual recipe's
   imageId set, a user can submit any subset/superset and silently corrupt
   ordering (some IDs not updated, others rolled back) without a meaningful
   error.

The mutation hook name `useDeleteRecipeImage` collides between the legacy
`recipe-queries.ts` module and the new `recipe-image-queries.ts` module with
incompatible call signatures, creating a footgun.

## Critical Issues

### CR-01: Data migration fails when `image_data` exists without `image_mime_type`

**File:** `prisma/migrations/20260513174137_add_recipe_images/migration.sql:21-31`
**Issue:** The data backfill INSERT copies `image_mime_type` straight into
`recipe_images.mime_type`, which is `NOT NULL`. The prior schema (see
`20251119180113_add_recipe_image/migration.sql`) added `image_mime_type` as a
nullable column, so production may contain rows with `image_data IS NOT NULL`
and `image_mime_type IS NULL`. The migration uses `COALESCE` for `file_name`
but not for `mime_type`, so any such row will raise a NOT NULL constraint
violation and abort the entire migration.

This is the migration that creates the new table; aborting it leaves the
database in a half-migrated state where `_prisma_migrations` may be marked
"applied: false". Recovery requires manual SQL.

**Fix:**
```sql
INSERT INTO recipe_images (id, recipe_id, "order", mime_type, data, file_name, created_at)
SELECT
  gen_random_uuid()::text,
  id,
  0,
  COALESCE(image_mime_type, 'application/octet-stream'),
  image_data,
  COALESCE(image_file_name, 'image'),
  NOW()
FROM recipes
WHERE image_data IS NOT NULL
  AND image_data IS NOT NULL;  -- keep guard explicit
```
Or, more defensively, also require `image_mime_type IS NOT NULL` in the WHERE
clause so rows lacking a MIME type are skipped rather than silently coerced
to a bogus content type. Either way the current code must not stay.

---

### CR-02: Legacy `imageData` BLOB leaks into every recipes list/detail response

**File:** `src/app/api/recipes/route.ts:82-99`, `src/app/api/recipes/[id]/route.ts:37-51`
**Issue:** Both endpoints call `prisma.recipe.findMany`/`findUnique` with
`include: { ingredients, images }` and no top-level `select`. Prisma defaults
to returning **all** scalar columns of `Recipe`, which still includes the
legacy `imageData: Bytes?` BLOB column (`prisma/schema.prisma:27`) for every
recipe — exactly the bytes the data migration just copied into
`recipe_images`.

The serializer's `const { images: _images, ...rest } = recipe` only strips
the new `images` relation; it does not strip `imageData`. Consequences:

- A list response containing N recipes ships N copies of the legacy BLOB
  inside the JSON body (base64-bloated by JSON encoding of `Bytes`). The
  list endpoint becomes O(MB × N).
- The bytes are still readable through the legacy `/api/recipes/:id`
  detail response even though the multi-image system is the intended
  surface and a dedicated binary endpoint already exists. This is also a
  defense-in-depth concern: the migration's stated goal was to "copy" the
  data into the new table, so the legacy bytes should be either deleted
  or hidden from the JSON API.

Tests at `src/app/api/recipes/__tests__/route.test.ts:90-103` only assert
that `include.images` doesn't carry bytes, not that the top-level recipe
doesn't carry `imageData`.

**Fix:** Explicitly `select:` the columns each endpoint needs, or use Prisma's
`omit` field (5.16+). Minimal example for the list route:
```ts
prisma.recipe.findMany({
  where,
  omit: { imageData: true },   // or use `select` exhaustively
  include: {
    ingredients: { include: { ingredient: true } },
    images: { where: { order: 0 }, take: 1, select: { id: true } },
  },
  orderBy: { createdAt: 'desc' },
  skip,
  take: limit,
});
```
Add an assertion in the route test that
`JSON.stringify(body)` does not contain `"imageData"` or `"image_data"`.

---

### CR-03: ImageUploadZone marks server-rejected files as "done"

**File:** `src/components/recipes/image-upload-zone.tsx:60-67`
**Issue:** The upload route (`POST /api/recipes/[id]/images`) returns
`{ imageIds, failed: [{ fileName, error }] }` and a 201 status even when
some files failed server-side validation. The upload zone awaits
`mutateAsync` and then unconditionally marks every row whose `fileName`
matches a sent file and whose status is `'uploading'` as `'done'`:

```ts
await uploadMutation.mutateAsync({ recipeId, files: valid });
setRows((prev) =>
  prev.map((row) =>
    valid.some((f) => f.name === row.fileName) && row.status === 'uploading'
      ? { ...row, status: 'done' }
      : row
  )
);
```

The `failed` array is never inspected. A user who uploads three files where
the server flags one as oversize sees three green checkmarks and no error
message — the failure is silently lost. This is a correctness/UX bug that
also undermines the partial-failure contract Test C in
`__tests__/route.test.ts` is verifying.

**Fix:**
```ts
const result = await uploadMutation.mutateAsync({ recipeId, files: valid });
const failedNames = new Set(result.failed.map((f) => f.fileName));
setRows((prev) =>
  prev.map((row) => {
    if (row.status !== 'uploading') return row;
    if (!valid.some((f) => f.name === row.fileName)) return row;
    if (failedNames.has(row.fileName)) {
      const err = result.failed.find((f) => f.fileName === row.fileName);
      return { ...row, status: 'error', error: err?.error ?? 'Upload rejected' };
    }
    return { ...row, status: 'done' };
  })
);
```
Also note: matching by `fileName` is itself fragile — see WR-01 below.

---

### CR-04: reorderRecipeImages accepts any imageId list without verifying the set

**File:** `src/app/api/recipes/[id]/images/reorder/route.ts:22-31`, `src/lib/storage/database-adapter.ts:190-201`
**Issue:** The handler validates only the JSON shape (`orderedIds: string[]`
with each entry non-empty). It does not verify that `orderedIds` is exactly
the set of imageIds currently attached to the recipe. The adapter then runs
one `update` per id inside a single `$transaction`.

Two failure modes follow:

1. **Cross-recipe / unknown id:** Composite `where: { id, recipeId }` on an
   id the recipe doesn't own raises P2025, the whole transaction rolls back,
   but the route maps any non-Zod error to a generic
   `{ error: 'Failed to reorder images' }` with status 500. The client
   surfaces "Failed to reorder images" — indistinguishable from a real
   database outage and not actionable for the user. The route docstring
   actually acknowledges this ("Cross-recipe imageIds cause the adapter
   transaction to roll back; the handler surfaces that as a 500"), which
   means the design intentionally chose 500 over 400/404 — that is the
   wrong choice for a request-data problem.

2. **Subset / missing id:** If the client sends only some of the recipe's
   imageIds, the transaction succeeds. The omitted images keep their old
   `order` values, which now collide with the new ones — exactly the
   duplicate-order state the deleteRecipeImage path is supposed to repair.
   The accepted T-02-12 race tolerates duplicates from concurrent uploads,
   but here the route silently produces them on every reorder PATCH that
   doesn't pass the full set.

The reorder test (`__tests__/route.test.ts:30-40`) only asserts the happy
path forwards the array; it never exercises a subset or unknown id.

**Fix:** In the route, before calling the adapter, load the current ids and
validate:
```ts
const existing = await prisma.recipeImage.findMany({
  where: { recipeId: id },
  select: { id: true },
});
const existingSet = new Set(existing.map((r) => r.id));
const incomingSet = new Set(orderedIds);
if (
  orderedIds.length !== existing.length ||
  orderedIds.some((x) => !existingSet.has(x)) ||
  existing.some((r) => !incomingSet.has(r.id))
) {
  return NextResponse.json(
    { error: 'orderedIds must be exactly the recipe\'s image set' },
    { status: 400 }
  );
}
```
Then map any P2025 from the adapter to 404 explicitly, mirroring the
DELETE handler at `[imageId]/route.ts:77-87`.

## Warnings

### WR-01: `validRowsInFlight` and `doneCount` leak across upload batches

**File:** `src/components/recipes/image-upload-zone.tsx:81-84,131`
**Issue:** `rows` accumulates across every `handleFiles` invocation, but the
progress copy reads from it as if it represented the current batch:
```ts
const validRowsInFlight = rows.filter(
  (r) => r.status === 'uploading' || r.status === 'done'
).length;
const doneCount = rows.filter((r) => r.status === 'done').length;
// ...
`Uploading photo ${doneCount + 1} of ${validRowsInFlight}…`
```
A user who uploads 2 files, sees them succeed, then drops another, will
see "Uploading photo 3 of 3" because the previous batch's `done` rows are
still counted. After enough sessions the count gets absurd.

Worse: when matching `fileName === row.fileName` to flip rows to `done` in
`handleFiles`, a second batch containing the same filename as an
already-uploaded file would re-flip nothing (status is `done`, not
`uploading`) — so the bug is asymmetric and confusing.

**Fix:** Track per-batch state (e.g. capture batch ids in `newRows`, then
update only those):
```ts
const batchIds = new Set(newRows.filter((r) => r.status === 'uploading').map((r) => r.id));
// ...
setRows((prev) =>
  prev.map((row) =>
    batchIds.has(row.id) && row.status === 'uploading'
      ? { ...row, status: 'done' }
      : row
  )
);
```
And derive progress from `batchIds`, not the global `rows` array.

### WR-02: Upload error handler clobbers concurrent in-flight uploads

**File:** `src/components/recipes/image-upload-zone.tsx:68-79`
**Issue:** On a mutation rejection the catch block sets every row whose
status is `'uploading'` to `'error'`:
```ts
setRows((prev) =>
  prev.map((row) =>
    row.status === 'uploading' ? { ...row, status: 'error', error: message } : row
  )
);
```
If a user drops batch A, drops batch B before A's request finishes, and then
A rejects, the rows from B (still in flight) are flipped to "error" even
though their request hasn't returned. Same per-batch tracking from WR-01
fixes this — scope the error update to the batch's row ids.

### WR-03: Name collision — `useDeleteRecipeImage` exists in two modules with incompatible signatures

**File:** `src/lib/queries/recipe-queries.ts:262-272`, `src/lib/queries/recipe-image-queries.ts:122-141`
**Issue:** Two hooks with the same name, totally different argument shapes:

- `recipe-queries.useDeleteRecipeImage` — legacy, single-image,
  `mutate(recipeId: string)` calls `DELETE /api/recipes/:id/image`.
- `recipe-image-queries.useDeleteRecipeImage` — new, multi-image,
  `mutate({recipeId, imageId})` calls `DELETE /api/recipes/:id/images/:imageId`.

VSCode auto-import will offer either based on alphabetical order. A future
consumer that imports the wrong one passes a string where an object is
expected; TypeScript will catch it only if the caller has strict
typing. Same for `useUploadRecipeImage` vs `useUploadRecipeImages`.

**Fix:** Either delete the legacy hooks from `recipe-queries.ts` if the
legacy `/image` endpoints are being retired (Phase 2 strongly implies they
are), or rename the legacy ones (e.g. `useDeleteLegacyRecipeImage`) so
auto-import is unambiguous.

### WR-04: `image-upload-zone` row id key includes `Math.random()` — non-deterministic across renders

**File:** `src/components/recipes/image-upload-zone.tsx:49`
**Issue:** `const id = \`${f.name}-${Date.now()}-${Math.random()}\`;`. While
not a bug per se (id is generated once per `handleFiles` call), `Math.random`
is unnecessary entropy — `Date.now()` plus an in-handler counter would be
both deterministic and unique within the batch. The current scheme breaks
deterministic test snapshots and complicates per-batch tracking when fixing
WR-01/WR-02.

**Fix:** Use a stable counter or `crypto.randomUUID()` for clarity:
```ts
const id = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `${f.name}-${Date.now()}-${counter++}`;
```

### WR-05: `GET /api/recipes/[id]` does not 404 on missing recipe before returning empty images array

**File:** `src/app/api/recipes/[id]/route.ts:37-58`
**Issue:** The handler returns 404 if `findUnique` returns null — that's
correct. But the implementation performs a single `findUnique` with the new
`include.images`, then early-returns. That's fine for correctness, but the
404 message body is `{ error: 'Recipe not found' }` while the route at
`/api/recipes/:id/images/:imageId` returns `{ error: 'Image not found' }`.
Cross-route message consistency is fine — flagging only because callers
that key on the error string need to know both shapes.

Not a bug; flagged because the test in `[id]/__tests__/route.test.ts`
covers only the happy path of `include.images` (no 404 path covered for
the Phase 2 changes). Consider adding a 404 test that exercises the new
include shape.

### WR-06: ImageGallery falls back to first image when `selectedId` is stale, silently

**File:** `src/components/recipes/image-gallery.tsx:40-44`
**Issue:** After mounting, `setSelectedId` is the only mutation point for
`selectedId`. If the `images` prop changes (e.g. an image is deleted via
SortableThumbnailStrip while the gallery is mounted on the same page), the
previously-selected id may no longer exist in `sorted`. The component
silently snaps to index 0 via `Math.max(0, findIndex)`. There's no
`useEffect` to reset `selectedId` when the prop changes, and no explicit
synchronization. Not catastrophic (the fallback is sensible) but the
behaviour is non-obvious and easy to break if a future refactor reorders
the conditional logic.

**Fix:** Drive selection through derived state or sync via
`useEffect(() => { if (!sorted.find(i => i.id === selectedId)) setSelectedId(sorted[0]?.id ?? ''); }, [sorted, selectedId])`.
Alternatively, use index-based state seeded from prop length.

### WR-07: `recipe.images` typed as optional on legacy hooks but consumed unconditionally

**File:** `src/lib/queries/recipe-queries.ts:18-23`, `src/app/recipes/[id]/page.tsx:159`
**Issue:** The `Recipe` interface declares `images?: Array<...>` (optional),
but list responses never include it (only `primaryImageId`). The detail
page reads `recipe.images ?? []` correctly — but the edit page
(`src/app/recipes/[id]/edit/page.tsx:90-92`) reads `recipe.images && recipe.images.length > 0`,
which is also fine. However the type does not reflect the API contract:
list responses NEVER have `images`, detail responses ALWAYS do. A discriminated
union would prevent a caller from doing `recipes.recipes[0].images!.length` (a
runtime crash).

**Fix:** Either always set `images: []` in list responses (cheap), or split
`RecipeListItem` and `RecipeDetail` interfaces and update callers.

### WR-08: Race in POST upload writes order without verifying recipe exists

**File:** `src/app/api/recipes/[id]/images/route.ts:33-83`
**Issue:** The handler never confirms the parent recipe exists before
writing into `recipe_images`. Prisma will surface a foreign-key violation
(P2003) if the recipe id is bogus, but the handler catches that as a generic
500. A non-existent recipe id should return 404, both for consistency with
DELETE and to avoid leaking server error semantics.

**Fix:** Add a fast path before `aggregate`:
```ts
const recipe = await prisma.recipe.findUnique({
  where: { id },
  select: { id: true },
});
if (!recipe) {
  return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
}
```
Also map P2003 to 404 in the catch block.

## Info

### IN-01: `where: any` weakens type safety in recipes list route

**File:** `src/app/api/recipes/route.ts:51`
**Issue:** `const where: any = {};` then dynamic property assignment loses
all Prisma type safety. A typo in a key (`difficutlyLevel`) would silently
not filter.

**Fix:** Type as `Prisma.RecipeWhereInput`.

### IN-02: `nutritionalInfo: z.any()` accepts anything

**File:** `src/app/api/recipes/route.ts:20`, `src/app/api/recipes/[id]/route.ts:20`
**Issue:** Accepts arbitrary JSON. Pre-existing, but worth noting that a
client could shove unlimited-size structures into this column. Consider
`z.record(z.unknown())` plus a max-size guard if this isn't already enforced
upstream.

### IN-03: `data.tags` and `data.isDraft` ignored on PUT when `undefined`

**File:** `src/app/api/recipes/[id]/route.ts:119-138`
**Issue:** `tags: data.tags` writes `undefined` when not provided, which
Prisma treats as "don't change". That's the intended behaviour, but the
schema has `tags: z.array(z.string()).optional()` so an explicit empty
array `[]` correctly clears the field. No fix needed — flagged for
documentation. Same applies to `isDraft`.

### IN-04: `gen_random_uuid()::text` in migration is inconsistent with cuid IDs elsewhere

**File:** `prisma/migrations/20260513174137_add_recipe_images/migration.sql:23`
**Issue:** Every other id column in this schema uses cuid (25-char). The
backfilled rows will have UUID v4 ids (36-char). Both fit `TEXT` so this
is cosmetic, but future code that assumes cuid format will break. Consider
using a cuid generator or just accept the inconsistency and document it.

### IN-05: `cn` import not used in `image-upload-zone.tsx` once `disabled` styling is removed

**File:** `src/components/recipes/image-upload-zone.tsx:4`
**Issue:** Minor — currently `cn` is used in the `className` builder; no
action needed. Re-flag during the WR-01 fix to confirm it's still needed.

---

_Reviewed: 2026-05-13T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
