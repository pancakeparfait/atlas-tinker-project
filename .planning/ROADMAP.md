# Roadmap: Recipe Organizer Enhancement

## Overview

Delivering effortless meal planning through four focused enhancements: completing fraction display for ingredient clarity, enabling multi-image recipe documentation, building a visual meal planning calendar, and automating shopping list generation with staples awareness. Each phase delivers standalone user value while building toward the complete meal prep workflow.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Fraction Display** - Complete ingredient quantity formatting
- [ ] **Phase 2: Multi-Image Support** - Enable multiple images per recipe
- [ ] **Phase 3: Meal Planning Calendar** - Visual meal planning with assignment
- [ ] **Phase 4: Shopping List Generation** - Auto-generate lists from meal plans

## Phase Details

### Phase 1: Fraction Display

**Goal**: Users see ingredient quantities as natural fractions instead of confusing decimals
**Depends on**: Nothing (first phase, builds on existing WIP)
**Requirements**: FRAC-01, FRAC-02, FRAC-03, FRAC-04, FRAC-05, FRAC-06, FRAC-07
**Success Criteria** (what must be TRUE):

1. User views recipe detail page and sees fractions (1/2, 3/4) instead of decimals
2. User imports recipe from URL and sees fractions in review page
3. Whole numbers display without decimals (2 not 2.0)
4. Thirds display correctly with tolerance matching (0.333 → 1/3, 0.667 → 2/3)
5. Mixed numbers display naturally (2.75 → 2 3/4)
   **Plans**: 3 plans

Plans:

- [ ] 01-01-PLAN.md — Recipe detail page fraction integration
- [ ] 01-02-PLAN.md — Import review fraction display
- [ ] 01-03-PLAN.md — Regression testing and validation

### Phase 2: Multi-Image Support

**Goal**: Users can document recipes with multiple images showing ingredients, process, and final dish
**Depends on**: Phase 1
**Requirements**: IMG-01, IMG-02, IMG-03, IMG-04, IMG-05, IMG-06, IMG-07
**Success Criteria** (what must be TRUE):

1. User can upload multiple images to a single recipe
2. Recipe detail page displays all uploaded images
3. User can remove individual images without deleting entire recipe
4. User can reorder images and set featured/primary image
5. Recipe list shows primary image thumbnail for each recipe
   **Plans**: TBD

Plans:

- TBD (will be created during phase planning)

### Phase 3: Meal Planning Calendar

**Goal**: Users can visually plan meals across multiple weeks and assign recipes to specific meal slots
**Depends on**: Phase 2
**Requirements**: MEAL-01, MEAL-02, MEAL-03, MEAL-04, MEAL-05, MEAL-06, MEAL-07, MEAL-08, MEAL-09
**Success Criteria** (what must be TRUE):

1. User views calendar showing multiple weeks with breakfast/lunch/dinner slots per day
2. User can navigate forward and backward between weeks
3. User can assign one or more recipes to any meal slot
4. User can add freeform notes to meal slots (e.g., "Order takeout", "Leftovers")
5. User can view recipe details directly from calendar meal slot
6. User can edit or remove recipes and notes from meal slots
7. Meal plan data persists across browser sessions
   **Plans**: TBD

Plans:

- TBD (will be created during phase planning)

### Phase 4: Shopping List Generation

**Goal**: Users can generate shopping lists from meal plans that automatically exclude staples they always have on hand
**Depends on**: Phase 3
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06, SHOP-07, SHOP-08, SHOP-09
**Success Criteria** (what must be TRUE):

1. User can define and maintain staples inventory (items always on hand)
2. User can generate shopping list from selected meal plan period
3. Shopping list aggregates duplicate ingredients across multiple recipes
4. Shopping list automatically excludes items in staples inventory
5. Shopping list displays ingredient quantities as fractions (consistent with Phase 1)
6. User can manually add or remove items from generated shopping list
7. Shopping lists persist and can be referenced later
   **Plans**: TBD

Plans:

- TBD (will be created during phase planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase                       | Plans Complete | Status      | Completed |
| --------------------------- | -------------- | ----------- | --------- |
| 1. Fraction Display         | 0/TBD          | Not started | -         |
| 2. Multi-Image Support      | 0/TBD          | Not started | -         |
| 3. Meal Planning Calendar   | 0/TBD          | Not started | -         |
| 4. Shopping List Generation | 0/TBD          | Not started | -         |

---

_Roadmap created: 2026-02-18_
_Last updated: 2026-02-18_
