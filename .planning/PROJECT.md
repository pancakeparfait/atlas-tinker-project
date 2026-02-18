# Recipe Organizer Enhancement Project

## What This Is

Enhancing an existing Next.js recipe management application with improved ingredient display (fractions), multi-image support, meal planning calendar, and intelligent shopping list generation. This is a brownfield project building on top of a working Phase 1 single-user recipe organizer.

## Core Value

Users can plan their meals visually and generate shopping lists that respect what they already have, making weekly meal prep effortless.

## Requirements

### Validated

Existing capabilities from the codebase:

- ✓ Recipe CRUD operations (create, read, update, delete) — existing
- ✓ Ingredient management with autocomplete — existing
- ✓ Recipe import from URLs (JSON-LD and HTML parsing) — existing
- ✓ Single image storage per recipe (database-backed) — existing
- ✓ Search and filtering recipes — existing
- ✓ Server-side rendering with Next.js 16 App Router — existing
- ✓ TanStack Query for client-side state management — existing
- ✓ Zod validation for forms and API payloads — existing
- ✓ Prisma ORM with PostgreSQL database — existing

### Active

Current milestone scope:

- [ ] Display ingredient quantities as fractions (1/2, 3/4, etc.) instead of decimals
- [ ] Complete fraction display implementation (Steps 3-7 from existing plan)
- [ ] Support multiple images per recipe (not just one)
- [ ] Calendar view for meal planning (multi-week)
- [ ] Assign one or more recipes to a meal slot
- [ ] Add freeform notes to meal slots ("Order takeout", "Leftovers")
- [ ] Auto-generate shopping lists from meal plan
- [ ] Maintain staples inventory (items always on hand)
- [ ] Exclude staples from generated shopping lists
- [ ] Manual editing of shopping lists (add/remove items)

### Out of Scope

- Real-time collaboration — Single-user Phase 1
- Authentication/multi-user support — Deferred to Phase 2
- Mobile app — Web-first approach
- Recipe sharing/social features — Future consideration
- Nutrition tracking — Not in current scope
- Interactive shopping (checkboxes, store sections) — Keeping lists simple for v1
- Inventory tracking after shopping — Manual list editing only

## Context

### Existing Codebase State

**Technology Stack:**

- Next.js 16.0.4 with App Router and Server Components
- TypeScript 5.3.2 (strict mode enabled)
- PostgreSQL with Prisma 5.7.0 ORM
- TanStack Query 5.8.4 for data fetching
- React Hook Form + Zod for form validation
- Radix UI primitives with Tailwind CSS
- Jest + Testing Library for testing

**Architecture:**

- Server-first with selective client components
- Strategy pattern for storage and recipe importers
- API routes co-located with pages
- Hierarchical TanStack Query cache keys

**Current Features:**

- Recipe CRUD with rich ingredient/instruction management
- Recipe import from external URLs (multi-strategy parsing)
- Image upload (single image, database storage)
- Search and filtering
- Meal category classification (BREAKFAST, LUNCH, DINNER, SNACK, DESSERT)

### Work In Progress

Fraction display feature is partially complete:

- ✅ Step 1: Utility functions created (`gcd()`, `formatQuantityAsFraction()`)
- ✅ Step 2: Unit tests written (34 tests passing)
- ⬜ Step 3: Recipe detail page integration
- ⬜ Step 4-7: Component tests, import review, integration testing, code review

Reference: `docs/ai/plans/Fraction_Display_Implementation_Guide.md`

### Known Patterns

**Critical Next.js 16 Pattern:** Must `await params` in dynamic route handlers (breaking change from Next.js 15)

**Data Transformation:** Instructions field may be `string[]` or `object[]` (legacy format) - all API responses transform to consistent `string[]`

**Date Serialization:** All API responses manually serialize Date objects to ISO strings

**Import Paths:** Always use `@/` alias for internal imports, never relative paths beyond one level

**Storage Pattern:** Strategy pattern via `StorageAdapter` interface allows swapping database storage for cloud storage without changing API code

## Constraints

- **Tech Stack**: Must use existing Next.js 16 + Prisma + PostgreSQL stack — Already established
- **Database**: Single PostgreSQL instance, no external services yet — Phase 1 simplicity
- **Authentication**: No auth required for Phase 1 — Single-user mode
- **Image Storage**: Currently database BYTEA storage, strategy pattern allows future cloud migration — Trade-off for Phase 1 simplicity
- **Timeline**: Incremental delivery preferred — Ship fraction display first, then build meal planning features

## Key Decisions

| Decision                                        | Rationale                                                            | Outcome   |
| ----------------------------------------------- | -------------------------------------------------------------------- | --------- |
| Complete fraction display before new features   | User feedback indicates fractions are highest priority for usability | — Pending |
| Multiple images per recipe                      | Users want to show ingredients, process steps, and final dish        | — Pending |
| Multi-week meal planning calendar               | Users plan 2-3 weeks ahead, especially for busy families             | — Pending |
| Staples inventory for shopping lists            | Reduces list clutter, reflects real-world shopping behavior          | — Pending |
| Simple shopping lists (no interactive features) | Focus on generation logic, defer UI complexity to future phase       | — Pending |

---

_Last updated: 2026-02-18 after initialization_
