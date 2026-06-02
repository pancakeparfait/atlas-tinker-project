# Phase 3: Meal Planning Calendar - Context

**Gathered:** 2026-06-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual meal planning across multiple weeks. Users see a multi-week calendar with breakfast/lunch/dinner slots per day, assign one or more recipes to any slot, add freeform notes, and view recipe details directly from the calendar. Meal plan data persists in the database. This phase covers all MEAL-01 through MEAL-09 requirements — recipe CRUD and shopping list generation are separate phases.
</domain>

<decisions>
## Implementation Decisions

### Calendar Layout
- **D-01:** Week grid layout — Mon-Sun columns with rows for each week
- **D-02:** 4 weeks visible at once (roughly one month)
- **D-03:** Each day cell shows stacked meal slot rows (Breakfast, Lunch, Dinner) with color-coded meal type indicators (BREAKFAST=amber, LUNCH=green, DINNER=blue)
- **D-04:** Prev/Next arrows + "Today" button for week navigation
- **D-05:** Current day highlighted with blue border/tint
- **D-06:** Empty/unplanned slots show minimal meal type label with "+" on hover

### Recipe Assignment UX
- **D-07:** Click a meal slot opens a modal with recipe search and list (reuses existing recipe search/filter system from `src/app/recipes/page.tsx`)
- **D-08:** Multiple recipes can be selected in a single modal session — selected recipes shown as chips before confirming
- **D-09:** Freeform notes added via inline text input below recipes in the slot ("Add a note..." placeholder, press Enter to save)
- **D-10:** Hover reveals X button to remove a recipe or note from a slot, with confirmation dialog before deletion

### Meal Plan Management
- **D-11:** Auto-create the first meal plan on initial visit to `/meal-plans` (named "Week of [date]")
- **D-12:** Multiple named meal plans supported
- **D-13:** Dropdown selector at top of calendar view to switch between plans
- **D-14:** Plan-level actions: rename, archive, delete (each with confirmation)

### Recipe Preview from Calendar
- **D-15:** Clicking a recipe name in a meal slot opens a popover card with full recipe summary
- **D-16:** Popover shows: recipe title, primary image thumbnail, prep/cook time, difficulty, servings, truncated ingredient list, description excerpt
- **D-17:** "View full recipe" link at bottom of popover navigates to `/recipes/[id]`

### OpenCode's Discretion
- Exact popover styling, size, and animation
- Loading skeleton design for calendar and modals
- Error state handling for failed API calls
- Confirmation dialog visual design
- Exact color values for meal type indicators

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data model
- `prisma/schema.prisma` — MealPlan and PlannedMeal models (lines 95-126), ShoppingList model (lines 128-142)

### Existing patterns to extend
- `src/app/recipes/page.tsx` — Recipe search/filter UI pattern to reuse in the assignment modal
- `src/lib/queries/recipe-queries.ts` — TanStack Query hook pattern, Recipe types, query key factory
- `src/components/layout/sidebar.tsx:17` — Navigation link already routed to `/meal-plans` with Calendar icon
- `src/app/layout.tsx` — App shell layout (flex h-screen with Sidebar + Header + main)
- `src/components/recipes/recipe-form-schema.ts` — MEAL_CATEGORIES enum for meal type color mapping

### API route pattern
- `src/app/api/recipes/route.ts` — Established CRUD API route pattern (GET list, POST create)
- `src/app/api/recipes/[id]/route.ts` — Dynamic route with params await pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useRecipes` hook + full recipe search/filter UI pattern — can be reused directly in the recipe assignment modal
- `Card` component (`src/components/ui/card`) — suitable for calendar cells and popover
- `Badge` component (`src/components/ui/badge`) — color-coded meal type indicators
- `Input` component — for note text input and recipe search
- `date-fns` (already installed) — week calculation, date formatting, date range generation
- `Select` component — for meal plan dropdown selector

### Established Patterns
- TanStack Query hooks with hierarchical key factory (`src/lib/queries/`)
- API routes follow Next.js 16 App Router with `await params` pattern
- Prisma schema changes via migration (`pnpm db:migrate`)
- Server Components by default, `'use client'` for interactive calendar components
- `cn()` utility for conditional Tailwind classes

### Integration Points
- **New page:** `src/app/meal-plans/page.tsx` — Client Component (calendar is interactive)
- **New API:** `src/app/api/meal-plans/route.ts` — GET (list plans), POST (create plan)
- **New API:** `src/app/api/meal-plans/[id]/route.ts` — GET (plan with slots), PUT (update), DELETE
- **New API:** `src/app/api/meal-planned-meals/route.ts` — POST (assign recipe to slot), DELETE (remove)
- **New query hooks:** `src/lib/queries/meal-plan-queries.ts` — following recipe-queries.ts pattern
- **New components:** `src/components/meal-plans/` — calendar-view, meal-slot, recipe-picker-modal, recipe-popover, meal-plan-selector

### Data Model Notes
- `MealPlan` and `PlannedMeal` models already exist in Prisma schema — no model creation needed, only potential schema adjustments
- `PlannedMeal` has single `recipeId` — multiple recipes per slot uses multiple `PlannedMeal` records (same `mealPlanId` + `mealDate` + `mealType`)
- `PlannedMeal` already has `notes` field for per-assignment notes — slot-level notes (not tied to a recipe) might need a null `recipeId` approach or a separate model
- The sidebar already has "Meal Plans" → `/meal-plans` navigation with Calendar icon — no navigation change needed
- `MealType` enum already exists (BREAKFAST, LUNCH, DINNER, SNACK)

</code_context>

<specifics>
## Specific Ideas

- Calendar should feel like a familiar week-at-a-glance planner — users should immediately understand how to read it
- The assignment modal should make it fast to find and add recipes — search-first, with the ability to browse categories
- Notes like "Leftovers", "Order takeout", "Eating out" are the primary use cases for freeform slot notes
- Confirmation dialogs prevent accidental data loss (especially for deleting planned meals)
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope
</deferred>

---

*Phase: 03-meal-planning-calendar*
*Context gathered: 2026-06-02*
