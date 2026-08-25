# ADR-0003: TanStack Query for Client State Management

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need a solution for client-side data fetching, caching, and state management that works well with React Server Components and handles server state efficiently.

## Decision

Use TanStack Query 5.8.4 for all server state management (data fetching, caching, mutations).

### Key Choices

- **Hierarchical query keys:** Factory pattern for cache invalidation
- **Co-located hooks:** Query hooks in `src/lib/queries/`
- **Auto-invalidation:** Mutations automatically invalidate related queries

### Query Key Pattern

```typescript
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  detail: (id: string) => [...recipeKeys.all, 'detail', id] as const,
}
```

## Consequences

### Positive

- Automatic cache management and background refetching
- Optimistic updates for mutations
- TypeScript support with inferred types
- Works seamlessly with React Server Components

### Negative

- Requires `QueryClientProvider` at app root
- Must avoid conditional hook calls
- Learning curve for cache invalidation patterns

### Neutral

- Form state handled separately by React Hook Form
- UI state managed by local `useState`

## Alternatives Considered

- **SWR:** Simpler but less feature-rich
- **Redux Toolkit Query:** More opinionated, heavier
- **React Query v3:** Older API, less TypeScript support

---

_Related: `CONTEXT.md` (Architecture section, Query/State Management Layer)_
