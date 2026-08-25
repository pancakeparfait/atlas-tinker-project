# ADR-0002: PostgreSQL with Prisma ORM

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need a relational database for storing recipes, ingredients, meal plans, and shopping lists with proper relationships and transaction support.

## Decision

Use PostgreSQL 15 as the database with Prisma 5.7.0 as the ORM.

### Key Choices

- **PostgreSQL:** Mature, reliable, excellent JSON support for flexible fields
- **Prisma:** Type-safe database access, auto-generated client, migration system
- **Docker Compose:** Local development database setup

### Database Design

- Single PostgreSQL instance (no replicas for Phase 1)
- Prisma schema in `prisma/schema.prisma`
- Migrations managed via `pnpm db:migrate`
- Seed script for development data (`prisma/seed.ts`)

## Consequences

### Positive

- Type-safe database queries with Prisma Client
- Automatic migration generation from schema changes
- Excellent JSON support for flexible fields (instructions, tags)
- Strong ecosystem and community support

### Negative

- Prisma schema is the single source of truth (must keep in sync)
- Generated client can be large
- Limited raw SQL optimization options

### Neutral

- Requires Docker for local development (or local PostgreSQL installation)
- Prisma Studio available for database GUI (`pnpm db:studio`)

## Alternatives Considered

- **Drizzle ORM:** Lighter weight but less mature migration system
- **TypeORM:** More traditional but less type-safe
- **Raw SQL:** Maximum control but loses type safety and migration management

---

_Related: `CONTEXT.md` (Technology Stack section)_
