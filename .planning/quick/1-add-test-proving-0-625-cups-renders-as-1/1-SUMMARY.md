---
phase: quick
plan: 1
subsystem: fraction-display
type: test
tags: [testing, compound-measurements, TDD]
completed: 2026-03-11
duration: '5 minutes'

# Dependency Graph
requires: []
provides: [compound-measurement-test]
affects: [formatQuantityAsFraction]

# Technology Stack
tech-stack:
  added: []
  patterns:
    - TDD (test-first development)
    - compound measurements concept

# File Tracking
key-files:
  created: []
  modified:
    - src/lib/__tests__/utils.test.ts (added compound measurement test)
---

# Quick Task 1 Summary: Compound Measurement Test Added

## Objective Achieved

✅ Added a failing test proving that 0.625 cups should render as "1/2 cup and 2 Tbsp" instead of the imprecise approximation "2/3".

## Execution Summary

### What Was Done

1. **Added compound measurement test** in `src/lib/__tests__/utils.test.ts`
   - New describe block: "compound measurements"
   - Test case for 0.625 cups → "1/2 cup and 2 Tbsp"
   - Documented the math: 1/2 cup (0.5) + 2 Tbsp (0.125) = 0.625 exactly

### Test Results

```
✕ should format 0.625 cups as "1/2 cup and 2 Tbsp"

Expected: "1/2 cup and 2 Tbsp"
Received: "2/3"
```

**Test Status:** ✅ FAILING (as intended - this is TDD)

This proves the current implementation approximates 0.625 to 2/3 (0.667), losing precision.

## Key Decisions

1. **Test-first approach**: Added the test before implementation to clearly define expected behavior
2. **Single test case**: Started with one example (0.625) to prove the concept before expanding
3. **Unit specification**: Explicitly included units ("cup" and "Tbsp") in expected output

## Technical Details

**Volume Conversion Math:**

- 1 cup = 16 Tbsp
- 1/2 cup = 8 Tbsp
- 2 Tbsp = 0.125 cups (2/16 = 1/8)
- 1/2 cup + 2 Tbsp = 0.5 + 0.125 = **0.625 cups** (exact)

**Current Behavior:**

- `formatQuantityAsFraction(0.625)` returns `"2/3"`
- 2/3 ≈ 0.667 (error of 0.042 cups or ~0.67 Tbsp)

**Desired Behavior:**

- `formatQuantityAsFraction(0.625)` should return `"1/2 cup and 2 Tbsp"`
- Exact representation, no approximation error

## Next Steps

Future work to make this test pass:

1. Implement compound measurement logic in `formatQuantityAsFraction`
2. Add volume conversion system (cups ↔ Tbsp)
3. Add algorithm to decompose imprecise fractions into compound units
4. Consider additional compound measurement test cases

## Files Modified

| File                              | Lines Changed | Purpose                              |
| --------------------------------- | ------------- | ------------------------------------ |
| `src/lib/__tests__/utils.test.ts` | +8            | Added compound measurement test case |

## Validation

- ✅ Test file compiles without syntax errors
- ✅ Test runs (35 total: 34 passed, 1 failed)
- ✅ Failure message clearly shows expected vs actual
- ✅ Test is self-documenting with inline comments

## Test Output

```
Test Suites: 1 failed, 1 total
Tests:       1 failed, 34 passed, 35 total

● formatQuantityAsFraction › compound measurements › should format 0.625 cups as "1/2 cup and 2 Tbsp"

    expect(received).toBe(expected) // Object.is equality

    Expected: "1/2 cup and 2 Tbsp"
    Received: "2/3"
```

## Impact

This test establishes a clear requirement for compound measurement support. It demonstrates:

1. **Precision gap**: Current approximation loses accuracy
2. **User expectation**: Cooks use common measuring units (1/2 cup, Tbsp)
3. **Implementation path**: Need compound unit logic to achieve exact representations

The failing test serves as executable documentation of the desired behavior and will guide implementation work.
