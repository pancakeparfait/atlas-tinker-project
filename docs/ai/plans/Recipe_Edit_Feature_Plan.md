# Recipe Edit Feature Implementation Plan

**Date**: February 4, 2026  
**Status**: Ready for Implementation  
**Complexity**: Low (85% complete - routing wiring only)

## Overview

Enable users to edit existing recipes. All backend infrastructure (API endpoint, mutation hooks, form logic) is already fully implemented. This plan focuses on adding the edit page route and enabling navigation.

## Current State

### ✅ What Exists

1. **Update API Endpoint** - `src/app/api/recipes/[id]/route.ts`
   - PUT method with Zod validation
   - Transaction-based update (recipe + ingredients)
   - Proper instruction format transformation
   - Follows Next.js 16 patterns (awaits params)

2. **Update Mutation Hook** - `src/lib/queries/recipe-queries.ts`
   - `useUpdateRecipe()` fully implemented
   - Proper query invalidation (detail + list)
   - Type-safe signature

3. **Form Edit Support** - `src/components/recipes/recipe-form.tsx`
   - Accepts optional `recipe` prop
   - Pre-populates form with existing data
   - Conditional submission logic (create vs update)
   - Dynamic button text ("Update Recipe" vs "Save Recipe")
   - Hides import section in edit mode

4. **Delete Functionality** - Working
   - Delete button on detail page functional

### ❌ What's Missing

1. **Edit Page Route** - `src/app/recipes/[id]/edit/page.tsx` (does not exist)
2. **Edit Button Navigation** - Currently disabled with "Coming soon" tooltip

## Implementation Steps

### Step 1: Create Edit Page Route

**File**: `src/app/recipes/[id]/edit/page.tsx`

**Requirements**:
- Mark as `'use client'` (uses React hooks)
- Extract recipe `id` from `useParams()` hook
- Fetch recipe using `useRecipe(id)` hook
- Handle three states:
  - **Loading**: Show skeleton or spinner
  - **Error**: Display error message or redirect to 404
  - **Success**: Render `RecipeForm` with recipe data
- On successful update:
  - Navigate to detail page: `router.push(/recipes/${id})`
  - Success message handled by form component

**Technical Notes**:
- Follow pattern from `src/app/recipes/new/page.tsx` for layout structure
- Use existing UI components (Card, Spinner, etc.)
- TanStack Query handles caching (instant render if recipe cached)

### Step 2: Enable Edit Button

**File**: `src/app/recipes/[id]/page.tsx` (lines 158-166)

**Changes**:
- Remove `disabled` prop from Edit Button
- Remove "Coming soon" `title` prop  
- Add `onClick` handler: `() => router.push(/recipes/${recipeId}/edit)`
- Ensure `useRouter` from `next/navigation` is imported (page already client-side)

**Current Code**:
```tsx
<Button disabled title="Coming soon">
  <Pencil className="w-4 h-4" />
  Edit Recipe
</Button>
```

**Updated Code**:
```tsx
<Button onClick={() => router.push(`/recipes/${recipeId}/edit`)}>
  <Pencil className="w-4 h-4" />
  Edit Recipe
</Button>
```

### Step 3: Write Tests

**File**: `src/app/recipes/[id]/edit/__tests__/page.test.tsx`

**Test Pattern**: Follow existing test structure from `src/app/recipes/[id]/__tests__/page.test.tsx`

**Setup Requirements**:
- Mock `next/navigation` hooks (`useRouter`, `useParams`)
- Mock React Query hooks (`useRecipe`, `useUpdateRecipe`)
- Mock Next.js Image component
- Create test fixtures for recipe data (complete, minimal, empty)

**Test Suites**:

#### 1. **Loading States**
- Shows loading skeleton while fetching recipe
- Displays loading message in form area
- Disables form submission during load

#### 2. **Error States**
- Displays error message when recipe fetch fails
- Shows "Recipe not found" for non-existent IDs
- Provides navigation back to recipes list
- Handles error gracefully (doesn't crash)

#### 3. **Form Pre-population**
- Populates all text fields (title, description, cuisine, source)
- Sets correct category and difficulty selectors
- Populates numeric fields (servings, prep time, cook time)
- Pre-fills rating field
- Loads existing ingredients with quantities, units, prep notes
- Loads existing instructions in correct order
- Sets draft status checkbox correctly
- Loads tags

#### 4. **Update Mutation**
- Calls `useUpdateRecipe` hook on form submission
- Passes correct recipe ID and updated data
- Navigates to detail page on success
- Shows error message on API failure
- Disables submit button while mutation pending

#### 5. **Form Validation**
- Shows validation error for empty title (required)
- Shows error for invalid servings (must be positive)
- Shows error for invalid times (must be non-negative)
- Prevents submission when validation fails

#### 6. **User Interactions**
- Can edit title and description
- Can change category and difficulty dropdowns
- Can modify ingredient quantities and names
- Can add new ingredients
- Can remove ingredients
- Can reorder instructions
- Can add new instructions
- Can remove instructions
- Can toggle draft status
- Cancel button navigates back without saving

#### 7. **Edge Cases**
- Handles recipe with no ingredients (empty message → can add)
- Handles recipe with no instructions (empty message → can add)
- Handles recipe with HTML entities (decodes properly)
- Import section is hidden (not shown in edit mode)

**Mock Data Examples**:
```typescript
const mockRecipeComplete = {
  id: 'recipe-1',
  title: 'Chocolate Chip Cookies',
  description: 'Delicious homemade cookies',
  // ... full field set
  ingredients: [/* ... */],
  instructions: ['Step 1', 'Step 2'],
};

const mockRecipeMinimal = {
  id: 'recipe-2',
  title: 'Simple Recipe',
  description: null,
  // ... minimal fields
  ingredients: [],
  instructions: [],
};
```

**Key Assertions**:
- Form renders with pre-filled values
- Submit button shows "Update Recipe" text
- Update mutation called with correct arguments
- Navigation occurs after successful update
- Error states don't crash the component

### Step 4: Verification Testing (Manual)

**Test Cases**:

1. **Navigation Flow**
   - Click "Edit Recipe" from detail page
   - Should navigate to `/recipes/{id}/edit`
   - Form should pre-populate with existing data

2. **Form Pre-population**
   - Title, description, all metadata fields filled
   - Ingredients list with quantities/units/names
   - Instructions in correct order
   - Category, difficulty, servings, times

3. **Update Success**
   - Modify multiple fields
   - Click "Update Recipe"
   - Should redirect to detail page
   - Changes should be visible immediately
   - Data persists on page refresh

4. **Validation**
   - Try submitting with empty required fields
   - Should show validation errors
   - Form should not submit

5. **Error Handling**
   - Try editing non-existent recipe ID
   - Should show error state or redirect

6. **Data Integrity**
   - Edit recipe with complex ingredients (fractional quantities)
   - Edit recipe with many instructions
   - Verify all data types preserved (numbers, arrays, etc.)

## Technical Considerations

### Next.js 16 Patterns
- Use `useParams()` in client components (no await needed)
- Existing API already follows `await params` pattern for route handlers

### TanStack Query Behavior
- `useRecipe(id)` fetches if not cached, returns instantly if cached
- `useUpdateRecipe()` automatically invalidates:
  - `['recipes', 'detail', id]`
  - `['recipes', 'list']`
- UI updates automatically after mutation

### Form Behavior (No Changes Needed)
- Form already detects edit mode via `recipe` prop presence
- Uses `useUpdateRecipe()` mutation when editing
- Uses `useCreateRecipe()` mutation when creating
- Import section conditionally hidden in edit mode

### Instruction Format Handling
- API transforms from DB format (string[] or object[])
- Form receives consistent string[] format
- No transformation needed in edit page

## Edge Cases

1. **Concurrent Edits** (Future consideration)
   - Current: Last write wins
   - Phase 2 (multi-user): Add optimistic locking or version tracking

2. **Large Images**
   - Currently stored in database (Bytes field)
   - Edit page doesn't modify images yet
   - Future enhancement: Add image upload to form

3. **Recipe Not Found**
   - `useRecipe()` returns error
   - Show error message with link back to recipe list

4. **Network Failure During Update**
   - TanStack Query shows error state
   - Form displays error message
   - User can retry submission

## Future Enhancements (Out of Scope)

1. **Image Management in Edit Form**
   - Add image preview
   - Upload/replace/delete buttons
   - Hooks already exist: `useUploadRecipeImage()`, `useDeleteRecipeImage()`

2. **Autosave/Draft Mode**
   - Periodically save to localStorage
   - Restore unsaved changes prompt

3. **Change History**
   - Track edit timestamps
   - Show "Last modified" indicator
   - Phase 2: Track which user made changes

4. **Optimistic Updates**
   - Update UI immediately before API response
   - Rollback on error

## Success Criteria

### Implementation
- [ ] Edit page route created and accessible
- [ ] Edit button navigates to edit page
- [ ] Form pre-populates with existing recipe data
- [ ] Can successfully update all fields
- [ ] Changes persist and display correctly
- [ ] Validation works (required fields enforced)
- [ ] Error states handled gracefully
- [ ] Query invalidation updates UI automatically

### Testing
- Implementation Time**: 30-45 minutes  
**Testing Time**: 45-60 minutes  
**Total Time**: 1.5-2 hours

**Complexity**: Low-Medium (simple routing + comprehensive tests)es pass (loading, error, form, validation, interactions)
- [ ] Code coverage meets project standards
- [ ] Tests follow existing patterns (mocking, fixtures, assertions)
- [ ] Edge cases covered (empty data, HTML entities, etc.)
- [Testing Tools & Configuration

- **Test Framework**: Jest with TypeScript support (`ts-jest`)
- **Testing Library**: React Testing Library + user-event
- **Test Location**: `src/app/recipes/[id]/edit/__tests__/page.test.tsx`
- **Run Tests**: `pnpm test` or `pnpm test:watch`
- **Coverage**: `pnpm test -- --coverage`

**Jest Configuration** (`jest.config.js`):
- Test environment: jsdom
- Path alias: `@/` resolves to `src/`
- Matches: `**/__tests__/**/*.ts?(x)` and `**/?(*.)+(spec|test).ts?(x)`

**Common Mocks Needed**:
```typescript
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('@/lib/queries/recipe-queries', () => ({
  useRecipe: jest.fn(),
  useUpdateRecipe: jest.fn(),
}));
```

## References

### Implementation References
- **API Route**: `src/app/api/recipes/[id]/route.ts` (PUT handler)
- **Mutation Hook**: `src/lib/queries/recipe-queries.ts` (useUpdateRecipe)
- **Form Component**: `src/components/recipes/recipe-form.tsx`
- **Detail Page**: `src/app/recipes/[id]/page.tsx` (edit button location)
- **New Recipe Page**: `src/app/recipes/new/page.tsx` (pattern to follow)

### Testing References
- **Test Pattern**: `src/app/recipes/[id]/__tests__/page.test.tsx` (comprehensive example)
- **Jest Config**: `jest.config.js`
- **Test Setup**: `jest.setup.js`

## Dependencies

None - all required infrastructure exists.

## References

- **API Route**: `src/app/api/recipes/[id]/route.ts` (PUT handler)
- **Mutation Hook**: `src/lib/queries/recipe-queries.ts` (useUpdateRecipe)
- **Form Component**: `src/components/recipes/recipe-form.tsx`
- **Detail Page**: `src/app/recipes/[id]/page.tsx` (edit button location)
- **New Recipe Page**: `src/app/recipes/new/page.tsx` (pattern to follow)
