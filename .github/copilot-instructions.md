# Recipe Organizer - AI Agent Instructions

## Project Overview
A full-stack recipe organizer and meal planner built with Next.js 16, React 18, TypeScript, PostgreSQL/Prisma, and TanStack Query. Currently in Phase 1 (single-user development) - authentication and multi-user features deferred to Phase 2.

## Critical Next.js 16 Pattern
**MUST await `params` in all dynamic route handlers** - This is a breaking change in Next.js 15+:

```typescript
// ✅ CORRECT - Next.js 16 requires this
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ... use id
}

// ❌ WRONG - Will fail in Next.js 16
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const recipe = await prisma.recipe.findUnique({ where: { id: params.id } });
}
```

Also await in catch blocks when logging: `const { id } = await params;` before using in error messages.

## Database & Data Layer

### Instructions Field - Dual Format Handling
The `instructions` field in `recipes` table stores JSON that may be **either** string array OR object array (legacy):

```typescript
// Database may contain EITHER format:
// ["Step 1", "Step 2"]  OR  [{"step": 1, "instruction": "Step 1"}]

// ALWAYS transform in API responses:
let instructionsArray: string[] = [];
if (Array.isArray(recipe.instructions)) {
  instructionsArray = recipe.instructions.map((inst: any) => {
    if (typeof inst === 'string') return inst;
    if (inst?.instruction) return inst.instruction;
    return String(inst);
  });
}
```

See `src/app/api/recipes/[id]/route.ts` and `src/app/api/recipes/route.ts` for implementation examples.

### Prisma Patterns
- Singleton instance at `src/lib/prisma.ts` prevents hot-reload connection issues
- Always use transactions (`prisma.$transaction`) for multi-table operations
- Ingredient lookup/creation pattern: `findUnique` → `create` if not exists (see recipe creation)
- Include related data explicitly: `include: { ingredients: { include: { ingredient: true } } }`

### Database Commands
```bash
pnpm db:migrate      # Run migrations
pnpm db:seed         # Seed with sample data
pnpm db:studio       # Open Prisma Studio
docker-compose up -d postgres  # Start local PostgreSQL
```

## State Management Architecture

### TanStack Query (React Query)
- Configured in `src/components/providers.tsx` (1min stale time, 1 retry)
- Query hooks in `src/lib/queries/recipe-queries.ts` follow hierarchical key pattern:
  - `['recipes']` → all recipes queries
  - `['recipes', 'list']` → list queries
  - `['recipes', 'detail', id]` → single recipe
- Mutations automatically invalidate related queries (see `useCreateRecipe`, `useDeleteRecipe`)
- **Never call hooks conditionally** - always at component top level

### Form State
- React Hook Form + Zod validation (schemas in `src/components/recipes/recipe-form-schema.ts`)
- `useFieldArray` for dynamic ingredient/instruction lists
- FormProvider context for nested form components (see `recipe-form.tsx`)

## Component Patterns

### UI Components
- Built on **Radix UI primitives** (not Material-UI or Chakra)
- Located in `src/components/ui/` (shadcn/ui style)
- Import from `@/components/ui/button`, NOT from external libraries
- Use `lucide-react` for icons, NOT `@mui/icons-material`

### Styling
- Tailwind CSS utility classes exclusively
- `cn()` helper from `src/lib/utils.ts` for conditional classes:
  ```typescript
  className={cn("base-classes", condition && "conditional-classes")}
  ```
- Responsive: mobile-first with `md:`, `lg:` breakpoints (1024px for desktop layouts)

### Client/Server Components
- App Router defaults to Server Components
- Add `'use client'` when using:
  - React hooks (useState, useEffect, etc.)
  - TanStack Query hooks
  - Event handlers (onClick, onChange, etc.)
  - Browser APIs

## API Route Patterns

### Route Structure
- `/api/recipes` - List (GET), Create (POST)
- `/api/recipes/[id]` - Get (GET), Update (PUT), Delete (DELETE)
- `/api/recipes/[id]/image` - Image operations (GET, PUT, DELETE)

### Request/Response Flow
1. **Validate input** with Zod schemas (throw ZodError for 400 responses)
2. **Database operations** (use transactions for multi-step)
3. **Serialize dates** to ISO strings (Next.js can't serialize Date objects)
4. **Transform instructions** from DB format to string array
5. **Error handling** with specific error types:

```typescript
try {
  // ... operation
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
  }
  return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
}
```

## Storage Adapter Pattern
Images use a **Strategy pattern** via `src/lib/storage/`:
- `StorageAdapter` interface defines contract
- `DatabaseStorageAdapter` stores in PostgreSQL Bytes field (current)
- Switch implementation in `src/lib/storage/index.ts` (future: S3, Cloudinary)
- Access in API: `storageAdapter.getImage(id)`, `storageAdapter.saveImage(id, buffer, metadata)`

## Recipe Import System
Multi-strategy parser at `src/lib/recipe-importers/`:
1. **JSON-LD parser** - structured data from recipe websites
2. **Generic HTML parser** - fallback with heuristics
3. Returns `ImportResult` with confidence scores per field
4. See `import-review.tsx` for UI that shows confidence indicators

## Testing

### Setup
```bash
pnpm test              # Run Jest tests
pnpm test:watch        # Watch mode
```

### Patterns
- Tests in `__tests__/` subdirectories or `.test.ts` files
- Use `ts-jest` preset
- Path alias `@/` resolves to `src/`
- See `src/lib/recipe-importers/__tests__/json-ld-parser.test.ts` for examples

## Code Organization

### File Structure
```
src/
├── app/                    # Next.js App Router
│   ├── recipes/[id]/      # Dynamic routes
│   ├── api/               # API routes (avoid nested route handlers in same folder)
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── ui/                # Reusable primitives (button, card, etc.)
│   ├── layout/            # Layout components (header, sidebar)
│   └── recipes/           # Feature-specific components
├── lib/
│   ├── queries/           # TanStack Query hooks
│   ├── storage/           # Storage adapter implementations
│   └── recipe-importers/  # Recipe parsing strategies
└── styles/
    └── globals.css        # Tailwind directives
```

### Import Paths
- Use `@/` alias for all internal imports: `import { Button } from '@/components/ui/button'`
- Never use relative imports beyond one level: `import '../../../lib/utils'` ❌

## Enums & Constants
- Database enums via Prisma: `MealCategory`, `DifficultyLevel`
- UI constants: `MEAL_CATEGORIES`, `DIFFICULTY_LEVELS` (label + value pairs)
- Units: `COMMON_UNITS` array in `recipe-form-schema.ts`

## Development Workflow

### Docker Database
```bash
docker-compose up -d postgres   # Start PostgreSQL
docker-compose down             # Stop services
docker-compose logs postgres    # View logs
```
Database runs on port 5432 (user: postgres, password: password, db: recipe_organizer)

### Environment Variables
- Copy `.env.example` to `.env.local` and `.env`
- Default `DATABASE_URL` configured for Docker setup
- No authentication keys needed in Phase 1

## Common Pitfalls

1. **Forgetting to await params** in Next.js 16 dynamic routes → 500 errors
2. **Not transforming instructions** from DB → frontend receives objects instead of strings
3. **Conditional hook calls** → "Rendered more hooks than previous render" error
4. **Missing 'use client' directive** → "useState used in Server Component" error
5. **Importing wrong UI library** → Use `@/components/ui/*`, not external libraries
6. **Date serialization** → Always convert to ISO string in API responses

## Phase 1 Scope (Current)
- Single-user application (no auth required)
- Recipe CRUD, search, import from URLs
- Ingredient management with autocomplete
- Image upload to database
- Focus: Core functionality without user management

## Future Phases (Not Yet Implemented)
- Phase 2: NextAuth.js, multi-user, user relations
- Phase 3: Meal planning, shopping lists
- Phase 4: Social features, recipe sharing
- Don't implement these features unless explicitly requested

## Key Files Reference
- **API patterns**: `src/app/api/recipes/[id]/route.ts`
- **Query hooks**: `src/lib/queries/recipe-queries.ts`
- **Form validation**: `src/components/recipes/recipe-form-schema.ts`
- **Storage abstraction**: `src/lib/storage/index.ts`
- **Database schema**: `prisma/schema.prisma`
- **Recipe import**: `src/lib/recipe-importers/importer.ts`
