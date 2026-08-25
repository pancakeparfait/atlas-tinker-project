# ADR-0009: Jest + Testing Library

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need a testing framework that supports React component testing, TypeScript, and integrates well with Next.js.

## Decision

Use Jest 30.2.0 with React Testing Library for unit and integration tests.

### Key Choices

- **Runner:** Jest with ts-jest for TypeScript support
- **Environment:** jsdom for browser-like testing
- **Component testing:** React Testing Library + user-event
- **Setup:** `jest.setup.js` with jest-dom matchers

### Test Organization

- Colocated tests in `__tests__/` directories
- File naming: `*.test.ts` or `*.test.tsx`
- No separate test configuration files

## Consequences

### Positive

- Industry standard, excellent documentation
- Good TypeScript support via ts-jest
- React Testing Library encourages testing user behavior
- Fast test execution

### Negative

- jsdom is not a real browser (some APIs missing)
- Mocking can become complex
- No built-in E2E testing (need Playwright/Cypress separately)

### Neutral

- Next.js has built-in Jest support
- Test coverage available but not enforced

## Test Commands

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test <pattern>    # Run specific file
pnpm test -t "name"    # Run specific test
```

## Alternatives Considered

- **Vitest:** Faster but less mature ecosystem
- **Playwright:** Better for E2E but overkill for unit tests
- **Cypress:** Good DX but heavier setup

---

_Related: `CONTEXT.md` (Technology Stack section)_
