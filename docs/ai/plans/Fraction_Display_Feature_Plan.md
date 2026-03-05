# Fraction Display Feature Plan

## Overview
Convert decimal measurements to fraction display for ingredients (e.g., 0.5 cups → 1/2 cup, 2.75 cups → 2 3/4 cups) while maintaining decimal storage and input.

## Design Decisions

### Display Format
- **Mixed numbers** for quantities > 1 (e.g., "1 1/2" not "3/2")
- **Whole numbers as integers** (e.g., "2" not "2.0")
- **Simple fractions** for quantities < 1 (e.g., "1/2", "3/4")

### Fraction Precision
- Up to **eighths** (1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8)
- Include **thirds** (1/3, 2/3) as common cooking fractions
- Use **tolerance-based matching** (~0.01) for non-exact decimals (0.333 → 1/3)
- Show **closest common fraction** if no exact match

### Storage & Input
- **No database changes** - continue storing as Float
- **Form input unchanged** - accepts decimal numbers
- **Display-only conversion** - prevents data loss

## Implementation Steps

### 1. Create Fraction Conversion Utility
**File**: `src/lib/utils.ts`

Add two functions:
- `gcd(a: number, b: number): number` - Find greatest common divisor for reducing fractions
- `formatQuantityAsFraction(quantity: number): string` - Main conversion function

**Algorithm**:
1. Return integer string if whole number (e.g., 2.0 → "2")
2. Separate whole and fractional parts
3. Check tolerance-based match for thirds (±0.01 of 0.333 or 0.667)
4. Find closest fraction with denominators 2-8
5. Reduce to simplest form using GCD
6. Format as mixed number if whole part exists

**Test cases**:
- `0.5` → `"1/2"`
- `0.625` → `"5/8"`
- `0.125` → `"1/8"`
- `0.333` → `"1/3"`
- `0.667` → `"2/3"`
- `2.0` → `"2"`
- `2.75` → `"2 3/4"`
- `1.333` → `"1 1/3"`

### 2. Update Recipe Detail Page
**File**: `src/app/recipes/[id]/page.tsx` (line ~191)

**Change**:
```typescript
// Before:
{item.quantity} {item.unit} {decodeHtmlEntities(item.ingredient.name)}

// After:
{formatQuantityAsFraction(item.quantity)} {item.unit} {decodeHtmlEntities(item.ingredient.name)}
```

**Import**:
```typescript
import { formatQuantityAsFraction } from '@/lib/utils';
```

### 3. Update Import Review Component
**File**: `src/components/recipes/import-review.tsx` (line ~237-246)

Update ingredient quantity display in the preview section to use `formatQuantityAsFraction`.

**Import**:
```typescript
import { formatQuantityAsFraction } from '@/lib/utils';
```

### 4. Form Input - No Changes
**File**: `src/components/recipes/ingredient-list.tsx`

**Keep unchanged** - Continue accepting decimal input with `type="number"` and `step="0.001"`.

Conversion happens only on display, not input/storage.

## Files Modified

### Implementation Files
1. ✅ `src/lib/utils.ts` - Add fraction formatting utilities
2. ✅ `src/app/recipes/[id]/page.tsx` - Use formatter in ingredient display
3. ✅ `src/components/recipes/import-review.tsx` - Use formatter in import preview
4. ❌ `src/components/recipes/ingredient-list.tsx` - No changes (keep decimal input)

### Test Files
5. ✅ `src/lib/__tests__/utils.test.ts` - Unit tests for fraction utilities (NEW)
6. ✅ `src/app/recipes/[id]/__tests__/page.test.tsx` - Update component tests for fraction display (EXISTS)

## Testing Strategy

### Unit Tests

#### 1. Utility Function Tests
**File**: `src/lib/__tests__/utils.test.ts` (NEW)

Test `formatQuantityAsFraction()` function:

**Whole Numbers**:
- `formatQuantityAsFraction(1)` → `"1"`
- `formatQuantityAsFraction(2.0)` → `"2"`
- `formatQuantityAsFraction(10)` → `"10"`

**Simple Fractions (Halves)**:
- `formatQuantityAsFraction(0.5)` → `"1/2"`
- `formatQuantityAsFraction(1.5)` → `"1 1/2"`
- `formatQuantityAsFraction(2.5)` → `"2 1/2"`

**Quarters**:
- `formatQuantityAsFraction(0.25)` → `"1/4"`
- `formatQuantityAsFraction(0.75)` → `"3/4"`
- `formatQuantityAsFraction(2.25)` → `"2 1/4"`
- `formatQuantityAsFraction(2.75)` → `"2 3/4"`

**Eighths**:
- `formatQuantityAsFraction(0.125)` → `"1/8"`
- `formatQuantityAsFraction(0.375)` → `"3/8"`
- `formatQuantityAsFraction(0.625)` → `"5/8"`
- `formatQuantityAsFraction(0.875)` → `"7/8"`
- `formatQuantityAsFraction(2.625)` → `"2 5/8"`

**Thirds (Tolerance-based)**:
- `formatQuantityAsFraction(0.333)` → `"1/3"`
- `formatQuantityAsFraction(0.3333333)` → `"1/3"`
- `formatQuantityAsFraction(0.667)` → `"2/3"`
- `formatQuantityAsFraction(0.6666667)` → `"2/3"`
- `formatQuantityAsFraction(1.333)` → `"1 1/3"`
- `formatQuantityAsFraction(1.667)` → `"1 2/3"`

**Edge Cases**:
- `formatQuantityAsFraction(0)` → `"0"`
- `formatQuantityAsFraction(0.001)` → closest fraction or fallback
- `formatQuantityAsFraction(15.5)` → `"15 1/2"`
- `formatQuantityAsFraction(100)` → `"100"`

**Fraction Reduction (via GCD)**:
- `formatQuantityAsFraction(0.5)` → `"1/2"` (not `"4/8"`)
- Verify internal `gcd()` helper works correctly

Test `gcd()` helper function:
- `gcd(8, 4)` → `4`
- `gcd(6, 9)` → `3`
- `gcd(7, 3)` → `1`
- `gcd(0, 5)` → `5`

#### 2. Component Integration Tests
**File**: `src/app/recipes/[id]/__tests__/page.test.tsx` (UPDATE EXISTING)

Add test cases for fraction display:

**Test: "displays ingredient quantities as fractions"**
- Mock recipe with decimal quantities (0.5, 0.625, 2.75)
- Render recipe detail page
- Assert text content shows "1/2 cup", "5/8 cup", "2 3/4 cups"
- Verify fractions appear in ingredient list section

**Test: "displays whole number quantities as integers"**
- Mock recipe with whole number quantities (1.0, 2.0)
- Assert display shows "1 cup", "2 cups" (no decimal point)

**Test: "handles thirds in ingredient quantities"**
- Mock recipe with 0.333, 1.667 quantities
- Assert display shows "1/3 cup", "1 2/3 cups"

**Regression Test: "existing recipe detail tests still pass"**
- Ensure existing tests don't break with formatter change
- Verify recipe title, instructions, servings display unchanged

### Manual Testing
Use example recipe from screenshot:
- 0.5 cup butter → "1/2 cup butter"
- 0.5 cup sugar → "1/2 cup sugar"
- 0.625 cup cocoa powder → "5/8 cup cocoa powder"
- 0.125 teaspoon salt → "1/8 teaspoon salt"

### Edge Cases
- Whole numbers: `2.0` → `"2"`
- Mixed numbers: `2.75` → `"2 3/4"`
- Thirds: `0.333` → `"1/3"`, `1.667` → `"1 2/3"`
- Very small: `0.001` → closest fraction or fallback to decimal
- Large numbers: `15.5` → `"15 1/2"`

### Regression Testing
- Form input still accepts decimals (0.333, 0.625, etc.)
- Database storage unchanged (Float type)
- API responses unchanged (returns numbers)
- Recipe edit page loads existing decimal values correctly
- All existing unit tests pass

## Benefits

### User Experience
- **More readable** - Fractions match traditional recipe formats
- **Familiar format** - Aligns with measuring cup markings (1/4, 1/2, 3/4)
- **Professional appearance** - Matches cookbook standards

### Technical
- **No breaking changes** - Pure display enhancement
- **Maintains precision** - Decimals stored, no data loss
- **Backward compatible** - Existing recipes display correctly
- **Reusable utility** - Can extend to other measurement contexts

## Future Enhancements (Out of Scope)

- Unicode fraction symbols (½, ⅓, ¼) - browser support varies
- User preference toggle (fractions vs decimals)
- Localization (metric vs imperial fraction conventions)
- Recipe scaling with fraction adjustment
- Input field that accepts fraction syntax ("1/2" → 0.5)

## Notes

- Client-side only - no API or database migration needed
- Compatible with existing recipe import system
- Works with all existing recipes without data migration
- Display logic isolated in single utility function for easy testing/modification
