# Architecture

**Analysis Date:** 2026-02-18

## Pattern Overview

**Overall:** Next.js 16 App Router with Server-First Architecture and Client Islands

**Key Characteristics:**

- Server Components by default with selective client-side interactivity
- API routes co-located with pages in App Router
- React Server Components for data fetching pages
- Client Components for interactive forms and state management
- Strategy Pattern for external integrations (storage, recipe import)

## Layers

**Presentation Layer (Client Components):**

- Purpose: Interactive UI components with client-side state
- Location: `src/components/` and client-marked pages in `src/app/`
- Contains: Forms, TanStack Query hooks, event handlers
- Depends on: Query hooks from `src/lib/queries/`, UI primitives from `src/components/ui/`
- Used by: Page components in `src/app/`

**Presentation Layer (Server Components):**

- Purpose: Static page shells and layouts with SSR
- Location: `src/app/` (pages without 'use client')
- Contains: Layouts, metadata configuration
- Depends on: UI components from `src/components/`
- Used by: Next.js App Router

**API Layer:**

- Purpose: RESTful API endpoints for CRUD operations
- Location: `src/app/api/`
- Contains: Route handlers with Zod validation, Prisma queries
- Depends on: `src/lib/prisma.ts`, `src/lib/storage/`, `src/lib/recipe-importers/`
- Used by: Client-side fetch functions in `src/lib/queries/`

**Query/State Management Layer:**

- Purpose: Client-side data fetching and caching abstraction
- Location: `src/lib/queries/`
- Contains: TanStack Query hooks, query key factories
- Depends on: API layer (`/api/*` endpoints)
- Used by: Client Components

**Data Access Layer:**

- Purpose: Database operations and ORM
- Location: `src/lib/prisma.ts`, Prisma schema in `prisma/schema.prisma`
- Contains: Singleton Prisma client, database models
- Depends on: PostgreSQL database, Prisma Client
- Used by: API route handlers

**Domain Logic Layer:**

- Purpose: Business logic for recipe importing and storage
- Location: `src/lib/recipe-importers/`, `src/lib/storage/`
- Contains: Strategy implementations, validation logic
- Depends on: External APIs (fetch), Prisma client
- Used by: API routes

**UI Primitives Layer:**

- Purpose: Reusable design system components
- Location: `src/components/ui/`
- Contains: Radix UI-based components (Button, Input, Card, etc.)
- Depends on: Radix UI primitives, Tailwind CSS
- Used by: All presentation components

## Data Flow

**Recipe List View (Read):**

1. User navigates to `/recipes` → Server Component renders page shell
2. Client Component mounts → `useRecipes()` hook triggers
3. TanStack Query calls `fetchRecipes()` → GET `/api/recipes`
4. API route validates query params with Zod
5. Prisma query fetches from PostgreSQL with joins
6. API serializes Date objects to ISO strings, transforms legacy instructions format
7. TanStack Query caches response, component renders

**Recipe Creation (Write):**

1. User fills form in `<RecipeForm>` (Client Component)
2. React Hook Form validates against Zod schema
3. User submits → `useCreateRecipe()` mutation triggers
4. Mutation calls POST `/api/recipes` with JSON body
5. API route validates with Zod schema
6. Prisma transaction: Create Recipe → Find/Create Ingredients → Link via RecipeIngredient
7. API returns created recipe with ID
8. TanStack Query invalidates `recipeKeys.lists()` cache
9. Router redirects to recipe detail page

**Recipe Import (Complex Flow):**

1. User enters URL in `<RecipeForm>` import field
2. `useImportRecipe()` mutation calls POST `/api/recipes/import`
3. API route calls `importRecipeFromUrl()` orchestrator
4. Orchestrator fetches HTML from external URL
5. Strategy 1: `parseJsonLd()` attempts JSON-LD extraction
6. Strategy 2: `parseGenericHtml()` fills gaps with HTML parsing
7. `validateImportedRecipe()` ensures required fields
8. API returns ImportResult with confidence scores
9. Component shows `<ImportReview>` for user verification
10. User accepts → Form populated with imported data → Create flow

**State Management:**

- Server state: TanStack Query with hierarchical cache keys (`recipeKeys.all`, `recipeKeys.detail(id)`)
- Form state: React Hook Form with Zod validation
- UI state: Local `useState` in components
- Global state: QueryClient in `<Providers>` wrapping app

## Key Abstractions

**StorageAdapter (Strategy Pattern):**

- Purpose: Abstraction for image storage backend
- Examples: `src/lib/storage/storage-adapter.ts` (interface), `src/lib/storage/database-adapter.ts` (implementation)
- Pattern: Strategy pattern allows swapping PostgreSQL storage for cloud storage (S3, Cloudinary) without changing API routes
- Current implementation: DatabaseStorageAdapter stores images as Bytes in Prisma

**Recipe Importer Strategies:**

- Purpose: Multiple parsing approaches for external recipe URLs
- Examples: `src/lib/recipe-importers/json-ld-parser.ts`, `src/lib/recipe-importers/generic-html-parser.ts`
- Pattern: Orchestrator (`importer.ts`) tries JSON-LD first, falls back to HTML scraping
- Confidence scoring system tracks which fields were auto-extracted vs. need manual review

**Query Key Factory:**

- Purpose: Hierarchical cache invalidation for TanStack Query
- Examples: `recipeKeys` in `src/lib/queries/recipe-queries.ts`
- Pattern: Nested arrays enable invalidating all recipes or specific detail views
- Structure: `['recipes']` → `['recipes', 'list']` → `['recipes', 'detail', id]`

**Prisma Singleton:**

- Purpose: Prevent connection pool exhaustion in dev mode
- Examples: `src/lib/prisma.ts`
- Pattern: Global variable caching prevents Next.js hot reload from creating new clients
- Critical for development environment stability

## Entry Points

**Root Layout:**

- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: HTML shell, font loading, QueryClient provider, app-wide layout (Sidebar + Header)

**Home Page:**

- Location: `src/app/page.tsx`
- Triggers: Root URL `/`
- Responsibilities: Dashboard with placeholder stats (Server Component)

**Recipe List Page:**

- Location: `src/app/recipes/page.tsx`
- Triggers: `/recipes` route
- Responsibilities: Search, filter, grid display of recipes (Client Component using TanStack Query)

**Recipe Detail Page:**

- Location: `src/app/recipes/[id]/page.tsx`
- Triggers: `/recipes/[id]` dynamic route
- Responsibilities: Display full recipe, edit/delete actions (Client Component)

**Recipe Create/Edit:**

- Location: `src/app/recipes/new/page.tsx`, `src/app/recipes/[id]/edit/page.tsx`
- Triggers: `/recipes/new`, `/recipes/[id]/edit`
- Responsibilities: Form wrapper rendering `<RecipeForm>` with different modes

**API Routes:**

- Location: `src/app/api/recipes/route.ts` (GET, POST), `src/app/api/recipes/[id]/route.ts` (GET, PUT, DELETE)
- Triggers: Client-side fetch calls from query hooks
- Responsibilities: Zod validation, Prisma queries, date serialization, error handling

**API Import Route:**

- Location: `src/app/api/recipes/import/route.ts`
- Triggers: POST from `useImportRecipe()` hook
- Responsibilities: Orchestrate multi-strategy recipe parsing from external URLs

**API Image Route:**

- Location: `src/app/api/recipes/[id]/image/route.ts`
- Triggers: PUT/DELETE for image uploads
- Responsibilities: Validate images, delegate to StorageAdapter, update recipe metadata

## Error Handling

**Strategy:** Layered error handling with progressive user feedback

**Patterns:**

- API routes: Try-catch blocks with Zod error discrimination, return HTTP status codes
- Zod validation: `z.ZodError` → 400 responses with field-level error details
- Database errors: Generic 500 responses to avoid leaking schema details
- Query hooks: TanStack Query error states exposed to components
- Form validation: React Hook Form displays field errors inline
- Critical Next.js 16 pattern: Always `await params` in dynamic routes to avoid 500 errors

**Error Boundary Strategy:**

- No app-level error boundary (Phase 1 simplicity)
- Component-level error states with conditional rendering
- Console logging for server-side errors

**Date Serialization Pattern:**

- All API responses manually serialize `Date` objects to ISO strings
- Required because Next.js JSON serialization doesn't handle Prisma Date objects
- Pattern: `createdAt: recipe.createdAt.toISOString()`

**Legacy Data Transformation:**

- Instructions field may be `string[]` or `object[]` (legacy format)
- All API GET endpoints transform to `string[]` for consistency
- Pattern: Map over array, check typeof, extract `.instruction` property if object

## Cross-Cutting Concerns

**Logging:**

- Console.log in API routes for errors
- No structured logging framework (Phase 1)

**Validation:**

- Zod schemas at API boundary
- Duplicate Zod schemas in `src/components/recipes/recipe-form-schema.ts` for client-side validation
- Prisma schema provides database-level constraints

**Authentication:**

- Not implemented (Phase 1 is single-user)
- No middleware protection on routes
- Future: Clerk or NextAuth.js integration planned

**Authorization:**

- Not applicable (single-user Phase 1)

**Transaction Management:**

- Prisma `$transaction` for multi-table writes (Recipe + Ingredients creation)
- Ensures atomicity when creating RecipeIngredient join records

**Image Handling:**

- Max 10MB, allowed MIME types: jpeg, jpg, png, webp, gif
- Validation in `IMAGE_CONFIG` constant in `src/lib/storage/storage-adapter.ts`
- Current storage: PostgreSQL BYTEA column
- Strategy pattern enables future migration to cloud storage

---

_Architecture analysis: 2026-02-18_
