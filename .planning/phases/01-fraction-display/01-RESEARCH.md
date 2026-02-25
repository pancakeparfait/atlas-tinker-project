# Phase 1: Fraction Display - Research

**Researched:** 2026-02-25
**Domain:** Frontend UI formatting and display consistency
**Confidence:** HIGH

## Summary

This phase completes the implementation of fraction display for ingredient quantities across the Recipe Organizer application. The foundation (utility functions and unit tests) is already complete with 34 passing tests. The remaining work involves integrating the `formatQuantityAsFraction()` utility into React components to display fractions consistently everywhere quantities appear.

The technical approach is straightforward: import and apply the existing utility function in display contexts (recipe detail page, import review component, recipe lists), while keeping input fields accepting decimal values for flexibility. The user decisions specify that formatting should be client-side, display-only, with no special styling, using standard ASCII fraction notation (e.g., `2 3/4`).

**Primary recommendation:** Apply display-only formatting in client components using the existing `formatQuantityAsFraction()` utility. Keep input fields as numeric types accepting decimals. Use React Hook Form's `setValueAs` or `onBlur` handlers for optional input parsing if needed in future phases.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library               | Version | Purpose               | Why Standard                                                          |
| --------------------- | ------- | --------------------- | --------------------------------------------------------------------- |
| React Hook Form       | 7.48.2  | Form state management | Already in use, handles numeric input well, provides validation hooks |
| TanStack Query        | 5.8.4   | Data fetching/caching | Already in use, manages recipe data state                             |
| Next.js               | 16.0.4  | Framework             | Already in use, requires async params pattern                         |
| React                 | 18.2.0  | UI library            | Project standard                                                      |
| Jest                  | 30.2.0  | Testing               | Already in use, 34 utility tests passing                              |
| React Testing Library | 16.3.2  | Component testing     | Already in use, integration tests needed                              |

### Supporting

| Library     | Version | Purpose                     | When to Use                                                                                        |
| ----------- | ------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| Fraction.js | Latest  | Fraction parsing/arithmetic | **NOT NEEDED** - existing utility handles display; only consider if adding input parsing in future |
| Zod         | 3.22.4  | Schema validation           | Already in use for form validation                                                                 |

### Alternatives Considered

| Instead of                      | Could Use                  | Tradeoff                                                                                                                        |
| ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Custom formatQuantityAsFraction | Fraction.js library        | Library is 100KB+, supports arithmetic we don't need. Custom solution is 83 lines, tested, sufficient for display-only use case |
| Client-side formatting          | Server-side API formatting | User decision: client-side preferred for flexibility. API returns numeric values, components format for display                 |
| Unicode fractions (¾)           | ASCII fractions (3/4)      | User decision: ASCII for consistency, accessibility, keyboard input compatibility                                               |

**Installation:**
No new dependencies required - existing utilities and libraries are sufficient.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   ├── utils.ts                    # Fraction utilities (COMPLETE)
│   └── __tests__/
│       └── utils.test.ts           # Utility tests (COMPLETE)
├── app/
│   └── recipes/
│       ├── [id]/
│       │   └── page.tsx           # Recipe detail (NEEDS UPDATE)
│       └── page.tsx               # Recipe list (MAY NEED UPDATE)
├── components/
│   └── recipes/
│       ├── import-review.tsx      # Import review (NEEDS UPDATE)
│       └── ingredient-list.tsx    # Form input (NO CHANGE - accepts decimals)
```

### Pattern 1: Display-Only Formatting (Primary Pattern)

**What:** Apply `formatQuantityAsFraction()` at the display layer only, not in forms or API
**When to use:** Recipe detail views, import preview, read-only displays
**Example:**

```typescript
// Source: Existing implementation at src/lib/utils.ts
import { formatQuantityAsFraction } from '@/lib/utils'

// In recipe detail page (line 258 of src/app/recipes/[id]/page.tsx)
<div className="font-medium">
  {formatQuantityAsFraction(item.quantity)} {item.unit} {decodeHtmlEntities(item.ingredient.name)}
  {item.isOptional && (
    <span className="text-sm text-gray-500 ml-2">(optional)</span>
  )}
</div>
```

### Pattern 2: Non-Breaking Spaces for Mixed Numbers

**What:** Use `&nbsp;` or `\u00A0` to prevent line breaks between whole number and fraction
**When to use:** Wherever mixed numbers are displayed
**Example:**

```typescript
// The existing utility already handles this - returns "2 3/4" with regular space
// For HTML display, replace space with non-breaking space if needed:
const formatted = formatQuantityAsFraction(item.quantity).replace(' ', '\u00A0')
```

### Pattern 3: Client Component for Dynamic Display

**What:** Components that format quantities must be client components ('use client' directive)
**When to use:** Any component calling `formatQuantityAsFraction()` with dynamic data
**Example:**

```typescript
// Recipe detail page is already a client component
'use client'

import { formatQuantityAsFraction } from '@/lib/utils'
// Component can use formatting in render
```

### Pattern 4: Form Input Accepts Decimals

**What:** Keep input fields as type="number" accepting decimal values, don't force fraction input
**When to use:** Edit forms, create forms, ingredient lists
**Example:**

```typescript
// Source: Existing pattern in src/components/recipes/ingredient-list.tsx (line 43-50)
<Input
  placeholder="Amount"
  type="number"
  step="0.001"
  min="0"
  {...register(`ingredients.${index}.quantity`, {
    valueAsNumber: true,
  })}
/>
```

### Pattern 5: Testing Fraction Display

**What:** Component tests should verify fraction rendering, not test the utility (already unit tested)
**When to use:** Integration tests for pages/components
**Example:**

```typescript
// Add to src/app/recipes/[id]/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react'

test('displays ingredient quantities as fractions', () => {
  const mockRecipe = {
    ingredients: [
      { quantity: 0.5, unit: 'cup', ingredient: { name: 'flour' } },
      { quantity: 2.75, unit: 'cups', ingredient: { name: 'sugar' } }
    ]
  }

  render(<RecipeDetailPage recipe={mockRecipe} />)

  expect(screen.getByText(/1\/2 cup/i)).toBeInTheDocument()
  expect(screen.getByText(/2 3\/4 cups/i)).toBeInTheDocument()
})
```

### Anti-Patterns to Avoid

- **Formatting in API responses:** Don't return "1/2" from API - keep numeric values, format client-side
- **Forcing fraction input:** Don't require users to type "1/2" - accept 0.5, convert on display
- **Inline utility logic:** Don't duplicate formatting logic - always import from `@/lib/utils`
- **Unicode fraction characters:** Don't use ½, ¾ symbols - use ASCII "1/2", "3/4" for consistency
- **Server component formatting:** Don't call `formatQuantityAsFraction()` in server components with async data (use client components)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem                          | Don't Build                | Use Instead                               | Why                                                                                        |
| -------------------------------- | -------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fraction parsing from user input | Custom regex parser        | React Hook Form `setValueAs` + validation | Handles edge cases (spaces, mixed numbers, invalid input), integrates with form validation |
| GCD calculation                  | Custom algorithm           | Existing `gcd()` in utils.ts              | Already implemented and tested                                                             |
| Decimal to fraction              | Custom conversion          | Existing `formatQuantityAsFraction()`     | Already handles eighths, thirds tolerance, simplification, 34 tests passing                |
| Non-breaking spaces              | Manual string manipulation | CSS `white-space: nowrap` or `\u00A0`     | Browser-native, accessible, handles edge cases                                             |

**Key insight:** The core fraction display logic is complete and tested. Focus on integration, not reimplementation. Future input parsing (if needed) should leverage React Hook Form's built-in transformation hooks, not custom parsers.

## Common Pitfalls

### Pitfall 1: Forgetting to Import Utility

**What goes wrong:** Copy-pasting quantity display code without importing `formatQuantityAsFraction`
**Why it happens:** Multiple files need updating, easy to miss import statement
**How to avoid:**

- Use grep to find all `item.quantity` or `ing.quantity` references
- Add import immediately after opening each file
- TypeScript will catch missing imports during build
  **Warning signs:**
- Decimal numbers still showing (0.5, 2.75)
- Build errors: "formatQuantityAsFraction is not defined"

### Pitfall 2: Breaking Existing Tests

**What goes wrong:** Existing component tests fail because they expect decimals, now see fractions
**Why it happens:** Tests mock recipe data with decimal quantities, assertions check for "0.5" not "1/2"
**How to avoid:**

- Update test assertions to expect fractions
- Review all recipe-related tests before integration testing
- Run `pnpm test` after each component update
  **Warning signs:**
- Test output shows "Expected '0.5' to be in document, received '1/2'"
- Snapshot tests fail with quantity mismatches

### Pitfall 3: Displaying Fractions in Edit Forms

**What goes wrong:** Users see "1/2" in the quantity input field, try to edit it, get validation errors
**Why it happens:** Applying `formatQuantityAsFraction()` to input value instead of display-only
**How to avoid:**

- Only format for display contexts (recipe detail, import review)
- Keep form inputs as numeric (type="number", valueAsNumber: true)
- Never apply formatting to `<Input>` value prop
  **Warning signs:**
- Input shows "1/2" but type="number" expects numeric value
- Console warnings about controlled input value type mismatch

### Pitfall 4: Inconsistent Formatting Across Views

**What goes wrong:** Some views show fractions, others show decimals, creating confusion
**Why it happens:** Forgetting to update all display locations
**How to avoid:**

- Audit all locations where quantities appear:
  - Recipe detail page ✓
  - Import review ✓
  - Recipe list/cards (if quantities shown)
  - Search results (if quantities shown)
- Create a checklist from user decision: "Everywhere" means all views
  **Warning signs:**
- User reports: "Sometimes I see 0.5, sometimes 1/2"
- Visual inconsistency in UI

### Pitfall 5: Zero and Empty Quantity Handling

**What goes wrong:** Displaying "0 cups" or empty spaces where quantities are zero
**Why it happens:** Not handling zero case before calling format function
**How to avoid:**

- User decision: "Zero quantities: Omit the quantity entirely"
- Add conditional rendering: `{quantity > 0 && formatQuantityAsFraction(quantity)}`
- Or handle in component logic before rendering
  **Warning signs:**
- Recipe displays show "0 cups flour"
- Empty ingredient rows in lists

### Pitfall 6: Range Formatting Edge Case

**What goes wrong:** Quantities like "1.5-2.5 cups" display as "1.5-2.5 cups" (not formatted)
**Why it happens:** `formatQuantityAsFraction()` expects single number, not ranges
**How to avoid:**

- User decision mentions range formatting but defers parsing to later
- For now: display ranges as-is if stored as strings
- Document as future enhancement if needed
  **Warning signs:**
- Ranges show decimals while single values show fractions

## Code Examples

Verified patterns from existing codebase:

### Recipe Detail Page Integration

```typescript
// Source: src/app/recipes/[id]/page.tsx (line 1-12, 258)
'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Clock, Users, Star, ChefHat, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecipe, useDeleteRecipe } from '@/lib/queries/recipe-queries';
import { MEAL_CATEGORIES, DIFFICULTY_LEVELS } from '@/components/recipes/recipe-form-schema';
import Image from 'next/image';
import { formatQuantityAsFraction } from '@/lib/utils'; // ADD THIS

// Later in component (around line 258):
<div className="font-medium">
  {formatQuantityAsFraction(item.quantity)} {item.unit} {decodeHtmlEntities(item.ingredient.name)}
  {item.isOptional && (
    <span className="text-sm text-gray-500 ml-2">(optional)</span>
  )}
</div>
```

### Import Review Component Integration

```typescript
// Source: src/components/recipes/import-review.tsx (line 1-15, ~270)
'use client'

import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IngredientList } from './ingredient-list'
import { InstructionSteps } from './instruction-steps'
import {
  RecipeSchema,
  MEAL_CATEGORIES,
  DIFFICULTY_LEVELS,
  type RecipeFormData,
} from './recipe-form-schema'
import { type ImportResult } from '@/lib/queries/import-queries'
import { CheckCircle, AlertCircle, XCircle, Edit, Check, X } from 'lucide-react'
import { formatQuantityAsFraction } from '@/lib/utils' // ADD THIS

// Note: IngredientList component is used for editing in import-review
// Fractions should display in preview, not in the editable IngredientList
```

### Existing Utility Function (Reference Only)

```typescript
// Source: src/lib/utils.ts (complete, no changes needed)
/**
 * Convert a decimal quantity to a fraction string for display
 * Examples: 0.5 → "1/2", 2.75 → "2 3/4", 0.333 → "1/3"
 */
export function formatQuantityAsFraction(quantity: number): string {
  // Handle zero
  if (quantity === 0) return '0'

  // Separate whole and fractional parts
  const wholePart = Math.floor(quantity)
  const fractionalPart = quantity - wholePart

  // If it's a whole number, return as integer
  if (fractionalPart < 0.001) {
    return wholePart.toString()
  }

  // Check for thirds with tolerance (±0.01)
  const third = 1 / 3
  const twoThirds = 2 / 3

  if (Math.abs(fractionalPart - third) < 0.01) {
    return wholePart > 0 ? `${wholePart} 1/3` : '1/3'
  }
  if (Math.abs(fractionalPart - twoThirds) < 0.01) {
    return wholePart > 0 ? `${wholePart} 2/3` : '2/3'
  }

  // Find closest fraction with denominators from 2 to 8
  let bestNumerator = 1
  let bestDenominator = 2
  let bestDifference = Math.abs(fractionalPart - 0.5)

  for (let denominator = 2; denominator <= 8; denominator++) {
    for (let numerator = 1; numerator < denominator; numerator++) {
      const fractionValue = numerator / denominator
      const difference = Math.abs(fractionalPart - fractionValue)

      if (difference < bestDifference) {
        bestDifference = difference
        bestNumerator = numerator
        bestDenominator = denominator
      }
    }
  }

  // Reduce fraction to simplest form
  const divisor = gcd(bestNumerator, bestDenominator)
  const reducedNumerator = bestNumerator / divisor
  const reducedDenominator = bestDenominator / divisor

  // Format as mixed number or simple fraction
  const fractionString = `${reducedNumerator}/${reducedDenominator}`

  if (wholePart > 0) {
    return `${wholePart} ${fractionString}`
  }

  return fractionString
}
```

### Component Testing Pattern

```typescript
// Source: Pattern for src/app/recipes/[id]/__tests__/page.test.tsx (NEW)
import { render, screen } from '@testing-library/react'
import RecipeDetailPage from '../page'

describe('Recipe Detail Page - Fraction Display', () => {
  test('displays ingredient quantities as fractions', () => {
    const mockRecipe = {
      id: '1',
      title: 'Test Recipe',
      ingredients: [
        {
          id: '1',
          quantity: 0.5,
          unit: 'cup',
          ingredient: { name: 'flour' },
          isOptional: false
        },
        {
          id: '2',
          quantity: 2.75,
          unit: 'cups',
          ingredient: { name: 'sugar' },
          isOptional: false
        }
      ]
    }

    render(<RecipeDetailPage />)

    // Use regex to handle variations in whitespace and case
    expect(screen.getByText(/1\/2\s+cup/i)).toBeInTheDocument()
    expect(screen.getByText(/2\s+3\/4\s+cups/i)).toBeInTheDocument()
  })

  test('displays whole number quantities as integers', () => {
    const mockRecipe = {
      ingredients: [
        { quantity: 1.0, unit: 'cup', ingredient: { name: 'flour' } },
        { quantity: 2.0, unit: 'cups', ingredient: { name: 'sugar' } }
      ]
    }

    render(<RecipeDetailPage />)

    // Should NOT see decimals like "1.0" or "2.0"
    expect(screen.queryByText(/1\.0/)).not.toBeInTheDocument()
    expect(screen.queryByText(/2\.0/)).not.toBeInTheDocument()

    // Should see clean integers
    expect(screen.getByText(/^1\s+cup/i)).toBeInTheDocument()
    expect(screen.getByText(/^2\s+cups/i)).toBeInTheDocument()
  })

  test('handles thirds in ingredient quantities', () => {
    const mockRecipe = {
      ingredients: [
        { quantity: 0.333, unit: 'cup', ingredient: { name: 'oil' } },
        { quantity: 1.667, unit: 'cups', ingredient: { name: 'milk' } }
      ]
    }

    render(<RecipeDetailPage />)

    expect(screen.getByText(/1\/3\s+cup/i)).toBeInTheDocument()
    expect(screen.getByText(/1\s+2\/3\s+cups/i)).toBeInTheDocument()
  })
})
```

## State of the Art

| Old Approach                 | Current Approach             | When Changed               | Impact                                             |
| ---------------------------- | ---------------------------- | -------------------------- | -------------------------------------------------- |
| Display decimals (0.5, 0.75) | Display fractions (1/2, 3/4) | Phase 1 implementation     | Better UX, matches recipe book conventions         |
| Server-side formatting       | Client-side formatting       | User decision (2026-02-25) | Flexibility, simpler API, component-level control  |
| Unicode fractions (½, ¾)     | ASCII fractions (1/2, 3/4)   | User decision (2026-02-25) | Keyboard compatibility, accessibility, consistency |
| Global decimal display       | Context-aware formatting     | Phase 1 scope              | Display fractions in views, keep decimals in forms |

**Deprecated/outdated:**

- **Decimal-only display:** Not deprecated but coexists - forms still accept decimals, only display layer shows fractions
- **Fraction.js library consideration:** Not needed - custom utility is sufficient for display-only use case

## Open Questions

Things that couldn't be fully resolved:

1. **Range formatting (e.g., "1.5-2.5 cups")**
   - What we know: User decisions mention range formatting but defer parsing implementation
   - What's unclear: Whether quantities are stored as ranges (strings) or single numbers in current system
   - Recommendation: Document as future enhancement if ranges are encountered during testing. Current implementation handles single numeric values only.

2. **Non-breaking space implementation**
   - What we know: User decision specifies non-breaking space between whole number and fraction
   - What's unclear: Whether to implement in utility function or at display layer
   - Recommendation: Existing utility uses regular space. Optionally add `.replace(' ', '\u00A0')` at display layer if line-wrapping issues are observed during manual testing. Not critical for MVP.

3. **Recipe list/card quantity display**
   - What we know: Implementation guide focuses on recipe detail and import review
   - What's unclear: Whether recipe list/grid views show quantities (may be title/image only)
   - Recommendation: Audit recipe list page during integration testing. If quantities appear, apply same formatting pattern. If not shown, no action needed.

4. **Future input parsing scope**
   - What we know: User decisions mention accepting fraction input ("1/2") in forms
   - What's unclear: Priority and timeline for input parsing vs. display-only
   - Recommendation: Phase 1 focuses on display only. Input parsing is deferred - keep forms accepting decimals. Document as Phase 2 enhancement if needed.

## Sources

### Primary (HIGH confidence)

- Existing codebase: `src/lib/utils.ts` (gcd, formatQuantityAsFraction) - verified implementation
- Existing tests: `src/lib/__tests__/utils.test.ts` - 34 passing tests confirm utility correctness
- Implementation guide: `docs/ai/plans/Fraction_Display_Implementation_Guide.md` - verified steps 1-2 complete
- User decisions: `.planning/phases/01-fraction-display/01-CONTEXT.md` - locked formatting choices
- Package.json - verified versions: Next.js 16.0.4, React 18.2.0, React Hook Form 7.48.2

### Secondary (MEDIUM confidence)

- React Hook Form docs (https://react-hook-form.com/docs/useform/register) - setValue, setValueAs patterns for future input parsing
- React Testing Library docs (https://testing-library.com/docs/react-testing-library/cheatsheet) - component testing patterns
- Next.js 16 async params pattern - verified in AGENTS.md (must await params in route handlers)

### Tertiary (LOW confidence)

- Fraction.js GitHub (https://github.com/rawify/Fraction.js) - reviewed for comparison, decided against using (overkill for display-only)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in use, versions verified from package.json
- Architecture: HIGH - Existing codebase patterns observed, implementation guide provides clear structure
- Pitfalls: HIGH - Based on common React/Next.js patterns and existing test suite

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (30 days - stable domain, no fast-moving dependencies)

**Note:** Foundation work (Steps 1-2 of implementation guide) is complete and tested. Remaining work is integration and testing (Steps 3-7), which is low-risk given the stable utility functions and comprehensive unit test coverage.
