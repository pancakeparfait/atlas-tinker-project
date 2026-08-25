# ADR-0007: Single-User Phase 1 (No Authentication)

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need to ship a working recipe organizer quickly but don't have time to implement authentication and multi-user support in Phase 1.

## Decision

Build Phase 1 as a single-user application with no authentication.

### Key Choices

- **No auth:** All API endpoints publicly accessible
- **No user model:** Recipes not tied to users
- **No permissions:** Any request can read/write any recipe
- **Future:** Add NextAuth.js in Phase 2+ for multi-user support

### Implementation

- No middleware protection on routes
- No `userId` foreign key on Recipe model
- Placeholder env vars for future auth (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`)

## Consequences

### Positive

- Faster development and iteration
- Simpler API routes (no auth checks)
- Easier testing and debugging
- Good enough for personal use

### Negative

- All data publicly accessible (fine for local dev only)
- No recipe ownership or sharing model
- Migration to multi-user will require data migration
- Cannot deploy publicly without auth

### Neutral

- Development/demo environment only
- Documented as Phase 1 limitation
- Architecture supports future auth addition

## Alternatives Considered

- **Basic API key auth:** Adds complexity without real security
- **JWT without user model:** Overkill for single-user
- **NextAuth from start:** Delays core feature development

---

_Related: `CONTEXT.md` (Constraints section)_
