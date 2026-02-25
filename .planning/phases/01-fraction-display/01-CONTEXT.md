# Phase 1: Fraction Display - Context

**Gathered:** 2026-02-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete ingredient quantity formatting to display natural fractions (1/2, 3/4, 2 1/4) instead of decimals (0.5, 0.75, 2.25) across all recipe views. This phase builds on existing WIP utilities and tests (Steps 1-2 complete) and completes Steps 3-7 of the implementation.

</domain>

<decisions>
## Implementation Decisions

### Display Consistency

- **Everywhere:** Fractions appear consistently across ALL locations where quantities are displayed (recipe detail, import review, recipe lists, search results, edit forms)
- **Identical formatting:** Same fraction formatting rules apply universally — no context-dependent variations
- **Import preview:** Show fractions immediately during recipe import review, before saving
- **Server vs client formatting:** OpenCode's discretion — choose based on architecture (API returns formatted strings vs client-side formatting)

### Mixed Number Formatting

- **Visual style:** Space-separated format: `2 3/4` (not hyphenated or "and")
- **Character set:** Regular slash notation (`3/4`), not Unicode fraction symbols (¾) or superscript/subscript
- **No special styling:** Fractions appear inline with no visual emphasis (no color, weight, or styling differences)
- **Non-breaking space:** Use non-breaking space between whole number and fraction to prevent line wrapping (e.g., "2" and "3/4" stay together)
- **Always mixed numbers:** Convert improper fractions to mixed numbers for quantities > 1 (9/4 → 2 1/4)
- **Always simplify:** Automatically reduce fractions to simplest form (2/4 → 1/2)
- **Number and unit:** Always show fractions with their unit (e.g., "2 3/4 cups", never standalone)
- **Zero quantities:** Omit the quantity entirely for zero values (don't show "0 cups")

### Edge Case Handling

- **Imprecise decimals:** Round to nearest common fraction (0.334 → 1/3, tolerance-based matching)
- **Ranges:** Format both parts of numeric ranges (1.5-2.5 cups → 1 1/2 - 2 1/2 cups). Requires parsing dashes/"to" separators.
- **Non-numeric quantities:** Preserve text as-is ("pinch", "to taste", "generous handful") — no conversion attempts

### Edit vs Display Modes

- **Input flexibility:** Accept both fraction and decimal formats when user edits quantities
- **Auto-convert on save:** Convert user-typed decimals to fractions when saving (user types 0.5, system stores/displays as 1/2)
- **Live conversion:** Show fraction conversion on blur (immediate feedback, not keystroke-by-keystroke)
- **Natural language parsing:** Attempt to parse word quantities ("two and a half" → 2 1/2), but reject with validation error if parsing fails
- **Invalid input handling:** Show validation error for unparseable input — don't fall back to storing invalid text

</decisions>

<specifics>
## Specific Ideas

- Existing WIP utilities (`gcd()`, `formatQuantityAsFraction()`) and tests (34 passing) provide the foundation
- Reference implementation guide exists: `docs/ai/plans/Fraction_Display_Implementation_Guide.md`
- Success criteria from roadmap explicitly cover thirds tolerance (0.333 → 1/3, 0.667 → 2/3)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 01-fraction-display_
_Context gathered: 2026-02-25_
