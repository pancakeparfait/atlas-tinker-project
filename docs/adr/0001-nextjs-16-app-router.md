# ADR-0001: Next.js 16 App Router with Server-First Architecture

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need a full-stack React framework that supports server-side rendering, API routes, and modern React patterns while maintaining good developer experience.

## Decision

Use Next.js 16.0.4 with App Router and Server Components as the core framework.

### Key Choices

- **App Router:** File-based routing with co-located API routes
- **Server Components by default:** Static pages and layouts render on server
- **Client Islands:** Interactive components marked with `'use client'`
- **Turbopack:** Enabled for faster development builds

### Architecture Pattern

- Server Components for data fetching pages (recipe list, detail views)
- Client Components for interactive forms and state management
- API routes co-located with pages in `src/app/api/`

## Consequences

### Positive

- Server-side rendering improves initial load performance
- Co-located API routes simplify project structure
- TypeScript support with typed routes
- Built-in image optimization (when needed)

### Negative

- Next.js 16 requires `await params` in dynamic routes (breaking change from v15)
- Server Components limit direct access to browser APIs
- Requires careful thought about client vs server component boundaries

### Neutral

- Team must learn App Router patterns (different from Pages Router)
- Deployment target (Vercel or Node.js hosting) affects some features

## Alternatives Considered

- **Next.js Pages Router:** Older pattern, less aligned with React Server Components direction
- **Remix:** Good conventions but less mature ecosystem
- **Vite + Express:** More flexibility but requires more setup for SSR

---

_Related: `CONTEXT.md` (Architecture section)_
