# Agent Instructions - Recipe Organizer

**Project Type:** Full-stack Next.js 16 application with TypeScript, PostgreSQL/Prisma, TanStack Query  
**Current Phase:** Phase 1 (single-user, no authentication)

---

## Quick Reference Commands

### Development

```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript type checking (tsc --noEmit)
```

### Testing

```bash
pnpm test             # Run all Jest tests
pnpm test:watch       # Jest watch mode
pnpm test <pattern>   # Run specific test file/pattern
pnpm test -t "test name"  # Run specific test by name
```

**Examples:**

- `pnpm test json-ld-parser` - Run specific test file
- `pnpm test -t "Compound Measurements"` - Run specific test case

### Database (Prisma)

```bash
pnpm db:migrate       # Run migrations (dev mode)
pnpm db:seed          # Seed with sample data
pnpm db:studio        # Open Prisma Studio GUI
pnpm db:generate      # Generate Prisma client
pnpm db:reset         # Reset database (WARNING: deletes data)

docker-compose up -d postgres   # Start PostgreSQL
docker-compose down             # Stop services
```

---

## Critical Next.js 16 Pattern

**MUST await `params` in all dynamic route handlers** - Breaking change in Next.js 15+:

```typescript
// ✅ CORRECT
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const recipe = await prisma.recipe.findUnique({ where: { id } })
}

// Also await in catch blocks
catch (error) {
  const { id } = await params
  console.error(`GET /api/recipes/${id} error:`, error)
}
```

---

## Code Style

### Imports

- **Always use `@/` path alias** for internal imports
- Never use relative imports beyond one level

```typescript
// ✅ CORRECT
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { useRecipes } from '@/lib/queries/recipe-queries'

// ❌ WRONG
import { Button } from '../../../components/ui/button'
```

**Import Order:**

1. External packages (React, Next.js, third-party)
2. Internal UI components (`@/components/ui/*`)
3. Internal feature components (`@/components/*`)
4. Internal libraries (`@/lib/*`)
5. Types and schemas
6. Icons (lucide-react)

### Formatting (Prettier)

- **No semicolons** (`semi: false`)
- **Single quotes** for strings
- **2 spaces** for indentation
- **80 character** line length
- **Trailing commas** where valid in ES5

```typescript
// Example
const obj = {
  name: 'Recipe',
  ingredients: ['flour', 'sugar'],
}
```

### TypeScript

- **Strict mode enabled** - all strict checks on
- Use `interface` for object shapes and component props
- Use `type` for unions, intersections, and Zod inferences
- Prefer explicit return types for exported functions

```typescript
// Interface for props
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive'
}

// Type from Zod
export type RecipeFormData = z.infer<typeof RecipeSchema>
```

### Naming Conventions

- **Files:** kebab-case (`recipe-form.tsx`, `ingredient-list.tsx`)
- **Components:** PascalCase (`RecipeForm`, `IngredientList`)
- **Variables/Functions:** camelCase (`isLoading`, `fetchRecipes`)
- **Constants:** UPPER_SNAKE_CASE (`MEAL_CATEGORIES`, `IMAGE_CONFIG`)

### Conditional Classes

Use `cn()` helper from `@/lib/utils`:

```typescript
import { cn } from '@/lib/utils'

className={cn(
  'base-classes',
  condition && 'conditional-classes',
  variant === 'primary' && 'primary-classes'
)}
```

---

## Component Patterns

### Client vs Server Components

App Router defaults to **Server Components**. Add `'use client'` when using:

- React hooks (useState, useEffect, etc.)
- TanStack Query hooks
- Event handlers (onClick, onChange)
- Browser APIs

### UI Components

- Built on **Radix UI primitives** (NOT Material-UI or Chakra)
- Located in `src/components/ui/` (shadcn/ui style)
- Use **lucide-react** for icons

```typescript
import { Button } from '@/components/ui/button' // ✅
import { Check, X } from 'lucide-react' // ✅
```

---

## State Management

### TanStack Query

- Query hooks in `src/lib/queries/recipe-queries.ts`
- Hierarchical key pattern:
  ```typescript
  export const recipeKeys = {
    all: ['recipes'] as const,
    lists: () => [...recipeKeys.all, 'list'] as const,
    detail: (id: string) => [...recipeKeys.all, 'detail', id] as const,
  }
  ```
- **Never call hooks conditionally** - always at component top level
- Mutations auto-invalidate related queries

### Form State

- React Hook Form + Zod validation
- Schemas in `src/components/recipes/recipe-form-schema.ts`
- Use `FormProvider` for nested components
- Use `useFieldArray` for dynamic lists

---

## API Routes

### Error Handling Pattern

```typescript
try {
  // 1. Validate with Zod
  const data = CreateRecipeSchema.parse(body)

  // 2. Database operation
  const recipe = await prisma.recipe.create({ data })

  // 3. Serialize dates to ISO strings
  // 4. Return response
  return NextResponse.json(serialized, { status: 201 })
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid data', details: error.errors },
      { status: 400 }
    )
  }
  console.error('POST /api/recipes error:', error)
  return NextResponse.json(
    { error: 'Failed to create recipe' },
    { status: 500 }
  )
}
```

### Instructions Field Handling

The `instructions` field may be **string[] OR object[]** (legacy). Always transform:

```typescript
let instructionsArray: string[] = []
if (Array.isArray(recipe.instructions)) {
  instructionsArray = recipe.instructions.map((inst: any) => {
    if (typeof inst === 'string') return inst
    if (inst?.instruction) return inst.instruction
    return String(inst)
  })
}
```

---

## Database Patterns

### Prisma Singleton

Import from `src/lib/prisma.ts` - prevents hot-reload connection issues:

```typescript
import { prisma } from '@/lib/prisma'
```

### Best Practices

- Use transactions for multi-table operations: `prisma.$transaction`
- Include related data explicitly: `include: { ingredients: true }`
- Always serialize Date objects to ISO strings in API responses

---

## File Organization

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── recipes/       # Recipe CRUD endpoints
│   ├── recipes/           # Recipe pages
│   └── layout.tsx         # Root layout with providers
├── components/
│   ├── ui/                # Reusable UI primitives (shadcn/ui)
│   ├── layout/            # Header, Sidebar
│   └── recipes/           # Feature-specific components
├── lib/
│   ├── queries/           # TanStack Query hooks
│   ├── storage/           # Storage adapter (Strategy pattern)
│   ├── recipe-importers/  # Recipe parsing strategies
│   └── prisma.ts          # Prisma singleton
└── styles/
    └── globals.css        # Tailwind directives
```

---

## ESLint Rules

- `@typescript-eslint/no-unused-vars`: **error**
- `@typescript-eslint/no-explicit-any`: **warn** (discouraged but allowed)
- `prefer-const`: **error**
- `no-var`: **error** (use const/let only)

---

## Common Pitfalls

1. **Forgetting to await params** in Next.js 16 → 500 errors
2. **Not transforming instructions** from DB → frontend receives objects
3. **Conditional hook calls** → "Rendered more hooks" error
4. **Missing 'use client'** → "useState in Server Component" error
5. **Wrong UI imports** → Use `@/components/ui/*`, not external libraries
6. **Date serialization** → Always convert to ISO string in API responses
7. **Relative imports** → Use `@/` alias instead

---

## Additional Resources

See `.github/copilot-instructions.md` for comprehensive patterns including:

- Storage adapter pattern
- Recipe import system
- TanStack Query configuration
- Zod schema patterns
- Docker database setup
- Phase 1 scope and future phases
