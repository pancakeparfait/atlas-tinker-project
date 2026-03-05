# Codebase Structure

**Analysis Date:** 2026-02-18

## Directory Layout

```
tinker-project/
├── .claude/                    # Claude AI skill definitions
├── .github/                    # GitHub Copilot instructions
├── .next/                      # Next.js build output (generated)
├── .planning/                  # GSD codebase analysis documents
│   └── codebase/              # Architecture and structure docs
├── docker/                     # Docker configuration files
│   └── postgres/              # PostgreSQL initialization scripts
├── docs/                       # Project documentation
│   └── ai/                    # AI-generated plans and features
├── node_modules/              # npm dependencies (generated)
├── prisma/                     # Database schema and migrations
│   ├── migrations/            # Prisma migration history
│   ├── schema.prisma          # Database schema definition
│   └── seed.ts                # Database seeding script
├── src/                        # Application source code
│   ├── app/                   # Next.js 16 App Router
│   ├── components/            # React components
│   ├── lib/                   # Shared utilities and logic
│   └── styles/                # Global styles
├── .env                        # Environment variables (local)
├── .env.example               # Environment variable template
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier code formatting config
├── AGENTS.md                  # Agent instructions for AI assistants
├── docker-compose.yml         # Docker services orchestration
├── jest.config.js             # Jest testing framework config
├── next.config.js             # Next.js configuration
├── package.json               # npm dependencies and scripts
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript compiler configuration
```

## Directory Purposes

**`src/app/`:**

- Purpose: Next.js 16 App Router pages, layouts, and API routes
- Contains: Page components, layouts, route handlers
- Key files: `layout.tsx` (root layout), `page.tsx` (home page)
- Subdirectories: `api/` (API routes), `recipes/` (recipe pages)

**`src/app/api/`:**

- Purpose: RESTful API endpoints
- Contains: Route handlers (route.ts files)
- Key subdirectories: `recipes/` (recipe CRUD), `recipes/[id]/` (detail operations), `recipes/import/` (recipe import)

**`src/app/recipes/`:**

- Purpose: Recipe feature pages
- Contains: List view, detail view, create/edit pages
- Key files: `page.tsx` (list), `[id]/page.tsx` (detail), `new/page.tsx` (create), `[id]/edit/page.tsx` (edit)

**`src/components/`:**

- Purpose: Reusable React components
- Contains: Feature components, layout components, UI primitives, providers
- Key subdirectories: `ui/` (design system), `recipes/` (recipe-specific), `layout/` (header, sidebar)

**`src/components/ui/`:**

- Purpose: Shadcn/ui-style design system primitives
- Contains: Button, Input, Card, Badge, Select, Textarea, Label components
- Pattern: Radix UI-based, styled with Tailwind CSS
- All files follow naming: `component-name.tsx`

**`src/components/recipes/`:**

- Purpose: Recipe-specific feature components
- Contains: Forms, import review UI, ingredient lists, instruction steps
- Key files: `recipe-form.tsx`, `recipe-form-schema.ts`, `import-review.tsx`, `ingredient-list.tsx`, `instruction-steps.tsx`

**`src/components/layout/`:**

- Purpose: App-wide layout components
- Contains: Navigation and structure components
- Key files: `header.tsx`, `sidebar.tsx`

**`src/lib/`:**

- Purpose: Shared utilities, business logic, and data access
- Contains: Query hooks, storage adapters, recipe importers, utilities
- Key files: `prisma.ts` (database singleton), `utils.ts` (helpers)

**`src/lib/queries/`:**

- Purpose: TanStack Query hooks for data fetching
- Contains: Query and mutation hooks, fetch functions, query key factories
- Key files: `recipe-queries.ts`, `import-queries.ts`

**`src/lib/storage/`:**

- Purpose: Image storage abstraction using Strategy pattern
- Contains: StorageAdapter interface and implementations
- Key files: `storage-adapter.ts` (interface), `database-adapter.ts` (PostgreSQL impl), `index.ts` (exports)

**`src/lib/recipe-importers/`:**

- Purpose: Recipe parsing from external URLs
- Contains: Multi-strategy parser implementations, validation
- Key files: `importer.ts` (orchestrator), `json-ld-parser.ts`, `generic-html-parser.ts`, `validation.ts`
- Key subdirectory: `__tests__/` (Jest tests for parsers)

**`src/lib/__tests__/`:**

- Purpose: Unit tests for lib utilities
- Contains: Jest tests for utility functions
- Key files: `utils.test.ts`

**`src/styles/`:**

- Purpose: Global CSS and Tailwind configuration
- Contains: Tailwind directives, CSS variables
- Key files: `globals.css`

**`prisma/`:**

- Purpose: Database schema, migrations, and seeding
- Contains: Prisma schema file, migration SQL files, seed script
- Key files: `schema.prisma`, `seed.ts`

**`prisma/migrations/`:**

- Purpose: Database migration history
- Contains: Timestamped migration folders with SQL
- Key migrations: `20251112174927_initial`, `20251119180113_add_recipe_image`

**`docker/`:**

- Purpose: Docker configuration for services
- Contains: PostgreSQL initialization scripts
- Key subdirectory: `postgres/`

**`.github/`:**

- Purpose: GitHub-specific configuration
- Contains: Copilot instructions for AI-assisted coding
- Key files: `copilot-instructions.md`

**`.claude/`:**

- Purpose: Claude AI skill definitions
- Contains: Skill specifications for app control
- Key subdirectory: `skills/app-control/`

**`docs/`:**

- Purpose: Project documentation
- Contains: AI-generated implementation plans and feature docs
- Key subdirectory: `ai/` (AI-generated content)

## Key File Locations

**Entry Points:**

- `src/app/layout.tsx`: Root layout with Providers, Sidebar, Header
- `src/app/page.tsx`: Home page (dashboard)
- `src/app/recipes/page.tsx`: Recipe list (main feature entry)

**Configuration:**

- `next.config.js`: Next.js configuration
- `tailwind.config.js`: Tailwind CSS theme and plugins
- `tsconfig.json`: TypeScript compiler options
- `.eslintrc.json`: Linting rules
- `.prettierrc`: Code formatting rules
- `jest.config.js`: Test runner configuration
- `postcss.config.js`: PostCSS plugins
- `docker-compose.yml`: PostgreSQL service definition

**Core Logic:**

- `src/lib/prisma.ts`: Database client singleton
- `src/lib/queries/recipe-queries.ts`: Recipe CRUD hooks
- `src/lib/recipe-importers/importer.ts`: Recipe import orchestrator
- `src/lib/storage/index.ts`: Storage adapter facade

**Testing:**

- `jest.setup.js`: Jest global setup
- `src/lib/__tests__/utils.test.ts`: Utility function tests
- `src/lib/recipe-importers/__tests__/json-ld-parser.test.ts`: Parser tests
- `src/app/recipes/[id]/__tests__/page.test.tsx`: Page component tests
- `src/app/recipes/[id]/edit/__tests__/page.test.tsx`: Edit page tests

**API Routes:**

- `src/app/api/recipes/route.ts`: GET (list), POST (create)
- `src/app/api/recipes/[id]/route.ts`: GET (detail), PUT (update), DELETE
- `src/app/api/recipes/import/route.ts`: POST (import from URL)
- `src/app/api/recipes/[id]/image/route.ts`: GET, PUT, DELETE (image operations)

**Database:**

- `prisma/schema.prisma`: Data model (Recipe, Ingredient, RecipeIngredient, MealPlan, etc.)
- `prisma/seed.ts`: Sample data for development

**Environment:**

- `.env`: Local environment variables (DATABASE_URL, etc.)
- `.env.example`: Template for required variables

## Naming Conventions

**Files:**

- Components: `kebab-case.tsx` (e.g., `recipe-form.tsx`, `ingredient-list.tsx`)
- Pages: `page.tsx` (Next.js App Router convention)
- Layouts: `layout.tsx` (Next.js App Router convention)
- API routes: `route.ts` (Next.js App Router convention)
- Tests: `*.test.ts` or `*.test.tsx`
- Schemas: `*-schema.ts` (e.g., `recipe-form-schema.ts`)

**Directories:**

- Feature folders: `kebab-case` (e.g., `recipe-importers`)
- Dynamic routes: `[param]` (e.g., `[id]`)
- UI components: `kebab-case` (e.g., `ui`)

**Components:**

- React components: `PascalCase` (e.g., `RecipeForm`, `IngredientList`)
- File name matches default export: `recipe-form.tsx` exports `RecipeForm`

**Functions:**

- Regular functions: `camelCase` (e.g., `fetchRecipes`, `parseJsonLd`)
- React hooks: `use*` prefix (e.g., `useRecipes`, `useImportRecipe`)
- Async functions: Explicit `async` keyword, return `Promise<T>`

**Variables:**

- Local variables: `camelCase` (e.g., `searchQuery`, `importResult`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MEAL_CATEGORIES`, `IMAGE_CONFIG`)
- Query keys: `camelCase` with factory pattern (e.g., `recipeKeys.detail(id)`)

**Types:**

- Interfaces: `PascalCase` (e.g., `Recipe`, `RecipeInput`, `StorageAdapter`)
- Type aliases: `PascalCase` (e.g., `RecipeFormData`, `ImportResult`)
- Props interfaces: `*Props` suffix (e.g., `RecipeFormProps`)

## Where to Add New Code

**New Feature:**

- Primary code: `src/app/[feature]/page.tsx` for pages, `src/lib/[feature]/` for logic
- Tests: Co-located `__tests__/` directory or adjacent `.test.ts` files
- API routes: `src/app/api/[feature]/route.ts`

**New Recipe Feature:**

- UI component: `src/components/recipes/[component-name].tsx`
- Query hook: Add to `src/lib/queries/recipe-queries.ts`
- API endpoint: `src/app/api/recipes/[endpoint]/route.ts`

**New Component/Module:**

- Implementation: `src/components/ui/[component-name].tsx` for primitives
- Feature-specific: `src/components/[feature]/[component-name].tsx`
- Ensure default export matches file name

**Utilities:**

- Shared helpers: `src/lib/utils.ts` (small utilities) or `src/lib/[domain]/` (domain-specific)
- Query helpers: `src/lib/queries/`
- Validation schemas: Co-locate with component or in `src/lib/schemas/`

**Database Changes:**

- Schema: Edit `prisma/schema.prisma`
- Migration: Run `pnpm db:migrate` to generate migration
- Seed data: Edit `prisma/seed.ts`

**New Page:**

- App Router page: `src/app/[route]/page.tsx`
- Dynamic route: `src/app/[route]/[param]/page.tsx`
- Use 'use client' directive if needs interactivity, otherwise Server Component

**New API Route:**

- REST endpoint: `src/app/api/[resource]/route.ts`
- Nested route: `src/app/api/[resource]/[param]/route.ts`
- Always export named functions: `GET`, `POST`, `PUT`, `DELETE`
- Always `await params` in dynamic routes (Next.js 16 requirement)

**New Test:**

- Component tests: Adjacent `__tests__/` folder or `[component].test.tsx`
- Util tests: `src/lib/__tests__/[util].test.ts`
- Integration tests: `src/app/[feature]/__tests__/[page].test.tsx`

## Special Directories

**`.next/`:**

- Purpose: Next.js build output and cache
- Generated: Yes (build time)
- Committed: No (gitignored)

**`node_modules/`:**

- Purpose: npm package dependencies
- Generated: Yes (pnpm install)
- Committed: No (gitignored)

**`prisma/migrations/`:**

- Purpose: Database migration history
- Generated: Yes (pnpm db:migrate)
- Committed: Yes (version controlled)

**`coverage/`:**

- Purpose: Jest test coverage reports
- Generated: Yes (when running tests with coverage)
- Committed: No (gitignored)

**`.planning/`:**

- Purpose: GSD codebase analysis documents
- Generated: Yes (by AI agents)
- Committed: Yes (documentation)

**`src/components/ui/`:**

- Purpose: shadcn/ui components (NOT from npm, code-based)
- Generated: Partially (via shadcn CLI, then customized)
- Committed: Yes (part of codebase)
- Note: These are NOT node_modules dependencies - they are source files

**`__tests__/`:**

- Purpose: Jest test files co-located with code
- Generated: No (manually written)
- Committed: Yes

---

_Structure analysis: 2026-02-18_
