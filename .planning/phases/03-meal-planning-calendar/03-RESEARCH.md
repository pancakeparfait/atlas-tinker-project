# Phase 3 Research: Meal Planning Calendar

**Generated:** 2026-06-16
**Phase:** 3 - Meal Planning Calendar
**Requirements:** MEAL-01 through MEAL-09

## Standard Stack

### Calendar/Date Utilities
- **date-fns** (already installed, v2.30.0) - Date manipulation, week calculations, formatting
  - Key functions: `startOfWeek`, `endOfWeek`, `addWeeks`, `subWeeks`, `eachDayOfInterval`, `format`, `isToday`, `isSameDay`
  - Week boundaries: Use `weekStartsOn: 1` (Monday start) for Mon-Sun layout
  - Date comparison utilities for highlighting current day

### UI Components (Already Available)
- **Radix UI primitives** via shadcn/ui pattern
  - Dialog/Modal for recipe picker
  - Popover for recipe preview cards
  - Select dropdown for meal plan selector
  - Card for calendar cells
  - Badge for meal type indicators
  - Button for navigation controls
  - Input for freeform notes

### State Management
- **TanStack Query** for server state (meal plans, planned meals, recipes)
  - Query hooks pattern from `src/lib/queries/recipe-queries.ts`
  - Hierarchical key factory: `['meal-plans']`, `['meal-plans', 'list']`, `['meal-plans', 'detail', id]`
  - Mutations auto-invalidate related queries

### Database Layer (Existing Models)
- **MealPlan** - Container for weekly/period plans
  - Fields: id, name, startDate, endDate, budgetLimit, notes, timestamps
  - Relations: plannedMeals[], shoppingLists[]
  
- **PlannedMeal** - Individual recipe assignment to a meal slot
  - Fields: id, mealPlanId, recipeId, mealDate, mealType, servingsPlanned, notes
  - **Critical:** Single recipeId per record - multiple recipes per slot = multiple PlannedMeal records
  - mealType enum: BREAKFAST, LUNCH, DINNER, SNACK
  - Composite key concept: (mealPlanId, mealDate, mealType) defines a "slot"

## Architecture Patterns

### Calendar Data Structure

**Week-based calendar (4 weeks visible):**
```typescript
// Calendar state
interface CalendarWeek {
  weekNumber: number
  days: CalendarDay[]
}

interface CalendarDay {
  date: Date
  isToday: boolean
  meals: {
    BREAKFAST: MealSlot
    LUNCH: MealSlot
    DINNER: MealSlot
  }
}

interface MealSlot {
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER'
  plannedMeals: PlannedMealWithRecipe[]  // Multiple recipes allowed
  isEmpty: boolean
}

interface PlannedMealWithRecipe extends PlannedMeal {
  recipe: Pick<Recipe, 'id' | 'name' | 'prepTime' | 'cookTime' | 'difficulty'>
}
```

### Data Loading Strategy

**Single query for visible calendar period:**
```typescript
// Load all PlannedMeals for the 4-week window with recipe details
useQuery({
  queryKey: ['meal-plans', planId, 'meals', startDate, endDate],
  queryFn: () => fetchPlannedMeals(planId, startDate, endDate)
})

// API returns PlannedMeals with recipe JOIN
// Frontend transforms to CalendarDay[] structure
```

### Recipe Assignment Flow

1. **Click slot** → Open modal with recipe search/filter (reuse existing UI from `src/app/recipes/page.tsx`)
2. **Select recipes** → Multi-select with chip display
3. **Confirm** → Create multiple PlannedMeal records (one per recipe)
4. **Invalidate query** → Calendar refetches and updates

### Multiple Recipes Per Slot

**Database pattern:**
```sql
-- Slot: 2026-06-20, LUNCH
INSERT INTO planned_meals (meal_plan_id, recipe_id, meal_date, meal_type, servings_planned)
VALUES 
  ('plan_abc', 'recipe_1', '2026-06-20', 'LUNCH', 4),
  ('plan_abc', 'recipe_2', '2026-06-20', 'LUNCH', 4);
```

**Frontend rendering:**
```tsx
{slot.plannedMeals.map(pm => (
  <RecipeChip 
    key={pm.id}
    recipe={pm.recipe}
    onRemove={() => deletePlannedMeal(pm.id)}
    onClick={() => showRecipePopover(pm.recipe)}
  />
))}
```

### Freeform Notes Handling

**Two approaches (Context specifies slot-level notes):**

**Approach A: Null recipeId PlannedMeal** (recommended - fits existing schema)
```typescript
// Create PlannedMeal with recipeId=null for notes-only
{
  mealPlanId: 'plan_abc',
  recipeId: null,  // Signals this is a note
  mealDate: '2026-06-20',
  mealType: 'LUNCH',
  servingsPlanned: 0,
  notes: 'Order takeout'
}
```

**Schema adjustment needed:**
```prisma
model PlannedMeal {
  recipeId String? @map("recipe_id")  // Make nullable
  recipe   Recipe? @relation(...)      // Make optional
}
```

**Approach B: Separate SlotNote model** (cleaner separation)
```prisma
model SlotNote {
  id         String   @id @default(cuid())
  mealPlanId String
  mealDate   DateTime @db.Date
  mealType   MealType
  notes      String
  mealPlan   MealPlan @relation(...)
}
```

**Recommendation:** Approach A (nullable recipeId) - requires minimal schema change, keeps all slot content in one query.

## Common Pitfalls

### Date Comparison Issues
- **Pitfall:** Using `===` to compare Date objects (always false)
- **Solution:** Use date-fns `isSameDay()` or compare ISO strings
- **Example:**
  ```typescript
  // ❌ Wrong
  if (slotDate === today) { ... }
  
  // ✅ Correct
  if (isSameDay(slotDate, today)) { ... }
  ```

### Time Zone Handling
- **Pitfall:** Date objects include time, causing off-by-one day errors
- **Solution:** Use `@db.Date` in Prisma (date-only), strip time on frontend
- **Pattern:**
  ```typescript
  // Store as date-only string
  const dateOnly = format(date, 'yyyy-MM-dd')
  // Convert back for display
  const displayDate = parseISO(dateOnly)
  ```

### Stale Calendar Data
- **Pitfall:** Creating PlannedMeal doesn't update calendar
- **Solution:** Mutation invalidates query on success
  ```typescript
  onSuccess: () => {
    queryClient.invalidateQueries(['meal-plans', planId, 'meals'])
  }
  ```

### Empty Slot UX
- **Pitfall:** Empty slots show nothing, user doesn't know they're interactive
- **Solution:** Show meal type label + "+" icon on hover
- **Context decision D-06:** Minimal meal type label with hover affordance

### Recipe Modal Performance
- **Pitfall:** Loading full recipe list in modal (100+ recipes)
- **Solution:** Reuse existing search/filter from `src/app/recipes/page.tsx` - already optimized with pagination/search

## Don't Hand-Roll

**DO NOT build from scratch:**
- ❌ Custom date utility functions - use date-fns
- ❌ Calendar grid layout library - use CSS Grid + date-fns date generation
- ❌ Recipe search UI - reuse existing `RecipeList` + filters
- ❌ Modal/Popover primitives - use existing Radix UI components

**DO build custom:**
- ✅ CalendarGrid layout component (week grid with meal slots)
- ✅ MealSlot component (displays recipes + notes for one slot)
- ✅ RecipePickerModal composition (wraps existing search UI)
- ✅ Meal plan selector dropdown

## Validation Architecture

### Testing Strategy

**Unit tests:**
- Date calculation functions (week boundaries, date ranges)
- CalendarDay data transformation (PlannedMeal[] → CalendarDay[])
- Meal slot grouping logic (group by mealDate + mealType)

**Integration tests:**
- Recipe assignment flow (click → modal → select → save → update)
- Navigation between weeks (prev/next/today)
- Multi-recipe slot rendering

**E2E tests (suggested):**
- Complete user flow: Create plan → Navigate → Assign recipe → Add note → Verify persistence
- Recipe preview from calendar

### Validation Checkpoints

1. **Calendar display** - All 4 weeks visible, correct date headers
2. **Navigation** - Prev/Next arrows shift weeks correctly
3. **Slot interaction** - Click opens modal, closes on confirm/cancel
4. **Multi-recipe** - Multiple recipes display in single slot
5. **Notes** - Freeform text saves and displays correctly
6. **Persistence** - Reload page shows same meal plan
7. **Recipe preview** - Popover shows correct recipe details

## API Routes to Create

### Meal Plans Management
- `GET /api/meal-plans` - List all plans
- `POST /api/meal-plans` - Create new plan (auto-create on first visit)
- `GET /api/meal-plans/[id]` - Get plan details
- `PUT /api/meal-plans/[id]` - Update plan (rename)
- `DELETE /api/meal-plans/[id]` - Delete plan

### Planned Meals Management
- `GET /api/meal-plans/[id]/meals?start=YYYY-MM-DD&end=YYYY-MM-DD` - Get meals for date range
- `POST /api/planned-meals` - Create planned meal (assign recipe to slot)
- `DELETE /api/planned-meals/[id]` - Remove planned meal
- `PUT /api/planned-meals/[id]` - Update notes or servings

**Alternative structure (nested routes):**
- `POST /api/meal-plans/[id]/meals` - Create planned meal
- `DELETE /api/meal-plans/[planId]/meals/[mealId]` - Remove planned meal

**Recommendation:** Separate `/api/planned-meals` routes - cleaner, follows existing recipe pattern.

## Implementation Sequence Recommendation

**Plan 1: Database & API Foundation**
1. Adjust PlannedMeal schema (nullable recipeId)
2. Run Prisma migration
3. Create meal-plan API routes (CRUD)
4. Create planned-meal API routes (CRUD)
5. Create TanStack Query hooks

**Plan 2: Calendar UI Core**
1. Create MealPlanPage component (`/meal-plans`)
2. Build CalendarGrid component (week layout)
3. Build MealSlot component (displays recipes/notes)
4. Build WeekNavigation component (prev/next/today)
5. Wire up date calculations with date-fns

**Plan 3: Recipe Assignment**
1. Build RecipePickerModal (wraps existing search UI)
2. Implement multi-select recipe chips
3. Create mutation for assigning recipes
4. Add freeform note input to slots
5. Implement remove recipe/note actions

**Plan 4: Recipe Preview & Polish**
1. Build recipe popover card (summary view)
2. Add meal plan selector dropdown
3. Implement current day highlighting
4. Add loading states and error handling
5. Style meal type indicators (color coding)

## Known Integration Points

### Existing Code to Reuse
- `src/app/recipes/page.tsx` - Recipe search/filter UI
- `src/lib/queries/recipe-queries.ts` - Query hook pattern
- `src/components/ui/` - All UI primitives
- `src/lib/prisma.ts` - Database singleton

### Files to Create
- `src/app/meal-plans/page.tsx` - Main calendar page
- `src/lib/queries/meal-plan-queries.ts` - Query hooks
- `src/components/meal-plans/calendar-grid.tsx` - Calendar layout
- `src/components/meal-plans/meal-slot.tsx` - Slot component
- `src/components/meal-plans/recipe-picker-modal.tsx` - Assignment modal
- `src/components/meal-plans/recipe-popover.tsx` - Preview card
- `src/components/meal-plans/meal-plan-selector.tsx` - Dropdown
- `src/app/api/meal-plans/route.ts` - List/Create
- `src/app/api/meal-plans/[id]/route.ts` - Get/Update/Delete
- `src/app/api/meal-plans/[id]/meals/route.ts` - Get meals for range
- `src/app/api/planned-meals/route.ts` - Create
- `src/app/api/planned-meals/[id]/route.ts` - Delete/Update

## Clarifying Questions Answered by Context

**Q: How many weeks visible?**
A: 4 weeks (D-02)

**Q: Week start day?**
A: Monday (D-01 specifies Mon-Sun columns)

**Q: Which meal types?**
A: Breakfast, Lunch, Dinner (D-03) - SNACK excluded for this phase

**Q: Can a slot have multiple recipes?**
A: Yes (D-08 allows multi-select)

**Q: Where do notes go?**
A: Inline below recipes in the slot (D-09)

**Q: Recipe preview interaction?**
A: Click recipe name → popover (D-15), not navigate away

**Q: Multiple meal plans?**
A: Yes, with dropdown selector (D-12, D-13)

**Q: Auto-create first plan?**
A: Yes, on initial visit (D-11)

---

*Research complete for Phase 3: Meal Planning Calendar*
*Ready for planning*
