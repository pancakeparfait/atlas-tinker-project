# Recipe Organizer - Project Context

## Overview

Enhancing an existing Next.js recipe management application with improved ingredient display (fractions), multi-image support, meal planning calendar, and intelligent shopping list generation. Brownfield project building on a working Phase 1 single-user recipe organizer.

**Core value:** Users can plan their meals visually and generate shopping lists that respect what they already have, making weekly meal prep effortless.

## Current Status

- **Phase 1 (Fraction Display):** Complete
- **Phase 2 (Multi-Image Support):** Complete
- **Phase 3 (Meal Planning Calendar):** In Progress
- **Phase 4 (Shopping List Generation):** Not Started

## Requirements

### Validated Capabilities

- Recipe CRUD operations (create, read, update, delete)
- Ingredient management with autocomplete
- Recipe import from URLs (JSON-LD and HTML parsing)
- Single image storage per recipe (database-backed)
- Search and filtering recipes
- Server-side rendering with Next.js 16 App Router
- TanStack Query for client-side state management
- Zod validation for forms and API payloads
- Prisma ORM with PostgreSQL database

### Active Requirements

**Fraction Display (Phase 1 - Complete):**
- FRAC-01 through FRAC-07: Recipe detail and import review display fractions

**Multi-Image Support (Phase 2 - Complete):**
- IMG-01 through IMG-07: Multiple images per recipe, reorder, thumbnails

**Meal Planning (Phase 3 - In Progress):**
- MEAL-01 through MEAL-09: Calendar view, recipe assignment, notes, persistence
- GitHub Issues: [#1](https://github.com/pancakeparfait/atlas-tinker-project/issues/1), [#2](https://github.com/pancakeparfait/atlas-tinker-project/issues/2), [#3](https://github.com/pancakeparfait/atlas-tinker-project/issues/3), [#4](https://github.com/pancakeparfait/atlas-tinker-project/issues/4)

**Shopping Lists (Phase 4 - Not Started):**
- SHOP-01 through SHOP-09: Staples inventory, list generation, fraction display

## Technology Stack

### Core

- **Framework:** Next.js 16.0.4 with App Router
- **Language:** TypeScript 5.3.2 (strict mode)
- **Database:** PostgreSQL 15 with Prisma 5.7.0 ORM
- **State:** TanStack Query 5.8.4
- **Forms:** React Hook Form + Zod validation
- **UI:** Radix UI primitives + Tailwind CSS 3.3.6
- **Testing:** Jest 30.2.0 + Testing Library

### Key Dependencies

- `@prisma/client` - Database client
- `@tanstack/react-query` - Server state management
- `zod` - Schema validation
- `react-hook-form` - Form state
- `@radix-ui/*` - UI primitives
- `lucide-react` - Icons
- `cheerio` - HTML parsing for recipe import
- `date-fns` - Date manipulation

## Architecture

### Pattern: Server-First with Client Islands

- Server Components by default
- Client Components for interactivity (forms, state, event handlers)
- API routes co-located with pages in App Router

### Layers

1. **Presentation (Client):** Interactive UI with TanStack Query hooks
2. **Presentation (Server):** Static page shells, layouts, metadata
3. **API:** RESTful endpoints with Zod validation
4. **Query/State:** TanStack Query hooks with hierarchical cache keys
5. **Data Access:** Prisma ORM with PostgreSQL
6. **Domain Logic:** Strategy pattern (storage, recipe importers)
7. **UI Primitives:** Radix UI + Tailwind (shadcn/ui style)

### Key Abstractions

- **StorageAdapter:** Strategy pattern for image storage (currently PostgreSQL BYTEA)
- **Recipe Importer:** Multi-strategy parsing (JSON-LD → HTML fallback)
- **Query Key Factory:** Hierarchical cache invalidation (`recipeKeys.all`, `recipeKeys.detail(id)`)
- **Prisma Singleton:** Global variable prevents connection pool exhaustion in dev

## Conventions

### Code Style

- **Formatter:** Prettier (no semicolons, single quotes, 2-space indent, 80 chars)
- **Linter:** ESLint with TypeScript plugin
- **Imports:** Always use `@/` path alias, never relative beyond one level

### Naming

- **Files:** kebab-case (`recipe-form.tsx`)
- **Components:** PascalCase (`RecipeForm`)
- **Functions:** camelCase (`fetchRecipes`)
- **Constants:** UPPER_SNAKE_CASE (`MEAL_CATEGORIES`)
- **Tests:** `*.test.ts` or `*.test.tsx` in `__tests__/` directories

### Critical Patterns

- **Next.js 16:** Must `await params` in dynamic route handlers
- **Date serialization:** All API responses convert Date to ISO strings
- **Instructions field:** Transform `string[] | object[]` to consistent `string[]`
- **Error handling:** Zod validation → 400, Not found → 404, Server error → 500

## Glossary

| Term | Definition |
|------|------------|
| **Recipe** | A cooking instruction with ingredients, steps, and metadata |
| **Ingredient** | A food item with name, quantity, and unit |
| **Meal Plan** | A calendar-based collection of planned meals across date ranges |
| **Planned Meal** | A specific recipe assigned to a date and meal type (breakfast/lunch/dinner) |
| **Shopping List** | Generated list of ingredients needed for a meal plan |
| **Staples** | Items always on hand, excluded from generated shopping lists |
| **Fraction Display** | Formatting decimal quantities as natural fractions (1/2, 3/4) |
| **Recipe Import** | Parsing recipes from external URLs via JSON-LD or HTML scraping |
| **StorageAdapter** | Interface for image storage backend (Strategy pattern) |

## Constraints

- **Tech Stack:** Must use existing Next.js 16 + Prisma + PostgreSQL
- **Database:** Single PostgreSQL instance, no external services
- **Authentication:** No auth for Phase 1 (single-user mode)
- **Image Storage:** Currently database BYTEA, strategy pattern allows future cloud migration
- **Timeline:** Incremental delivery (fractions → images → calendar → shopping)

## Archived Plans

Completed phase plans are archived in `docs/plans/`:
- `docs/plans/01-fraction-display/` — Phase 1 plans and summaries
- `docs/plans/02-multi-image-support/` — Phase 2 plans and summaries

## Known Tech Debt

- Legacy `instructions` field format (string[] vs object[] transformation required)
- Excessive `any` types in recipe import system
- Missing environment variable validation
- API routes untested (priority: high)
- Feature components untested (priority: high)

---

_Last updated: 2026-08-25 after migration from .planning_
