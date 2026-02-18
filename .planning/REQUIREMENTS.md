# Requirements: Recipe Organizer Enhancement

**Defined:** 2026-02-18
**Core Value:** Users can plan their meals visually and generate shopping lists that respect what they already have, making weekly meal prep effortless.

## v1 Requirements

Requirements for this enhancement milestone. Each maps to roadmap phases.

### Fraction Display

- [ ] **FRAC-01**: Recipe detail page displays ingredient quantities as fractions (1/2, 3/4, etc.)
- [ ] **FRAC-02**: Import review page displays ingredient quantities as fractions
- [ ] **FRAC-03**: Whole numbers display without decimals (2 not 2.0)
- [ ] **FRAC-04**: Thirds display with tolerance matching (0.333 → 1/3, 0.667 → 2/3)
- [ ] **FRAC-05**: Mixed numbers display correctly (2.75 → 2 3/4)
- [ ] **FRAC-06**: Component integration tests verify fraction display
- [ ] **FRAC-07**: Full regression testing confirms no breaking changes

### Recipe Images

- [ ] **IMG-01**: User can upload multiple images for a recipe
- [ ] **IMG-02**: Recipe detail page displays all uploaded images
- [ ] **IMG-03**: User can remove individual images from a recipe
- [ ] **IMG-04**: User can reorder images (set primary/featured image)
- [ ] **IMG-05**: Images persist with recipe in database
- [ ] **IMG-06**: Image upload validates file type and size (max 10MB)
- [ ] **IMG-07**: Recipe list/grid shows primary image thumbnail

### Meal Planning

- [ ] **MEAL-01**: User can view calendar showing multiple weeks
- [ ] **MEAL-02**: User can navigate forward/backward between weeks
- [ ] **MEAL-03**: Each day shows three meal slots (breakfast, lunch, dinner)
- [ ] **MEAL-04**: User can assign one or more recipes to a meal slot
- [ ] **MEAL-05**: User can add freeform text note to a meal slot
- [ ] **MEAL-06**: User can view recipe details from calendar meal slot
- [ ] **MEAL-07**: User can edit meal slot (add/remove recipes or notes)
- [ ] **MEAL-08**: User can remove recipes or notes from meal slots
- [ ] **MEAL-09**: Meal plan data persists across sessions

### Shopping Lists

- [ ] **SHOP-01**: User can define staples inventory (items always on hand)
- [ ] **SHOP-02**: User can add/remove items from staples inventory
- [ ] **SHOP-03**: User can generate shopping list from selected meal plan period
- [ ] **SHOP-04**: Shopping list aggregates duplicate ingredients across recipes
- [ ] **SHOP-05**: Shopping list excludes items in staples inventory
- [ ] **SHOP-06**: User can manually add items to shopping list
- [ ] **SHOP-07**: User can manually remove items from shopping list
- [ ] **SHOP-08**: Shopping list displays ingredient quantities as fractions
- [ ] **SHOP-09**: Shopping lists persist and can be referenced later

## v2 Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Advanced Meal Planning

- **MEAL-10**: Drag-and-drop recipes between meal slots
- **MEAL-11**: Copy meal plan week to another week
- **MEAL-12**: Recipe suggestions based on ingredients on hand
- **MEAL-13**: Nutritional information aggregated per day/week

### Advanced Shopping Lists

- **SHOP-10**: Organize shopping list by store section (produce, dairy, etc.)
- **SHOP-11**: Check off items while shopping (interactive mode)
- **SHOP-12**: Track purchase history and suggest staples
- **SHOP-13**: Export shopping list to mobile app or print format

### Multi-User Features

- **AUTH-01**: User authentication and authorization
- **AUTH-02**: Multiple users can share meal plans
- **AUTH-03**: Family/household accounts with shared recipes

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                        | Reason                                           |
| ------------------------------ | ------------------------------------------------ |
| Real-time collaboration        | Single-user Phase 1, adds significant complexity |
| Mobile native app              | Web-first approach, mobile later                 |
| Recipe sharing/social features | Not core to meal planning value                  |
| Nutrition tracking             | Complex domain, defer to future                  |
| Grocery delivery integration   | External dependencies, v2+ feature               |
| Recipe ratings/reviews         | Social feature, not in Phase 1 scope             |
| Voice input for meal planning  | Advanced UX, defer to future                     |
| Leftover tracking              | Inventory management complexity, v2+             |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status  |
| ----------- | ----- | ------- |
| FRAC-01     | TBD   | Pending |
| FRAC-02     | TBD   | Pending |
| FRAC-03     | TBD   | Pending |
| FRAC-04     | TBD   | Pending |
| FRAC-05     | TBD   | Pending |
| FRAC-06     | TBD   | Pending |
| FRAC-07     | TBD   | Pending |
| IMG-01      | TBD   | Pending |
| IMG-02      | TBD   | Pending |
| IMG-03      | TBD   | Pending |
| IMG-04      | TBD   | Pending |
| IMG-05      | TBD   | Pending |
| IMG-06      | TBD   | Pending |
| IMG-07      | TBD   | Pending |
| MEAL-01     | TBD   | Pending |
| MEAL-02     | TBD   | Pending |
| MEAL-03     | TBD   | Pending |
| MEAL-04     | TBD   | Pending |
| MEAL-05     | TBD   | Pending |
| MEAL-06     | TBD   | Pending |
| MEAL-07     | TBD   | Pending |
| MEAL-08     | TBD   | Pending |
| MEAL-09     | TBD   | Pending |
| SHOP-01     | TBD   | Pending |
| SHOP-02     | TBD   | Pending |
| SHOP-03     | TBD   | Pending |
| SHOP-04     | TBD   | Pending |
| SHOP-05     | TBD   | Pending |
| SHOP-06     | TBD   | Pending |
| SHOP-07     | TBD   | Pending |
| SHOP-08     | TBD   | Pending |
| SHOP-09     | TBD   | Pending |

**Coverage:**

- v1 requirements: 33 total
- Mapped to phases: 0 (pending roadmap creation)
- Unmapped: 33 ⚠️

---

_Requirements defined: 2026-02-18_
_Last updated: 2026-02-18 after initial definition_
