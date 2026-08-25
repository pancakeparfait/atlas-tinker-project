---
phase: 02-multi-image-support
plan: 01
subsystem: database
tags:
  - prisma
  - migration
  - storage-adapter
  - dnd-kit
  - postgres

# Dependency graph
requires:
  - phase: 01-fraction-display
    provides: existing DatabaseStorageAdapter, validateImage helper, IMAGE_CONFIG limits
provides:
  - recipe_images table with cascade FK and composite (recipe_id, order) index, populated with pre-existing single-image data
  - Extended StorageAdapter interface (saveRecipeImage, getRecipeImage, deleteRecipeImage, listRecipeImages, reorderRecipeImages)
  - DatabaseStorageAdapter implementation with $transaction-scoped delete + renormalization and cross-recipe composite-where guard
  - @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities installed (v1 stable API)
affects:
  - 02-02 (API routes — depend on adapter methods and table)
  - 02-03 (TanStack hooks — depend on routes)
  - 02-04 (UI components — depend on @dnd-kit)
  - 02-05 (recipe list/detail integration — depend on primary image projection)

# Tech tracking
tech-stack:
  added:
    - "@dnd-kit/core@^6.3.1"
    - "@dnd-kit/sortable@^10.0.0"
    - "@dnd-kit/utilities@^3.2.2"
  patterns:
    - "Normalized one-to-many recipe images keyed by Recipe.id + composite (recipe_id, order) index"
    - "Order-is-primary (order=0 is featured) — no separate is_primary flag"
    - "Composite-where cross-recipe guard ({ id, recipeId }) on every image mutation"
    - "Delete + renormalize in a single prisma.$transaction so orders stay contiguous"
    - "List endpoints select metadata only — image bytes never travel outside getRecipeImage"

key-files:
  created:
    - prisma/migrations/20260513174137_add_recipe_images/migration.sql
    - src/lib/storage/__tests__/database-adapter.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/storage/storage-adapter.ts
    - src/lib/storage/database-adapter.ts
    - package.json
    - pnpm-lock.yaml
    - .gitignore

key-decisions:
  - "Track prisma/migrations in git (un-ignored) so CI/prisma migrate deploy can reproduce schema from scratch"
  - "Use prisma.$transaction(async callback) form for deleteRecipeImage so the delete and renormalize run as one unit; use prisma.$transaction(array) form for reorderRecipeImages where each update is independent"
  - "Composite where { id, recipeId } enforced in both delete and reorder paths to prevent cross-recipe manipulation (T-02-03 mitigation)"
  - "Leave legacy recipes.image_data / image_mime_type / image_file_name / image_url columns intact (RESEARCH A1); cleanup deferred to follow-up phase"

patterns-established:
  - "Multi-image schema pattern: separate child model with @@map, cascade FK, composite (parent_id, order) index, and order-as-primary positional semantics"
  - "TDD for adapter methods: jest.mock @/lib/prisma at module level, drive $transaction with a callback-implementation mock that mirrors the prisma client surface"
  - "Migration data-backfill pattern: append INSERT...SELECT to a --create-only migration so prisma migrate dev and prisma migrate deploy both reproduce the data copy identically"

requirements-completed:
  - IMG-05
  - IMG-06

# Metrics
duration: ~30min
completed: 2026-05-13
---

# Phase 02 Plan 01: Multi-Image Foundation Summary

**RecipeImage Prisma model + applied migration with single-image backfill, extended StorageAdapter contract, DatabaseStorageAdapter implementation with cross-recipe composite-where guards and delete-time order renormalization, plus @dnd-kit v1 packages installed.**

## Performance

- **Duration:** ~30 minutes
- **Started:** 2026-05-13T17:37 (approx, after env setup)
- **Completed:** 2026-05-13T17:48:06Z
- **Tasks:** 4 (1a, 1b, 1c, 2 — task 2 with RED then GREEN commits per TDD gate)
- **Files modified:** 8 (1 schema, 1 migration, 1 interface, 1 adapter, 1 test, package.json/lockfile, .gitignore)
- **Test count delta:** +7 tests (112 → 119 passing)

## Accomplishments

- `recipe_images` table exists in the live PostgreSQL database with id, recipe_id, order, mime_type, data, file_name, created_at columns, cascade FK, and a composite (recipe_id, order) index.
- Generated Prisma migration `20260513174137_add_recipe_images` hand-appended with `INSERT INTO recipe_images SELECT FROM recipes WHERE image_data IS NOT NULL` so single-image recipes survive the cutover with order=0.
- Five new methods on `StorageAdapter` and `DatabaseStorageAdapter` (`saveRecipeImage`, `getRecipeImage`, `deleteRecipeImage`, `listRecipeImages`, `reorderRecipeImages`) — delete renormalizes remaining orders to 0..n-1 inside a single transaction; both mutating paths use a composite `{ id, recipeId }` where to prevent cross-recipe manipulation.
- Six behavioral tests (A save/get roundtrip, B list ordering + metadata-only, C delete+renormalize, D reorder atomic, E cross-recipe guard with composite-where assertion, F oversized buffer rejection) plus a "missing returns null" sub-case — all 7 pass; full suite 119/119 green.
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (v1 stable API) installed and resolvable from node_modules; `@dnd-kit/react` (v2) explicitly avoided per RESEARCH Pitfall 4.

## Task Commits

Each task was committed atomically. Task 2 follows the TDD RED→GREEN gate sequence:

1. **Task 1a: Add RecipeImage model + Recipe back-relation** — `3a67406` (feat)
2. **Task 1b: Generate + apply migration with appended data-backfill INSERT** — `08df917` (feat)
3. **Task 1c: Install @dnd-kit packages** — `199bc66` (chore)
4. **Task 2 RED: Failing tests for multi-image adapter methods** — `2e1a428` (test)
5. **Task 2 GREEN: Implement five new StorageAdapter methods on DatabaseStorageAdapter** — `0c045df` (feat)

_TDD gate: RED gate (`test(02-01)` at 2e1a428) and GREEN gate (`feat(02-01)` at 0c045df) both present in sequence. REFACTOR not needed — code was committed in clean form._

## Files Created/Modified

### Created

- `prisma/migrations/20260513174137_add_recipe_images/migration.sql` — CREATE TABLE recipe_images + composite index + cascade FK + hand-appended INSERT INTO recipe_images SELECT FROM recipes WHERE image_data IS NOT NULL.
- `src/lib/storage/__tests__/database-adapter.test.ts` — 7 unit tests covering save+get roundtrip, list ordering+metadata-only, delete+renormalize, reorder atomicity, cross-recipe guard (with composite-where assertion on `tx.recipeImage.delete.mock.calls[0][0]`), and oversized-buffer rejection.

### Modified

- `prisma/schema.prisma` — Append `model RecipeImage` block; add `images RecipeImage[]` back-relation on `Recipe`. Legacy single-image columns (`imageData`, `imageMimeType`, `imageFileName`, `imageUrl`) left intact.
- `src/lib/storage/storage-adapter.ts` — Append five new method signatures to the `StorageAdapter` interface under a `// --- Multi-image (Phase 2) ---` JSDoc separator. `IMAGE_CONFIG` unchanged.
- `src/lib/storage/database-adapter.ts` — Implement five new methods on `DatabaseStorageAdapter`. `deleteRecipeImage` uses `prisma.$transaction(async (tx) => { ... })`; `reorderRecipeImages` uses `prisma.$transaction([...updates])`.
- `package.json` / `pnpm-lock.yaml` — Add `@dnd-kit/core@^6.3.1`, `@dnd-kit/sortable@^10.0.0`, `@dnd-kit/utilities@^3.2.2` to `dependencies`.
- `.gitignore` — Remove `/prisma/migrations/` ignore directive so applied migrations are tracked in VCS (see Deviation 2 below).

## Decisions Made

- **Tx-mode for deleteRecipeImage:** Used the interactive **callback** form (`prisma.$transaction(async (tx) => ...)`) because the renormalize step depends on the result of `findMany` after the delete. Sequential reads/writes inside a callback are simpler than chaining promises in the array form, and the codebase already uses this idiom in `src/app/api/recipes/[id]/route.ts`.
- **Tx-mode for reorderRecipeImages:** Used the **array** form (`prisma.$transaction([...orderedIds.map(...)])`) because each per-id update is independent and parallelizable. This matches RESEARCH Pattern 4 exactly.
- **Migration name:** Settled on `add_recipe_images` (plural) so the migration directory and `@@map("recipe_images")` table name align. Actual generated directory: `20260513174137_add_recipe_images`.
- **Legacy column policy:** Left `recipes.image_data`, `image_mime_type`, `image_file_name`, `image_url` in place per RESEARCH A1 / Open Question 1 (RESOLVED). No DROP COLUMN in this migration.
- **No `prisma migrate reset`** was executed in the autonomous flow — the migration applied cleanly to the existing dev database (it had two prior migrations applied and was at the schema-matched state).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] node_modules and .env missing in the fresh worktree**

- **Found during:** Pre-Task 1 environment setup
- **Issue:** Worktree spawned without `node_modules` (pnpm dependencies) and without an `.env` file containing `DATABASE_URL`. `pnpm exec prisma validate`, `prisma migrate dev`, and `node -e "...recipeImage..."` all require these to be present.
- **Fix:** Copied `.env.example` to `.env` (DATABASE_URL points at the running Docker postgres on `localhost:5432`); ran `pnpm install --prefer-offline` to hydrate `node_modules` from the global pnpm store.
- **Files modified:** `.env` (untracked, ignored by .gitignore line `Local env files`)
- **Verification:** `pnpm exec prisma validate` exited 0; `node -e "require.resolve('@prisma/client')"` succeeded.
- **Committed in:** Not committed (`.env` is gitignored; `node_modules/` is gitignored).

**2. [Rule 2 — Missing Critical Infrastructure] Prisma migrations were being gitignored**

- **Found during:** Task 1b commit step (`git add prisma/migrations/` returned "paths are ignored by one of your .gitignore files")
- **Issue:** `.gitignore` line 40 read `/prisma/migrations/`, which prevented the new `add_recipe_images` migration (and the two prior baselined migrations `20251112174927_initial`, `20251119180113_add_recipe_image`) from being tracked. Without tracked migrations, `prisma migrate deploy` in CI / production cannot reproduce the schema and the plan's required artifact (`prisma/migrations/*/migration.sql`) cannot land. This is the standard Prisma anti-pattern called out in Prisma's own documentation.
- **Fix:** Removed the `/prisma/migrations/` line from `.gitignore`; left `prisma/dev.db*` (SQLite dev artifacts) ignored. Copied the two prior migration directories from the parent project so the worktree's migrations dir is in sync with the dev database's `_prisma_migrations` table. Staged all three migration directories + `migration_lock.toml` in the Task 1b commit.
- **Files modified:** `.gitignore`, `prisma/migrations/20251112174927_initial/migration.sql`, `prisma/migrations/20251119180113_add_recipe_image/migration.sql`, `prisma/migrations/migration_lock.toml`
- **Verification:** `git ls-files prisma/migrations/ | wc -l` returns 4; `pnpm exec prisma migrate status` reports all three migrations applied and "Database schema is up to date".
- **Committed in:** `08df917` (Task 1b commit)

**3. [Rule 1 — Bug] Plan grep contract for composite-where assertion was multi-line by default**

- **Found during:** Task 2 acceptance criteria verification
- **Issue:** The plan's acceptance grep `calls\[0\]\[0\]\)\.toEqual\(\s*\{\s*where:\s*\{\s*id:` requires the composite-where assertion to be on a single grep-able line. My initial test wrote it across three lines (Prettier-default), so the grep returned 0 matches even though the assertion was semantically correct.
- **Fix:** Reformatted the assertion in Test E to a single line with a `// prettier-ignore` directive so future formatter runs won't re-wrap it.
- **Files modified:** `src/lib/storage/__tests__/database-adapter.test.ts`
- **Verification:** `grep -cE "calls\[0\]\[0\]\)\.toEqual\(\s*\{\s*where:\s*\{\s*id:" src/lib/storage/__tests__/database-adapter.test.ts` returns 1; all 7 tests still pass.
- **Committed in:** `0c045df` (Task 2 GREEN commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical infra, 1 blocking env setup, 1 bug)
**Impact on plan:** All three deviations were strictly necessary to satisfy the plan's success criteria. None expanded scope. The `.gitignore` fix is the only deviation that touches a file outside `files_modified` and reflects a long-standing project misconfiguration rather than new work.

## Issues Encountered

- **Jest CLI flag renamed.** Plan's verify step uses `--testPathPattern` but Jest 30 renamed it to `--testPathPatterns`. Worked around at the command-line; no code change needed.
- **Database container.** The Docker postgres container `recipe-organizer-postgres` was already running (from the parent repo) and healthy. `docker compose up -d` in the worktree errored on the duplicate container name, which is harmless — the existing container is shared via the `5432:5432` port binding.

## TDD Gate Compliance

- **RED gate present:** commit `2e1a428` is `test(02-01): add failing tests for multi-image storage adapter methods`. All 7 tests fail with `TypeError: adapter.{method} is not a function` before any implementation.
- **GREEN gate present:** commit `0c045df` is `feat(02-01): implement multi-image methods on DatabaseStorageAdapter`. All 7 tests pass; full suite 119/119 green.
- **REFACTOR gate:** Not used. Implementation landed in its final form.

## User Setup Required

None — no external service configuration. The dev PostgreSQL container is the only runtime dependency and it was already healthy.

## Next Phase Readiness

- **Plan 02-02 (API routes)** can now consume the new adapter methods directly. Routes will call `storageAdapter.saveRecipeImage`, `listRecipeImages`, `deleteRecipeImage`, `reorderRecipeImages`.
- **Plan 02-03 (TanStack hooks)** depends on routes — unblocked once 02-02 lands.
- **Plan 02-04 (UI components)** has `@dnd-kit` installed and the sortable API is available; the `SortableThumbnailStrip` glue from RESEARCH Pattern 3 can be implemented as soon as 02-03 hooks land.

No blockers. No outstanding TODOs. Legacy `recipes.image_*` columns intentionally left in place per RESEARCH A1 — cleanup migration is a future-phase concern.

## Self-Check: PASSED

- All five `key-files.created`/`modified` paths exist on disk.
- All five plan commits (`3a67406`, `08df917`, `199bc66`, `2e1a428`, `0c045df`) exist in `git log --oneline --all`.
- `pnpm test` reports 119/119 passing; `pnpm exec tsc --noEmit` exits 0.

---
*Phase: 02-multi-image-support*
*Completed: 2026-05-13*
