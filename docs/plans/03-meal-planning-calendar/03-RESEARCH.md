# Phase 3 Research: Meal Planning Calendar

**Generated:** 2026-09-01
**Phase:** 3 - Meal Planning Calendar
**Requirements:** MEAL-01 through MEAL-09
**Status:** Restored + corrected for current repo (issue #1, Plan: Meal Planning Database & API Foundation)

> **Historical source:** this doc was recovered from commit `d0733b2` at
> `.planning/phases/03-meal-planning-calendar/03-RESEARCH.md`. The field and route
> names in the original were stale; the current version reflects the real codebase
> and the resolved contract decisions below. Do not trust the old names verbatim.

## Scope (Issue #1)

Plan #1 (Database & API Foundation) only: schema repair, migration, meal-plan +
planned-meal REST APIs, TanStack Query hooks, and tests. Calendar UI (Plans #2–#4)
is out of scope for issue #1.

## Standard Stack

### Calendar/Date Utilities
- **date-fns** (already installed, v2.30.0) — Date manipulation, week calculations,
  formatting. Key functions: `startOfWeek`, `endOfWeek`, `addWeeks`, `subWeeks`,
  `eachDayOfInterval`, `format`, `isToday`, `isSameDay`.
- **`src/lib/date-only.ts`** (new for issue #1) — date-only (YYYY-MM-DD) helpers:
  `isValidDateOnly`, `toDateOnly` (UTC-midnight), `serializeDateOnly`, `isInRange`,
  `compareDateOnly`. All plan/meal dates travel over the wire as `YYYY-MM-DD` only.

### UI Components (Already Available)
- **Radix UI primitives** via shadcn/ui pattern.
- **lucide-react** for icons.
- `cn()` helper from `@/lib/utils`.

### State Management
- **TanStack Query** for server state.
- Query hooks in `src/lib/queries/meal-plan-queries.ts` (new).
- Hierarchical key factory with **distinct prefixes** for plans vs. meal-range queries.
- Mutations invalidate the relevant query prefix on success.

### Database Layer (Existing Models)
- **MealPlan** — container for weekly/period plans.
  - Fields: `id`, `name`, `startDate`, `endDate`, `budgetLimit`, `notes`, timestamps.
  - Real field names: `startDate`/`endDate` (not `start`/`end`), `budgetLimit`.
  - Relations: `plannedMeals[]`, `shoppingLists[]`.
- **PlannedMeal** — one row per recipe/slot assignment (multiple rows may share a slot).
  - Fields: `id`, `mealPlanId`, `recipeId`, `mealDate`, `mealType`, `servingsPlanned`, `notes`.
  - **`recipeId` is now optional (nullable)** after the issue #1 migration; null rows are
    notes-only slots. `recipe` relation is optional with `onDelete: SetNull`.
  - `mealType` enum: `BREAKFAST`, `LUNCH`, `DINNER`, `SNACK`.
  - Composite index `(mealPlanId, mealDate, mealType)` added for range queries.

## Contract Decisions (resolved for issue #1)

These resolve ambiguities in the historical plan and are authoritative for implementation:

- **Date wire format**: all plan and meal dates use `YYYY-MM-DD` (date-only, no time).
  Request values convert to UTC-midnight `Date` for Prisma; responses serialize back to
  `YYYY-MM-DD` (never a timestamp).
- **Ranges are inclusive**: `startDate` and `endDate` both included. A one-week plan is
  `startDate..addDays(startDate, 6)`; a four-week view is `startDate..addDays(startDate, 27)`.
- **`MealType`**: the API accepts the full enum (breakfast, lunch, dinner, snack).
  Nothing in issue #1 restricts snack; the calendar UI may choose not to expose it.
- **Notes-only planned meal**: a `PlannedMeal` row with `recipeId = null`, non-empty
  `notes`, and `servingsPlanned = 0`.
- **Recipe-backed planned meal**: `recipeId` set, `servingsPlanned > 0`, `notes` optional.
- **Multiple recipes per slot**: more than one row may share `(mealPlanId, mealDate,
  mealType)`. There is no uniqueness constraint; duplicates are allowed and not deduplicated.
- **Recipe deletion**: `PlannedMeal.recipe` uses `onDelete: SetNull`. Deleting a recipe
  leaves the planned slot intact with `recipeId = null`; the GET response then returns
  `recipe: null` for those rows. Recipe deletion is never blocked by meal planning.
- **Update semantics**: `PUT /api/meal-plans/[id]` updates plan metadata only
  (name, notes, budget limit) — not the date range.
- **Status codes**: `201` create, `200` success, `400` malformed/invalid data,
  `404` missing resource, `204` bodyless delete.
- **List response**: `GET /api/meal-plans` returns an array of `MealPlan`.
- **No planned-meal `PUT` in issue #1**: editing a planned meal is left for issue #3.

## Canonical API Routes (issue #1)

| Method & Path | Purpose |
|---|---|
| `GET /api/meal-plans` | List all plans ordered by `startDate` (array) |
| `POST /api/meal-plans` | Create plan (`name`, `startDate`, `endDate`, optional `notes`, `budgetLimit`) → `201` |
| `GET /api/meal-plans/[id]` | Get one plan or `404` |
| `PUT /api/meal-plans/[id]` | Update metadata only → `200` |
| `DELETE /api/meal-plans/[id]` | Delete plan (cascade removes its meals) → `204` |
| `GET /api/meal-plans/[id]/meals?start=YYYY-MM-DD&end=YYYY-MM-DD` | Planned meals in inclusive range |
| `POST /api/planned-meals` | Create a planned meal → `201` |
| `DELETE /api/planned-meals/[id]` | Remove a planned meal → `204` |

`PUT /api/planned-meals/[id]` is deferred to issue #3 (per contract decisions).

## Architecture Patterns

### Calendar Data Structure

**Week-based calendar (4 weeks visible):**
```typescript
interface CalendarWeek {
  weekNumber: number
  days: CalendarDay[]
}

interface CalendarDay {
  date: string // YYYY-MM-DD
  isToday: boolean
  meals: {
    BREAKFAST: MealSlot
    LUNCH: MealSlot
    DINNER: MealSlot
  }
}

interface MealSlot {
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER'
  plannedMeals: PlannedMealWithRecipe[] // Multiple recipes allowed
  isEmpty: boolean
}

interface PlannedMealWithRecipe extends PlannedMeal {
  recipe: RecipeSummary | null  // null for notes-only / deleted-recipe rows
}

interface RecipeSummary {
  id: string
  title: string
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  difficultyLevel: string
}
```

### Data Loading Strategy

**Single query for the visible calendar period:** load all `PlannedMeal` rows for the
inclusive `[start, end]` window with a compact `RecipeSummary` join. The API returns
`PlannedMealWithRecipe[]`; the frontend transforms to `CalendarDay[]`.

### Recipe Assignment Flow (future plans)

1. Click slot → open recipe picker modal (reuse existing search UI).
2. Select recipes → multi-select chips.
3. Confirm → create one `PlannedMeal` per recipe (or a notes-only row for freeform).
4. Invalidate the meal-range query prefix → calendar refetches.

### Multiple Recipes Per Slot

Same-slot duplicates are represented as multiple `PlannedMeal` rows sharing
`(mealPlanId, mealDate, mealType)`. No dedup.

### Freeform Notes Handling

**Chosen approach (A): nullable `recipeId` PlannedMeal** — a notes-only slot is simply:
```json
{ "mealPlanId": "plan_abc", "recipeId": null, "mealDate": "2026-06-20",
  "mealType": "LUNCH", "servingsPlanned": 0, "notes": "Order takeout" }
```
This fits the existing schema with a minimal change and keeps all slot content in one query.
(The alternative `SlotNote` model was considered and rejected.)

## Common Pitfalls

### Date Comparison Issues
- Avoid `===` on `Date` objects (always false); compare `YYYY-MM-DD` strings or use
  `date-fns` `isSameDay()`.

### Time Zone Handling
- Prisma fields are `@db.Date` (date-only). Use `src/lib/date-only.ts` to convert
  `YYYY-MM-DD` ↔ UTC-midnight `Date`, preventing off-by-one day errors.

### Stale Calendar Data
- Planned-meal mutations must invalidate the **meal-range query prefix** for the plan on
  success, so any open date window refetches:
  ```typescript
  onSuccess: (_, variables) => {
    queryClient.invalidateQueries({ queryKey: mealPlanKeys.meals(variables.mealPlanId) })
  }
  ```

### Empty Slot UX (future plan)
- Show meal-type label + "+" icon on hover so empty slots read as interactive.

### Recipe Modal Performance (future plan)
- Reuse the existing search/filter from `src/app/recipes/page.tsx` (pagination + `q` search).

## Don't Hand-Roll

**DO NOT build from scratch:**
- ❌ Custom date utilities beyond `date-only.ts` — use date-fns for calendar math.
- ❌ Calendar grid layout library — use CSS Grid + date-fns date generation.
- ❌ Recipe search UI — reuse existing `RecipeList` + filters.
- ❌ Modal/Popover primitives — use existing Radix UI components.

**DO build custom:**
- `CalendarGrid` layout component (week grid with meal slots).
- `MealSlot` component (displays recipes + notes for one slot).
- `RecipePickerModal` composition (wraps existing search UI).

## Validation Architecture

### Testing Strategy

**Unit tests (issue #1):**
- Date-only helper: format/calendar validation, UTC-boundary, inclusive-range, rollover.
- Route tests: valid/invalid dates, inclusive range filtering, `404`/`400` cases,
  recipes vs notes-only rows, duplicate slots, cascade delete.
- Query-hook tests: request URL, method, body, and prefix invalidation.

**Future integration/E2E:** recipe assignment flow, week navigation, multi-recipe slot.

### Validation Checkpoints (issue #1)

1. `pnpm exec prisma validate` and `pnpm type-check` green after baseline repair.
2. `PlannedMeal.recipeId` nullable + `ON DELETE SET NULL` migration applied.
3. Meal-plan CRUD + planned-meal create/delete routes with Zod validation.
4. Recipe deletion leaves planned slots intact (`recipe: null` in GET).
5. Query hooks + correct prefix invalidation.
6. All route, hook, and date-util tests pass (`pnpm test`).
7. DB-backed flow verified against live PostgreSQL (incl. persistence across restart).

## Known Integration Points

### Existing Code to Reuse
- `src/app/recipes/page.tsx` — recipe search/filter UI.
- `src/lib/queries/recipe-queries.ts` — query hook pattern.
- `src/app/api/recipes/route.ts` and `src/app/api/recipes/[id]/route.ts` — REST + Zod + Prisma pattern.
- `src/components/ui/` — all UI primitives.
- `src/lib/prisma.ts` — database singleton.

### Files Created for Issue #1
- `src/lib/date-only.ts` + `src/lib/__tests__/date-only.test.ts`
- `src/app/api/meal-plans/route.ts`
- `src/app/api/meal-plans/[id]/route.ts`
- `src/app/api/meal-plans/[id]/meals/route.ts`
- `src/app/api/planned-meals/route.ts`
- `src/app/api/planned-meals/[id]/route.ts`
- `src/lib/queries/meal-plan-queries.ts` + `__tests__/meal-plan-queries.test.ts`
- Route tests under each `__tests__/` directory
- Migration `20260901000000_make_planned_meal_recipe_optional`

### Files Planned for Later (out of scope for issue #1)
- `src/app/meal-plans/page.tsx` — main calendar page.
- `src/components/meal-plans/calendar-grid.tsx` — calendar layout.
- `src/components/meal-plans/meal-slot.tsx` — slot component.
- `src/components/meal-plans/recipe-picker-modal.tsx` — assignment modal.
- `src/components/meal-plans/recipe-popover.tsx` — preview card.
- `src/components/meal-plans/meal-plan-selector.tsx` — dropdown.

## Clarifying Questions Answered by Context

**Q: How many weeks visible?** A: 4 weeks (D-02).
**Q: Week start day?** A: Monday (D-01, Mon–Sun columns).
**Q: Which meal types?** A: Breakfast, Lunch, Dinner in the UI (D-03); the API accepts
`SNACK` too (issue #1 contract).
**Q: Can a slot have multiple recipes?** A: Yes (multiple `PlannedMeal` rows share the slot).

---

*Research restored and corrected for Phase 3: Meal Planning Calendar — Issue #1 (DB & API Foundation).*
