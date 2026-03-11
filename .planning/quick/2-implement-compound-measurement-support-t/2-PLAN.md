---
phase: quick
plan: 2
type: feature
subsystem: fraction-display
tags: [compound-measurements, precision, volume-conversion]
created: 2026-03-11
estimated_duration: 20 min

# Dependency Graph
requires: [quick-task-1]
provides: [compound-measurement-implementation]
affects: [formatQuantityAsFraction, recipe-display]

# Technology Stack
tech-stack:
  patterns:
    - compound unit decomposition
    - volume conversion (cups ↔ Tbsp)
    - precision-driven formatting
---

# Quick Task 2: Implement Compound Measurement Support

## Objective

Implement compound measurement logic in `formatQuantityAsFraction` to convert imprecise fractions into exact compound units (e.g., 0.625 cups → "1/2 cup and 2 Tbsp"), making the test from quick task 1 pass.

## Background

The current implementation approximates 0.625 cups as "2/3" (error: 0.042 cups). For cooking precision, it's better to express this as "1/2 cup and 2 Tbsp" which equals exactly 0.625 cups.

**Volume conversion fundamentals:**

- 1 cup = 16 Tbsp
- 1 Tbsp = 1/16 cup = 0.0625 cups
- Common tablespoon measurements: 1, 2, 3, 4 (quarter cup)

**Strategy:**
When a fractional part doesn't match a common fraction exactly, check if it can be expressed as a common fraction plus tablespoons (up to 3 Tbsp, since 4 Tbsp = 1/4 cup).

## Context

- Function to modify: `formatQuantityAsFraction` in `src/lib/utils.ts`
- Test to pass: Line 170-174 in `src/lib/__tests__/utils.test.ts`
- Current behavior: Returns "2/3" for 0.625
- Desired behavior: Returns "1/2 cup and 2 Tbsp" for 0.625

## Tasks

### Task 1: Implement compound measurement logic

**Files:**

- `src/lib/utils.ts`

**Action:**

Modify `formatQuantityAsFraction` to support compound measurements:

1. **After finding the best common fraction** (line 66), check if the remainder can be expressed in tablespoons
2. **Algorithm:**

   ```typescript
   // After finding bestFraction, calculate remainder
   const fractionValue = bestFraction.value
   const remainder = fractionalPart - fractionValue

   // If remainder is significant (>= 1 Tbsp = 0.0625), try compound
   if (Math.abs(remainder) >= 0.06) {
     const tbsp = Math.round(remainder / 0.0625) // Convert to Tbsp

     // Only use compound for 1-3 Tbsp (4 Tbsp = 1/4 cup)
     if (tbsp >= 1 && tbsp <= 3) {
       const fractionString = `${bestFraction.num}/${bestFraction.den}`
       const tbspString = `${tbsp} Tbsp`

       if (wholePart > 0) {
         return `${wholePart} ${fractionString} cup and ${tbspString}`
       }
       return `${fractionString} cup and ${tbspString}`
     }
   }
   ```

3. **Integration point:** Insert this logic after line 65 (after finding bestFraction), before line 67 (formatting)

4. **Edge cases to handle:**
   - Whole part > 0: "2 1/2 cup and 2 Tbsp"
   - No whole part: "1/2 cup and 2 Tbsp"
   - Fall back to simple fraction if remainder is too small or too large

**Verify:**

- [ ] Test `pnpm test utils.test.ts` passes (35/35)
- [ ] Existing tests still pass (34 tests unchanged)
- [ ] New test passes: 0.625 → "1/2 cup and 2 Tbsp"
- [ ] TypeScript compiles without errors
- [ ] No regression in other test cases

**Done when:**

- Code modified in `src/lib/utils.ts`
- All 35 tests pass
- Compound measurement logic correctly decomposes imprecise fractions

## Success Criteria

This quick task is complete when:

1. ✅ `formatQuantityAsFraction(0.625)` returns `"1/2 cup and 2 Tbsp"`
2. ✅ All 35 tests pass (34 existing + 1 new)
3. ✅ No regression in existing fraction display behavior
4. ✅ Code is clean and well-commented

## Implementation Notes

**Why 1-3 Tbsp only?**

- 1 Tbsp = 0.0625 cups (1/16)
- 2 Tbsp = 0.125 cups (1/8)
- 3 Tbsp = 0.1875 cups (3/16)
- 4 Tbsp = 0.25 cups (1/4) — use "1/4 cup" instead

**Precision threshold:**

- Use `>= 0.06` to catch 1+ Tbsp (0.0625)
- Round to nearest Tbsp for practical measurement

**Test validation:**

- 0.625 = 0.5 (1/2) + 0.125 (2 Tbsp) ✓
- Math.round(0.125 / 0.0625) = 2 Tbsp ✓

## Out of Scope

- Adding tests for other compound measurements (can be future work)
- Supporting teaspoon (tsp) compounds (Tbsp is sufficient)
- Supporting larger compounds (e.g., "2 cups and 3 Tbsp")
- Localizing unit names (keeping English "cup" and "Tbsp")
