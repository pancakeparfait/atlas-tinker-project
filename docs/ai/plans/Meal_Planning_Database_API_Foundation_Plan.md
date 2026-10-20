# Meal Planning: Database & API Foundation — Implementation Plan

**Issue**: #1 (Meal Planning: Database & API Foundation)
**Milestone**: Phase 3: Meal Planning Calendar
**Date**: September 1, 2026
**Status**: Ready for Implementation
**Complexity**: Medium

## Overview

Build the database and API foundation for meal planning. The app already has a
`MealPlan` / `PlannedMeal` / `MealType` data model scaffolded in the Prisma schema,
but there are no API routes, no TanStack Query hooks, and the schema's
`PlannedMeal.recipeId` is still `NOT NULL`. This plan:

1. Restores the missing technical research (the issue references `.scratch/...` which
   no longer exists) into `docs/plans/03-meal-planning-calendar/03-RESEARCH.md`.
2. Repairs a pre-existing baseline break (duplicate `RecipeImage` model and duplicate
   storage-adapter methods) so migrations and type-check are green before meal-plan work.
3. Makes `PlannedMeal.recipeId` optional and defines inclusive, date-only (YYYY-MM-DD)
   semantics.
4. Implements the meal-plan + planned-meal REST APIs and the matching TanStack Query hooks.
5. Covers everything with route, query-hook, and date-util tests.

## Current State

### ✅ What Exists

1. **Schema models** already scaffolded in `prisma/schema.prisma`:
   - `MealPlan`, `PlannedMeal`, `MealType` enum (includes `SNACK`).
   - `Recipe.plannedMeals` and `MealPlan.plannedMeals` relations.
   - `PlannedMeal.recipeId` + `recipe` relation currently `NOT NULL`.
2. **`date-fns@2.x`** already installed (used by `prisma/seed.ts`).
3. **Existing patterns to mirror**:
   - REST + Zod + Prisma routes: `src/app/api/recipes/route.ts`,
     `src/app/api/recipes/[id]/route.ts`.
   - Query hooks: `src/lib/queries/recipe-queries.ts`.
   - Hook test harness (fetch mock + QueryClient wrapper):
     `src/lib/queries/__tests__/recipe-image-queries.test.ts`.
   - Route tests mocking `@/lib/prisma`:
     `src/app/api/recipes/__tests__/route.test.ts`,
     `src/app/api/recipes/[id]/__tests__/route.test.ts`.
   - Prisma singleton: `src/lib/prisma.ts`.

### ❌ What's Missing / Broken

1. **Missing technical research doc** — issue #1 references
   `.scratch/03-meal-planning-calendar/03-RESEARCH.md`; neither `.scratch/` nor the
   doc exists in the checkout. Content is recoverable from commit `d0733b2` at
   `.planning/phases/03-meal-planning-calendar/03-RESEARCH.md`.
2. **Baseline break — duplicate `RecipeImage` model** — `prisma/schema.prisma`
   declares `RecipeImage` twice (lines `46-59` and `94-108`). `pnpm exec prisma validate`
   fails with `P1012`. The second declaration matches the applied migration.
3. **Baseline break — duplicate storage-adapter methods** —
   `src/lib/storage/database-adapter.ts` contains two implementations of the multi-image
   methods. `pnpm type-check` fails with eight `TS2393` duplicate-implementation errors,
   and `database-adapter.test.ts` is red (5 failing tests).
4. **`PlannedMeal.recipeId` is `NOT NULL`** — must become optional (null → notes-only slot).
5. **No meal-planning API routes** — none of
   `src/app/api/meal-plans*` or `src/app/api/planned-meals*` exist.
6. **No meal-planning query hooks** — no `src/lib/queries/meal-plan-queries.ts`.
7. **Local PostgreSQL not running** — `prisma migrate status` cannot reach
   `localhost:5432`; this must be started for DB-backed verification.

## Contract Decisions (resolved)

These resolve the ambiguities found in the historical plan. They are captured here
and in the research doc.

- **Date wire format**: all plan and meal dates use `YYYY-MM-DD` (date-only, no time).
  Request values are converted to UTC-midnight `Date` values for Prisma; responses
  serialize back to `YYYY-MM-DD` (never a timestamp).
- **Ranges are inclusive**: `startDate` and `endDate` both included. A one-week plan is
  `startDate..addDays(startDate, 6)`; a four-week view is `startDate..addDays(startDate, 27)`.
- **`MealType`**: the API accepts the full `MealType` enum (breakfast, lunch, dinner,
  snack). Nothing in issue #1 restricts snack; the calendar UI may choose not to expose it.
- **Notes-only planned meal**: represented as a `PlannedMeal` row with
  `recipeId = null` and a non-empty `notes`; `servingsPlanned = 0`.
- **Recipe-backed planned meal**: `recipeId` set, `servingsPlanned > 0`, `notes` optional.
- **Multiple recipes per slot**: more than one `PlannedMeal` row may share
  `(mealPlanId, mealDate, mealType)`. There is no DB uniqueness constraint for this;
  duplicate entries are allowed and not deduplicated.
- **Recipe deletion**: `PlannedMeal.recipe` uses `onDelete: SetNull`. Deleting a recipe
  leaves the planned slot intact with `recipeId = null`; the GET response then returns
  `recipe: null` for those rows. Recipe deletion is never blocked by meal planning.
- **Update semantics**: `PUT /api/meal-plans/[id]` updates plan metadata only (name,
  notes, budget limit) — not the date range.
- **Status codes**: `201` create, `200` success, `400` malformed/invalid data,
  `404` missing resource (plan / recipe / planned meal), `204` bodyless delete.
- **List response**: `GET /api/meal-plans` returns an array of `MealPlan`.
- **No planned-meal `PUT` in issue #1**: editing a planned meal (change recipe/servings/notes)
  is left for issue #3 (assign/remove via delete + recreate if needed).

## Implementation Steps

### Step 1: Restore and correct the technical research

**File**: `docs/plans/03-meal-planning-calendar/03-RESEARCH.md`

- Create a tracked Phase 3 research doc using commit `d0733b2` as the source,
  updated for the current repo.
- Correct stale field names found in the historical docs:
  - `title` (not `name`)
  - `prepTimeMinutes` (not `prepTime`)
  - `cookTimeMinutes` (not `cookTime`)
  - `difficultyLevel` (not `difficulty`)
- Record the canonical routes and the contract decisions above.
- Note the historical source (`d0733b2:.planning/phases/03-meal-planning-calendar/03-RESEARCH.md`).

### Step 2: Repair the baseline (preflight)

**Files**: `prisma/schema.prisma`, `src/lib/storage/database-adapter.ts`

1. In `prisma/schema.prisma`, retain **only** the `RecipeImage` declaration that matches
   the applied migration (`mime_type`, `data`, `file_name`) and remove the duplicate
   legacy declaration (`image_mime_type`, `image_file_name`, ...).
2. In `src/lib/storage/database-adapter.ts`, retain the single implementation that matches
   `StorageAdapter` and the existing image tests:
   - `getRecipeImage`, `listRecipeImages`, `deleteRecipeImage`
   - transactional order renormalization
   - one-argument `reorderRecipeImages(recipeId, orderedIds)`
3. Verify green baseline:
   - `pnpm exec prisma validate`
   - `pnpm exec prisma generate`
   - `pnpm type-check`
   - `pnpm test`

### Step 3: Add a date-only helper and migration

**Files (new)**: `src/lib/date-only.ts`, `src/lib/__tests__/date-only.test.ts`

**Files (edit)**: `prisma/schema.prisma`

**date-only helper**:
- Validate exact `YYYY-MM-DD` format; reject invalid calendar dates (`2026-02-31`).
- Convert to a UTC-midnight `Date` for Prisma (`new Date(`${date}T00:00:00.000Z`)`).
- Serialize a Prisma date back to `YYYY-MM-DD` (never a timestamp).
- Compare / inclusive-range helpers shared by all routes.

**schema change**:
```prisma
model PlannedMeal {
  // ...
  recipeId String? @map("recipe_id")
  recipe   Recipe? @relation(
    fields: [recipeId],
    references: [id],
    onDelete: SetNull
  )
  // add index
  @@index([mealPlanId, mealDate, mealType])
}
```

**migration**: non-destructive (`make_planned_meal_recipe_optional`):
- Drop the restrictive FK on `planned_meals.recipe_id`.
- Make `recipe_id` nullable.
- Recreate the FK with `ON DELETE SET NULL`.
- No DB reset. Existing rows are safe (all current rows have recipes).

### Step 4: Implement the meal-plan API

**Files**:
- `src/app/api/meal-plans/route.ts`
- `src/app/api/meal-plans/[id]/route.ts`
- `src/app/api/meal-plans/[id]/meals/route.ts`

**`GET /api/meal-plans`** — return all plans ordered by `startDate` (array).

**`POST /api/meal-plans`** — accept `name`, `startDate`, `endDate` (inclusive), optional
`notes`, optional `budgetLimit`. Reject empty names, invalid dates, and
`endDate < startDate`. Return `201` + the created plan.

**`GET /api/meal-plans/[id]`** — return one plan or `404`.

**`PUT /api/meal-plans/[id]`** — update plan metadata (name, notes, budget limit) only.
Return `200` + updated plan, or `404`.

**`DELETE /api/meal-plans/[id]`** — return bodyless `204`; rely on the schema cascade to
remove the plan's planned meals.

**`GET /api/meal-plans/[id]/meals?start=YYYY-MM-DD&end=YYYY-MM-DD`** —
- Require `start` and `end`, validate as a valid inclusive date-only range
  (and that `start <= end`), else `400`.
- Query `PlannedMeal` by `mealPlanId` and `mealDate` in `[start, end]`.
- Return planned meals ordered by `mealDate`, then `mealType`.
- Include a compact `RecipeSummary` using actual DB fields
  (`id`, `title`, `prepTimeMinutes`, `cookTimeMinutes`, `difficultyLevel`), or
  `recipe: null` for notes-only / deleted-recipe rows.
- Serialize `mealDate` as `YYYY-MM-DD`; `recipeId` may be `null`.

### Step 5: Implement planned-meal create and delete

**Files**:
- `src/app/api/planned-meals/route.ts`
- `src/app/api/planned-meals/[id]/route.ts`

**`POST /api/planned-meals`** — accept:
- `mealPlanId` (required)
- `recipeId` — explicit, may be `null`
- `mealDate` (`YYYY-MM-DD`)
- `mealType` (`MealType` enum)
- `servingsPlanned` (integer)
- `notes` (optional)

Validation:
- Meal plan exists, else `404`.
- `mealDate` is valid and within the plan's inclusive `[startDate, endDate]`, else `400`.
- If `recipeId` is set: recipe exists (else `404`), `servingsPlanned > 0`.
- If `recipeId` is null (notes-only): `servingsPlanned === 0` and non-empty `notes`.
- Return `201` with the created row; for notes-only rows `recipe: null`.

**`DELETE /api/planned-meals/[id]`** — return bodyless `204`, or `404` if missing.

No planned-meal `PUT` in issue #1 (deferred to issue #3).

### Step 6: Add TanStack Query hooks

**File**: `src/lib/queries/meal-plan-queries.ts`

- Types: `MealPlan`, `RecipeSummary`, `PlannedMeal`, `PlannedMealWithRecipe`
  (`{ ...PlannedMeal, recipe: RecipeSummary | null }`).
- Key factory with distinct prefixes for plans vs. meal-range queries:
  - `allPlans`, `planList`, `planDetail(id)`, and a meal-range prefix keyed by plan id.
- Hooks: `useMealPlans`, `useMealPlan`, `usePlannedMeals(planId, start, end)` (with
  `enabled` when both dates present), `useCreateMealPlan`, `useUpdateMealPlan`,
  `useDeleteMealPlan`, `useCreatePlannedMeal`, `useDeletePlannedMeal`.
- Carry `mealPlanId` in mutation variables.
- Invalidate the meal-query **prefix** for the plan after planned-meal create/delete
  (feed the whole meal-range prefix, not a reconstructed exact key).
- Invalidate `planList` / `planDetail` after meal-plan create/update/delete.

### Step 7: Add automated coverage

**Files**:
- `src/lib/__tests__/date-only.test.ts` — format/calendar validation, UTC-boundary,
  inclusive-range, rollover across month/year.
- `src/app/api/meal-plans/__tests__/route.test.ts`
- `src/app/api/meal-plans/[id]/__tests__/route.test.ts`
- `src/app/api/meal-plans/[id]/meals/__tests__/route.test.ts`
- `src/app/api/planned-meals/__tests__/route.test.ts`
- `src/app/api/planned-meals/[id]/__tests__/route.test.ts`
- `src/lib/queries/__tests__/meal-plan-queries.test.ts`

**Route test cases**:
- Valid and invalid plan dates (incl. `2026-02-31`, empty names, `end < start`).
- Inclusive date-range filtering for planned meals.
- Missing plan / recipe / planned-meal → `404`.
- Recipe-backed meal (positive servings, `recipe` present).
- Notes-only meal (`recipeId: null`, `servings 0`, non-empty `notes`).
- Same-slot duplicate rows allowed.
- Meal date outside plan range → `400`.
- Nullable nested `recipe` in responses.
- Cascade delete when a meal plan is removed.
- Bodyless `204` deletes.
- Recipe deletion → planned meal retained with `recipe: null`.
- Route tests mock `@/lib/prisma` per the existing pattern.

**Hook test cases** — request URL, HTTP method, body, and query invalidation.

### Step 8: Database-backed verification

1. Start PostgreSQL: `docker compose up -d postgres`.
2. Apply migrations (no reset): `pnpm exec prisma migrate status` then
   `pnpm db:migrate`.
3. Exercise the flow:
   - Create a meal plan (name + inclusive date range).
   - Create a recipe-backed planned meal.
   - Create a notes-only planned meal.
   - Retrieve both via date-range query.
   - Delete one planned meal.
   - Delete a recipe used by a planned meal and confirm the planned slot survives with
     `recipe: null`.
   - Delete the meal plan and confirm cascade removes its planned meals.
   - Restart PostgreSQL and confirm remaining data persists.
4. Final gates: `pnpm test`, `pnpm type-check`, `pnpm exec prisma validate`,
   `pnpm lint`, `pnpm build`.

## Success Criteria

### Implementation
- [ ] Research doc restored at `docs/plans/03-meal-planning-calendar/03-RESEARCH.md`.
- [ ] Baseline repaired (single `RecipeImage`, single adapter impl); `prisma validate`
      and `type-check` pass before meal-plan work.
- [ ] `PlannedMeal.recipeId` optional + `ON DELETE SET NULL` migration applied cleanly.
- [ ] Meal-plan CRUD + planned-meal create/delete routes implemented with Zod validation.
- [ ] Recipe deletion leaves planned slots intact (`recipe: null` in GET).
- [ ] Query hooks + correct prefix invalidation implemented.

### Testing
- [ ] All route, hook, and date-util tests pass (`pnpm test`).
- [ ] `pnpm type-check`, `pnpm lint`, `pnpm build`, `pnpm exec prisma validate` pass.
- [ ] DB-backed flow verified against live PostgreSQL (incl. persistence across restart).

## Dependencies

- **Blocked by**: the two baseline repairs (Step 2) — schema validation, migration,
  and type-check cannot pass until resolved. These are pre-existing breaks, not caused
  by issue #1, but they block implementation.
- **Blocker**: local PostgreSQL must be running for migration + verification (Step 8).
- **Prerequisite**: none beyond the library already present (`date-fns`, TanStack Query,
  Zod, shadcn-style UI primitives).

## Risks / Notes

- The historical research/plan contains stale field names and route names; do not copy
  verbatim. Follow the contract decisions section instead and verify current signatures
  (e.g. `Recipe.title`, `recipe-queries.ts` search param `q`).
- Do not reset the database during migration — existing recipe data must be preserved.
- `SNACK` remains an accepted `MealType` by the API; whether the calendar UI exposes it
  is a UI-phase (issue #3/#4) decision.
