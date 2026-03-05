# Fraction Display Feature - Implementation Guide

**Status**: 🟢 In Progress (Step 3 of 7)  
**Progress**: ███████░░░░░░░░░░░░░ 28% (2/7 steps completed)

**Completed**: ✅ Step 1 (Utility Functions) • ✅ Step 2 (Unit Tests)  
**Current**: ⬅️ Step 3 (Recipe Detail Page)  
**Remaining**: Steps 4-7 (Component Tests, Import Review, Integration Testing, Code Review)

---

Step-by-step guide for implementing the fraction display feature. Follow each step in order, verify completion, then proceed to the next step.

**Reference**: See [Fraction_Display_Feature_Plan.md](./Fraction_Display_Feature_Plan.md) for full design decisions and rationale.

---

## Step 1: Create Fraction Utility Functions ✅ COMPLETED

### Prompt
```
Implement the fraction conversion utilities in src/lib/utils.ts:

1. Add a gcd() helper function that calculates the greatest common divisor
2. Add formatQuantityAsFraction() function that converts decimal numbers to fraction strings

Requirements:
- Return whole numbers as integers (e.g., 2.0 → "2")
- Support mixed numbers (e.g., 2.75 → "2 3/4")
- Support fractions up to eighths (1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8)
- Include tolerance-based matching for thirds (0.333 → "1/3", 0.667 → "2/3") with ±0.01 tolerance
- Find closest common fraction if no exact match
- Reduce fractions to simplest form using GCD

Export both functions so they can be imported elsewhere.
```

### Expected Files Changed
- `src/lib/utils.ts` - Added `gcd()` and `formatQuantityAsFraction()` functions

### Automated Verification (Prompt for AI)
```
Verify the fraction utility functions were implemented correctly:

1. Read src/lib/utils.ts and confirm:
   - gcd() function exists and is exported
   - formatQuantityAsFraction() function exists and is exported
   - Algorithm handles whole numbers, fractions, thirds, and mixed numbers
   - Both functions are properly typed with TypeScript

2. Check for any TypeScript errors in the file

3. Summarize the implementation and confirm it meets all requirements from Step 1
```

**✅ Step 1 Verification Completed** - See Step 2 below

### Manual Verification (Optional)
You can manually test in Node if desired:
```bash
node
```
```javascript
const { formatQuantityAsFraction } = require('./src/lib/utils.ts');
formatQuantityAsFraction(0.5);    // Should output: "1/2"
formatQuantityAsFraction(2.75);   // Should output: "2 3/4"
formatQuantityAsFraction(0.333);  // Should output: "1/3"
```

**✅ Verification Passed - Proceed to Step 2** ✅ **COMPLETED**

---

## Step 2: Create Unit Tests for Utility Functions ✅ COMPLETED

### Prompt
```
Create comprehensive unit tests for the fraction utilities in src/lib/__tests__/utils.test.ts:

Test the formatQuantityAsFraction() function with these cases:
- Whole numbers: 1, 2.0, 10
- Halves: 0.5, 1.5, 2.5
- Quarters: 0.25, 0.75, 2.25, 2.75
- Eighths: 0.125, 0.375, 0.625, 0.875, 2.625
- Thirds (tolerance): 0.333, 0.3333333, 0.667, 0.6666667, 1.333, 1.667
- Edge cases: 0, 15.5, 100
- Verify fraction reduction works (0.5 should be "1/2" not "4/8")

Also test the gcd() helper function:
- gcd(8, 4) → 4
- gcd(6, 9) → 3
- gcd(7, 3) → 1
- gcd(0, 5) → 5

Use Jest testing framework matching the existing test patterns in the codebase.
```

### Expected Files Changed
- `src/lib/__tests__/utils.test.ts` - New file with comprehensive test suite

### Automated Verification (Prompt for AI)
```
Verify the utility function tests:

1. Run the test file: pnpm test src/lib/__tests__/utils.test.ts
2. Confirm all tests pass
3. Review the test file and verify it includes:
   - Tests for whole numbers (1, 2.0, 10)
   - Tests for halves (0.5, 1.5, 2.5)
   - Tests for quarters (0.25, 0.75, 2.25, 2.75)
   - Tests for eighths (0.125, 0.375, 0.625, 0.875, 2.625)
   - Tests for thirds with tolerance (0.333, 0.667, 1.333, 1.667)
   - Tests for edge cases (0, 15.5, 100)
   - Tests for gcd() helper function
   - Fraction reduction verification
4. Report test results and any failures
```

**✅ Step 2 Verification Completed** - 34/34 tests passing

### Manual Verification
None required - tests verify functionality completely.

**✅ All tests pass - Ready for Step 3**

---

## Step 3: Update Recipe Detail Page Component ⬅️ **CURRENT STEP**

### Prompt
```
Update the recipe detail page to display ingredient quantities as fractions:

File: src/app/recipes/[id]/page.tsx

1. Import formatQuantityAsFraction from '@/lib/utils'
2. Find the ingredient rendering section (around line 191)
3. Replace the quantity display from {item.quantity} to {formatQuantityAsFraction(item.quantity)}
4. Keep all other rendering unchanged (unit, ingredient name, optional tag, etc.)

Make sure this is a Next.js server component - don't add 'use client' directive.
```

### Expected Files Changed
- `src/app/recipes/[id]/page.tsx` - Updated ingredient quantity display

### Automated Verification (Prompt for AI)
```
Verify the recipe detail page changes:

1. Read src/app/recipes/[id]/page.tsx and confirm:
   - Import statement for formatQuantityAsFraction is added
   - formatQuantityAsFraction() is used in the ingredient rendering section
   - No 'use client' directive was added (should remain server component)
   - No other unintended changes to component logic

2. Run build to check for compilation errors: pnpm run build
3. Report any TypeScript or build errors
4. Confirm the changes are minimal and focused on the ingredient quantity display
```

### Manual Verification
Start the dev server and test visually:
```bash
pnpm dev
```

1. Navigate to http://localhost:3000/recipes/[any-recipe-id]
2. Check ingredient quantities display as fractions:
   - 0.5 → "1/2"
   - 0.25 → "1/4"
   - 2.75 → "2 3/4"
   - 2.0 → "2" (no decimal)
3. Verify all other recipe details display correctly (title, instructions, etc.)

**Proceed to Step 4** after verification passes

---

## Step 4: Update Component Integration Tests

### Prompt
```
Update the recipe detail page tests to verify fraction display:

File: src/app/recipes/[id]/__tests__/page.test.tsx

Add new test cases:
1. "displays ingredient quantities as fractions" - Mock recipe with 0.5, 0.625, 2.75 quantities, assert "1/2 cup", "5/8 cup", "2 3/4 cups" appear
2. "displays whole number quantities as integers" - Mock recipe with 1.0, 2.0, assert "1 cup", "2 cups" (no decimals)
3. "handles thirds in ingredient quantities" - Mock recipe with 0.333, 1.667, assert "1/3 cup", "1 2/3 cups"

Ensure all existing tests still pass (regression testing).
```

### Expected Files Changed
- `src/app/recipes/[id]/__tests__/page.test.tsx` - Added new test cases

### Automated Verification (Prompt for AI)
```
Verify the component integration tests:

1. Run the test file: pnpm test src/app/recipes/[id]/__tests__/page.test.tsx
2. Confirm all tests pass (both new and existing)
3. Read the test file and verify it includes:
   - "displays ingredient quantities as fractions" test
   - "displays whole number quantities as integers" test
   - "handles thirds in ingredient quantities" test
   - All existing tests still present and passing
4. Run full test suite: pnpm test
5. Report any test failures or regressions
```

### Manual Verification
None required - test results confirm functionality.

**Proceed to Step 5** only after all tests pass

---

## Step 5: Update Import Review Component

### Prompt
```
Update the import review component to display ingredient quantities as fractions:

File: src/components/recipes/import-review.tsx

1. Import formatQuantityAsFraction from '@/lib/utils'
2. Find the ingredient quantity display in the preview section (around line 237-246)
3. Replace the quantity display with formatQuantityAsFraction()
4. Keep all other rendering unchanged (confidence indicators, unit, name, etc.)

This is a client component, so 'use client' directive should already be present.
```

### Expected Files Changed
- `src/components/recipes/import-review.tsx` - Updated ingredient quantity display

### Automated Verification (Prompt for AI)
```
Verify the import review component changes:

1. Read src/components/recipes/import-review.tsx and confirm:
   - Import statement for formatQuantityAsFraction is added
   - formatQuantityAsFraction() is used in the ingredient preview section
   - 'use client' directive is present (should already be there)
   - Confidence indicators and other UI elements are unchanged
   - No unintended changes to component logic

2. Run build to check for errors: pnpm run build
3. Report any TypeScript or build errors
4. Confirm changes are minimal and focused
```

### Manual Verification
Test the import feature:
```bash
pnpm dev
```

1. Navigate to http://localhost:3000/recipes/new
2. Import a recipe from a URL (e.g., allrecipes.com, foodnetwork.com)
3. On the import review page, verify:
   - Ingredient quantities display as fractions
   - Confidence indicators still work correctly
   - All other import functionality works normally

**Proceed to Step 6** after verification passes

---

## Step 6: Final Integration Testing

### Prompt
```
Run the complete test suite and verify the fraction display feature works end-to-end:

1. Run all unit tests: pnpm test
2. Build the application: pnpm run build
3. Start the dev server: pnpm dev
4. Test these user journeys:
   - View existing recipe with decimal quantities → see fractions
   - Create new recipe with decimal input → displays as fractions on detail page
   - Edit recipe and change quantities → fractions update correctly
   - Import recipe from URL → review shows fractions

Report any issues found.
```

### Expected Outcome
- All tests pass
- Application builds successfully
- All user journeys work correctly with fraction display

### Automated Verification (Prompt for AI)
```
Run comprehensive verification of the fraction display feature:

1. Run all unit tests: pnpm test
2. Run production build: pnpm run build
3. Run linter: pnpm run lint
4. Check git status to see all modified files
5. Report:
   - Test results (pass/fail count)
   - Build results (success/errors)
   - Linting results (warnings/errors)
   - List of all files changed
   - Any issues found

Confirm that only the expected files were modified:
- src/lib/utils.ts
- src/lib/__tests__/utils.test.ts
- src/app/recipes/[id]/page.tsx
- src/app/recipes/[id]/__tests__/page.test.tsx
- src/components/recipes/import-review.tsx
```

### Manual Verification Checklist

Start the dev server: `pnpm dev`

**Recipe Detail Page Testing**:
- [ ] Navigate to existing recipe with decimal quantities
- [ ] Verify fractions display: 0.5 → "1/2", 2.75 → "2 3/4", 0.625 → "5/8"
- [ ] Verify whole numbers: 2.0 → "2" (no decimal)
- [ ] Verify thirds: 0.333 → "1/3", 1.667 → "1 2/3"

**Recipe Creation/Editing**:
- [ ] Create new recipe with decimal ingredient quantities
- [ ] Save recipe and view detail page - fractions display correctly
- [ ] Edit recipe, change quantities - fractions update correctly
- [ ] Form input still accepts decimal values (0.5, 0.333, etc.)
- [ ] Edit page loads existing decimal values correctly in form

**Recipe Import Flow**:
- [ ] Navigate to /recipes/new
- [ ] Import recipe from URL (try allrecipes.com or similar)
- [ ] On import review page, quantities display as fractions
- [ ] Confidence indicators still work correctly
- [ ] Complete import - recipe saves with fractions displaying

**Edge Cases**:
- [ ] Zero displays correctly
- [ ] Large numbers work (15.5 → "15 1/2")
- [ ] Multiple ingredients all format correctly
- [ ] Different units all work (cups, tsp, tbsp, etc.)

**Regression Testing**:
- [ ] Recipe list/grid page still works
- [ ] Image upload still works
- [ ] Search and filtering work
- [ ] All navigation works correctly
- [ ] No console errors in browser dev tools

---

## Step 7: Code Review and Cleanup

### Prompt
```
Review all changes made for the fraction display feature:

1. Check code quality and consistency with existing codebase patterns
2. Ensure all imports use @ alias paths
3. Verify no console.logs or debug code left behind
4. Check that comments are clear and helpful
5. Ensure TypeScript types are correct
6. Verify error handling is appropriate
7. Run linter: pnpm run lint

Provide a summary of files changed and confirm everything is ready for commit.
```

### Expected Outcome
- Clean, production-ready code
- No linting errors
- Consistent with codebase conventions

### Automated Verification (Prompt for AI)
```
Perform final code review and verification:

1. Review all changed files for code quality:
   - Check imports use @ alias paths
   - Verify no console.logs or debug code
   - Check comments are clear and helpful
   - Ensure TypeScript types are correct
   - Verify error handling is appropriate

2. Run final checks:
   - pnpm run lint (no errors or warnings)
   - pnpm test (all tests pass)
   - pnpm run build (successful build)

3. Review git status and provide summary:
   - List all files changed
   - Confirm only expected files were modified
   - Note any unexpected changes

4. Provide final go/no-go for commit
```

### Manual Verification
1. Review the git diff yourself if desired:
   ```bash
   git status
   git diff
   ```

2. If everything looks good, commit:
   ```bash
   git add -A
   git commit -m "feat: add fraction display for ingredient quantities"
   ```

---

## Troubleshooting

### Tests Failing
- Check that formatQuantityAsFraction is exported from utils.ts
- Verify import paths use @ alias
- Check tolerance values for thirds matching
- Review mock data structure in tests

### Component Not Rendering Fractions
- Verify import statement is correct
- Check that function is called with item.quantity (correct data path)
- Use browser dev tools to check what value is being passed
- Verify no TypeScript errors in console

### Build Errors
- Check for missing imports
- Verify no circular dependencies
- Check TypeScript errors: `pnpm run type-check` (if script exists)
- Clear Next.js cache: `rm -rf .next`

### Incorrect Fraction Display
- Check tolerance values in formatQuantityAsFraction
- Verify GCD function is reducing fractions correctly
- Test utility function in isolation with console.log
- Check for floating point precision issues

---

## Success Criteria

✅ ~~All unit tests pass (utils.test.ts)~~ **COMPLETED**
⬜ All component tests pass (page.test.tsx)
⬜ Full test suite passes
⬜ Application builds without errors
⬜ Recipe detail page shows fractions correctly
⬜ Import review shows fractions correctly
⬜ Form input still accepts decimals
⬜ No regressions in existing features
⬜ Code follows project conventions
⬜ No linting errors

Once all criteria are met, the feature is complete and ready for deployment.

---

## Completed Steps

- ✅ **Step 1**: Create Fraction Utility Functions (gcd, formatQuantityAsFraction)
- ✅ **Step 2**: Create Unit Tests for Utility Functions (34 tests passing)
- ⬜ **Step 3**: Update Recipe Detail Page Component
- ⬜ **Step 4**: Update Component Integration Tests
- ⬜ **Step 5**: Update Import Review Component
- ⬜ **Step 6**: Final Integration Testing
- ⬜ **Step 7**: Code Review and Cleanup
