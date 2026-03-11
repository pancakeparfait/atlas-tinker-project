---
phase: quick
plan: 1
type: test
subsystem: fraction-display
tags: [testing, compound-measurements, precision]
created: 2026-03-11
estimated_duration: 15 min

# Dependency Graph
requires: []
provides: [compound-measurement-test]
affects: [formatQuantityAsFraction]

# Technology Stack
tech-stack:
  testing:
    - jest
    - typescript
  patterns:
    - TDD (test-first approach)
    - compound measurements
---

# Quick Task 1: Add Test for Compound Measurement Display

## Objective

Add a failing test proving that 0.625 cups should render as "1/2 cup and 2 Tbsp" instead of the current behavior (rounding to "2/3"). This test establishes the requirement for compound measurement support where imprecise fractions should be broken down into common measuring units.

## Background

The current `formatQuantityAsFraction` function rounds 0.625 to the closest common fraction (2/3), but this loses precision. For cooking measurements, it's better to display compound units like "1/2 cup and 2 Tbsp" (which equals exactly 0.625 cups) rather than approximating as 2/3 cup.

**Volume conversions:**

- 1 cup = 16 Tbsp
- 1/2 cup = 8 Tbsp
- 2 Tbsp = 0.125 cups
- 1/2 cup + 2 Tbsp = 0.5 + 0.125 = 0.625 cups exactly

## Context

- Existing function: `formatQuantityAsFraction` in `src/lib/utils.ts`
- Existing tests: `src/lib/__tests__/utils.test.ts`
- Current behavior: Line 83-87 shows 0.625 → "2/3" (approximation)
- Desired behavior: 0.625 → "1/2 cup and 2 Tbsp" (exact)

## Tasks

### Task 1: Add failing test for compound measurement

**Files:**

- `src/lib/__tests__/utils.test.ts`

**Action:**
Add a new test case in the `formatQuantityAsFraction` describe block:

```typescript
describe('compound measurements', () => {
  it('should format 0.625 cups as "1/2 cup and 2 Tbsp"', () => {
    // 0.625 cups = 1/2 cup (0.5) + 2 Tbsp (0.125)
    expect(formatQuantityAsFraction(0.625)).toBe('1/2 cup and 2 Tbsp')
  })
})
```

Place this new describe block after the existing test groups (after "combined fraction types" on line 157-168).

**Verify:**

- [ ] Test file compiles without syntax errors
- [ ] Test runs and FAILS with current implementation (expected behavior)
- [ ] Test failure message clearly shows expected vs actual output

**Done when:**

- Test added to `src/lib/__tests__/utils.test.ts`
- `pnpm test utils.test.ts` runs and shows 1 failing test
- Test failure confirms current output is "2/3" and expected is "1/2 cup and 2 Tbsp"

## Success Criteria

This quick task is complete when:

1. ✅ A new test case exists proving 0.625 cups should display as "1/2 cup and 2 Tbsp"
2. ✅ The test fails with current implementation (shows we're currently approximating to 2/3)
3. ✅ The test is well-documented explaining the compound measurement rationale

## Notes

- This is a **test-only** task - no implementation changes
- The test intentionally fails to demonstrate the gap
- Future work will implement compound measurement logic to make this test pass
- This follows TDD: write the test that defines desired behavior, then implement to make it pass

## Out of Scope

- Implementing compound measurement logic (that's future work)
- Modifying `formatQuantityAsFraction` function
- Adding other compound measurement test cases (start with one to prove the concept)
