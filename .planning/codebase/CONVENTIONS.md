# Coding Conventions

**Analysis Date:** 2026-02-18

## Naming Patterns

**Files:**

- kebab-case for all files: `recipe-form.tsx`, `ingredient-list.tsx`, `recipe-queries.ts`
- Test files use `*.test.ts` or `*.test.tsx` suffix (NOT `*.spec.*`)
- Colocated tests in `__tests__/` directories

**Functions:**

- camelCase: `fetchRecipes()`, `formatQuantityAsFraction()`, `handleImport()`
- React hooks use `use` prefix: `useRecipes()`, `useCreateRecipe()`, `useDeleteRecipe()`
- Async functions use descriptive verbs: `createRecipe()`, `updateRecipe()`, `deleteRecipe()`

**Variables:**

- camelCase: `importUrl`, `mockRecipeComplete`, `isLoading`
- Boolean variables use `is/has` prefixes: `isLoading`, `isDraft`, `isOptional`, `isPending`

**Types:**

- PascalCase for interfaces: `Recipe`, `RecipeInput`, `RecipeSearchParams`, `ButtonProps`
- Type inference from Zod schemas: `type RecipeFormData = z.infer<typeof RecipeSchema>`
- Const assertions for enums: `as const`

**Components:**

- PascalCase: `RecipeForm`, `IngredientList`, `Button`
- File name matches component name: `recipe-form.tsx` exports `RecipeForm`

**Constants:**

- UPPER_SNAKE_CASE: `MEAL_CATEGORIES`, `DIFFICULTY_LEVELS`, `COMMON_UNITS`, `API_BASE`

## Code Style

**Formatting:**

- Tool: Prettier 3.1.0
- Settings:
  - `semi: false` - No semicolons
  - `singleQuote: true` - Single quotes for strings
  - `tabWidth: 2` - 2 space indentation
  - `trailingComma: "es5"` - Trailing commas where valid in ES5
  - `printWidth: 80` - 80 character line length
  - Plugin: `prettier-plugin-tailwindcss` for automatic Tailwind class sorting

**Linting:**

- Tool: ESLint with TypeScript plugin
- Key rules:
  - `@typescript-eslint/no-unused-vars: "error"` - Unused variables are errors
  - `@typescript-eslint/no-explicit-any: "warn"` - `any` discouraged but allowed
  - `prefer-const: "error"` - Use const when variable not reassigned
  - `no-var: "error"` - Never use `var`, only `const/let`
- Extends: `next/core-web-vitals`, `@typescript-eslint/recommended`

**TypeScript:**

- Strict mode enabled (`strict: true`)
- JSX: `react-jsx` (new JSX transform)
- Module resolution: `bundler`
- Path aliases required for all internal imports

## Import Organization

**Order:**

1. External packages (React, Next.js, third-party)
2. Internal UI components (`@/components/ui/*`)
3. Internal feature components (`@/components/*`)
4. Internal libraries (`@/lib/*`)
5. Types and schemas
6. Icons (lucide-react)

**Example from `recipe-form.tsx`:**

```typescript
import React, { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IngredientList } from './ingredient-list'
import { InstructionSteps } from './instruction-steps'
import { RecipeSchema, type RecipeFormData } from './recipe-form-schema'
import { useImportRecipe } from '@/lib/queries/import-queries'
import { Download, Save } from 'lucide-react'
```

**Path Aliases:**

- ALWAYS use `@/` prefix for internal imports
- NEVER use relative imports beyond one level (`../../` is forbidden)
- Configured aliases:
  - `@/*` → `./src/*`
  - `@/components/*` → `./src/components/*`
  - `@/lib/*` → `./src/lib/*`
  - `@/types/*` → `./src/types/*`
  - `@/hooks/*` → `./src/hooks/*`

**Examples:**

```typescript
// ✅ CORRECT
import { Button } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'
import { useRecipes } from '@/lib/queries/recipe-queries'

// ❌ WRONG
import { Button } from '../../../components/ui/button'
import { prisma } from '../../lib/prisma'
```

## Error Handling

**API Routes Pattern (Next.js 16):**

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params // MUST await params in Next.js 16

    // Operation
    const recipe = await prisma.recipe.findUnique({ where: { id } })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    return NextResponse.json(recipe)
  } catch (error) {
    const { id } = await params // Also await in catch blocks
    console.error(`GET /api/recipes/${id} error:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}
```

**Zod Validation:**

```typescript
try {
  const data = CreateRecipeSchema.parse(body)
  // ... use validated data
} catch (error) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid request data', details: error.errors },
      { status: 400 }
    )
  }
  // Generic error
  return NextResponse.json(
    { error: 'Failed to create recipe' },
    { status: 500 }
  )
}
```

**Client-side Error Handling:**

```typescript
try {
  const result = await importMutation.mutateAsync(importUrl)
  setImportResult(result)
} catch (error) {
  console.error('Import failed:', error)
} finally {
  setIsImporting(false)
}
```

**Error Response Structure:**

- 400 Bad Request: `{ error: 'Message', details?: ZodError[] }`
- 404 Not Found: `{ error: 'Recipe not found' }`
- 500 Internal: `{ error: 'Failed to <operation>' }`

## Logging

**Framework:** Native `console` (no logging library)

**Patterns:**

- Use `console.error()` for errors in API routes and components
- Include route context in messages: `` `GET /api/recipes/${id} error:` ``
- Use `console.warn()` for fallback/recovery situations
- No debug/info logging in production code

**Examples:**

```typescript
// API route errors
console.error('GET /api/recipes error:', error)
console.error(`PUT /api/recipes/${id} error:`, error)

// Client errors
console.error('Import failed:', error)
console.error('Save failed:', error)

// Warnings for graceful degradation
console.warn('JSON-LD parsing failed:', error)
console.warn('Failed to parse JSON-LD:', e)
```

## Comments

**When to Comment:**

- Public API functions (JSDoc style)
- Complex algorithms (utility functions)
- Business logic that isn't self-documenting
- NOT for obvious code

**JSDoc Pattern:**

```typescript
/**
 * Calculate the greatest common divisor using Euclidean algorithm
 */
export function gcd(a: number, b: number): number {
  // implementation
}

/**
 * Convert a decimal quantity to a fraction string for display
 * Examples: 0.5 → "1/2", 2.75 → "2 3/4", 0.333 → "1/3"
 */
export function formatQuantityAsFraction(quantity: number): string {
  // implementation
}
```

**Inline Comments:**

```typescript
// Serialize dates to strings and handle instructions format
const serializedRecipes = recipes.map((recipe) => {
  // Handle instructions which might be objects or strings
  let instructionsArray: string[] = []
  // ...
})
```

## Function Design

**Size:** Functions are typically 10-50 lines; longer functions broken into helpers or multiple steps

**Parameters:**

- Options objects for multiple parameters
- Destructuring in function signatures: `({ recipe, onSuccess, onCancel }: RecipeFormProps)`
- Optional parameters use `?:` syntax

**Return Values:**

- Explicit return types for exported functions
- Type inference acceptable for internal/private functions
- Async functions return `Promise<T>`

**Examples:**

```typescript
// Options object with typed interface
export function RecipeForm({ recipe, onSuccess, onCancel }: RecipeFormProps) {
  // ...
}

// Explicit return type for API functions
async function fetchRecipes(params: RecipeSearchParams = {}): Promise<{
  recipes: Recipe[]
  pagination: { page: number; limit: number; total: number; pages: number }
}> {
  // ...
}

// Void return for mutations
async function deleteRecipe(id: string): Promise<void> {
  // ...
}
```

## Module Design

**Exports:**

- Named exports for all public APIs (NO default exports except Next.js pages)
- Export interfaces alongside implementations
- Export const objects for configuration: `export const recipeKeys = { ... }`

**Pattern:**

```typescript
// Export interfaces
export interface Recipe { ... }
export interface RecipeInput { ... }

// Export constants
export const recipeKeys = { ... }

// Export functions
export function useRecipes(params: RecipeSearchParams = {}) { ... }
export function useRecipe(id: string) { ... }
```

**Barrel Files:** Not used - import directly from source files

## Client vs Server Components

**Server Components (default):**

- No `'use client'` directive
- Can use Prisma, server-only code
- Examples: `src/app/recipes/page.tsx` (no client features)

**Client Components:**

- MUST have `'use client'` directive at top
- Required when using:
  - React hooks (useState, useEffect, useForm)
  - TanStack Query hooks (useQuery, useMutation)
  - Event handlers (onClick, onChange, onSubmit)
  - Browser APIs (window, localStorage)
- Examples: `recipe-form.tsx`, `ingredient-list.tsx`, `providers.tsx`

**Pattern:**

```typescript
'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
// Component using hooks and event handlers
```

## Conditional Classes

**Use `cn()` helper** from `@/lib/utils` for conditional Tailwind classes:

```typescript
import { cn } from '@/lib/utils'

className={cn(
  'base-classes',
  condition && 'conditional-classes',
  variant === 'primary' && 'primary-classes'
)}
```

**Implementation:**

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Data Serialization

**Date Conversion:**
Always convert Date objects to ISO strings in API responses:

```typescript
const serializedRecipe = {
  ...recipe,
  createdAt: recipe.createdAt.toISOString(),
  updatedAt: recipe.updatedAt.toISOString(),
}
```

**Instructions Field:**
Handle legacy object format and modern string array:

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

_Convention analysis: 2026-02-18_
