# Codebase Concerns

**Analysis Date:** 2026-02-18

## Tech Debt

**Legacy `instructions` field format:**

- Issue: Database stores `instructions` as JSON which can be string[] OR object[] (legacy format with `.instruction` property)
- Files: `src/app/api/recipes/route.ts` (lines 103-110), `src/app/api/recipes/[id]/route.ts` (lines 59-66)
- Impact: Every API route must transform instructions array with manual type checking and `.map()` calls. Adds complexity and potential for bugs if format check is missed.
- Fix approach: Create database migration to normalize all existing `instructions` to string[] format, update Prisma schema to enforce array type validation, remove transformation code from API routes.

**Excessive `any` type usage:**

- Issue: Widespread use of `any` types undermines TypeScript safety, particularly in recipe import system
- Files:
  - `src/lib/queries/import-queries.ts` (lines 4, 10, 20) - ImportResult interface
  - `src/app/api/recipes/import/route.ts` (lines 59-60) - suggestion functions
  - `src/lib/recipe-importers/json-ld-parser.ts` (lines 37, 61, 103, 190, 214, 373, 385) - parsing functions
  - `src/lib/recipe-importers/validation.ts` (lines 24, 52) - validation functions
  - `src/app/api/recipes/route.ts` (lines 20, 51, 103, 109) - schema and query building
  - `src/app/api/recipes/[id]/route.ts` (lines 20, 59) - schema definitions
  - `src/components/recipes/import-review.tsx` (line 70) - ingredient mapping
- Impact: Loss of compile-time type safety, IntelliSense benefits, and refactoring confidence. High risk of runtime errors in import/parsing flow.
- Fix approach: Define proper TypeScript interfaces for JSON-LD recipe schema, create typed wrappers for Cheerio parsing results, replace `nutritionalInfo: z.any()` with proper Zod schema, type all import-related interfaces.

**Type assertion abuse with route navigation:**

- Issue: Using `as any` to bypass Next.js router type checking
- Files: `src/app/recipes/new/page.tsx` (line 12), `src/app/recipes/page.tsx` (line 38), `src/components/layout/sidebar.tsx` (line 38)
- Impact: Silently allows invalid route strings, defeats TypeScript path validation
- Fix approach: Remove `as any` and fix underlying Next.js type issues, or create properly typed navigation helper with route constants.

**Hard-coded ingredient category:**

- Issue: All new ingredients default to 'uncategorized' category with no categorization logic
- Files: `src/app/api/recipes/route.ts` (line 183), `src/app/api/recipes/[id]/route.ts` (similar pattern)
- Impact: Ingredient organization degrades over time, no smart categorization
- Fix approach: Implement ingredient category suggestion algorithm (NLP-based or keyword matching), add UI for manual category selection during recipe creation.

**Missing environment variable validation:**

- Issue: No runtime validation that required environment variables are set
- Files: `src/lib/prisma.ts` (only references `process.env.NODE_ENV`)
- Impact: Application may start with missing DATABASE_URL and fail at first query with cryptic error
- Fix approach: Add startup validation using Zod or similar, create `src/lib/env.ts` to validate and export typed env vars.

**Inconsistent error logging:**

- Issue: Mix of `console.error` and `console.warn` with no structured logging
- Files: All API routes use `console.error` (9 instances), parsers use `console.warn` in `src/lib/recipe-importers/json-ld-parser.ts` (line 27), `console.error` in `src/lib/recipe-importers/generic-html-parser.ts` (line 13)
- Impact: No log aggregation, difficult debugging in production, inconsistent log levels
- Fix approach: Implement structured logging library (Pino, Winston), create logger wrapper with proper levels, add request context to all logs.

## Known Bugs

**Image URL not persisted from imports:**

- Symptoms: Recipe imports extract `imageUrl` from external sites but field is never saved to database
- Files: `src/lib/recipe-importers/validation.ts` (line 16 defines field), `src/app/api/recipes/route.ts` and `src/app/api/recipes/[id]/route.ts` (schemas exclude imageUrl)
- Trigger: Import recipe from URL with image → imageUrl extracted but lost on save
- Workaround: Manually re-add images after import via image upload endpoint

**Missing image metadata validation in API:**

- Symptoms: Database adapter validates images but API routes don't enforce validation before calling adapter
- Files: `src/lib/storage/database-adapter.ts` (lines 85-86 uses `as any` for MIME type validation), `src/app/api/recipes/[id]/image/route.ts` (no schema validation on PUT request)
- Trigger: Upload image with invalid MIME type → may pass API but fail at storage layer
- Workaround: None - relies on storage layer catching issues

## Security Considerations

**No authentication layer (Phase 1 limitation):**

- Risk: All API endpoints publicly accessible, no user ownership of recipes
- Files: All routes in `src/app/api/recipes/`
- Current mitigation: Development/demo environment only, documented as Phase 1 limitation
- Recommendations: Phase 2 must add NextAuth, implement user ownership checks in all API routes, add recipe permissions/sharing model

**Environment files committed to git:**

- Risk: `.env` and `.env.local` contain database credentials but not in `.gitignore` (only `.env.local` is listed)
- Files: `.gitignore` (line 26 excludes `.env.local` but NOT `.env`)
- Current mitigation: Development credentials only
- Recommendations: Add `.env` to `.gitignore`, rotate database password, audit git history for leaked credentials

**No SQL injection protection beyond Prisma:**

- Risk: Relying solely on Prisma parameterization without input sanitization
- Files: All API routes use raw user input in `where` clauses
- Current mitigation: Prisma's built-in parameterization
- Recommendations: Add input sanitization layer, implement query allow-listing for search fields, add rate limiting

**No file upload size limit at API level:**

- Risk: Large file uploads could exhaust memory before storage adapter validation
- Files: `src/app/api/recipes/[id]/image/route.ts` (no size check before `await request.arrayBuffer()`)
- Current mitigation: Storage adapter checks size at 5MB limit (line 76)
- Recommendations: Add Next.js route segment config for `bodyParser` limit, validate Content-Length header before reading body

**CORS and CSRF not configured:**

- Risk: Cross-origin attacks possible on API routes
- Files: No CORS middleware detected in API routes
- Current mitigation: Same-origin deployment only
- Recommendations: Add explicit CORS headers, implement CSRF tokens for mutations, use SameSite cookies

## Performance Bottlenecks

**N+1 query pattern in recipe creation:**

- Problem: Each ingredient triggers separate `findUnique` → `create` → `create` (RecipeIngredient) queries
- Files: `src/app/api/recipes/route.ts` (lines 174-197), `src/app/api/recipes/[id]/route.ts` (similar pattern)
- Cause: Loop over ingredients without batching
- Improvement path: Batch ingredient lookups with `findMany`, use `createMany` for missing ingredients (requires handling duplicates), consolidate RecipeIngredient creation

**Large recipe list responses without pagination limits:**

- Problem: GET /api/recipes allows up to unlimited `limit` parameter
- Files: `src/app/api/recipes/route.ts` (line 48 accepts any limit value)
- Cause: No validation on `limit` query param beyond parseInt
- Improvement path: Cap limit at 100, add validation `z.string().transform(val => Math.min(parseInt(val), 100))`

**Unoptimized HTML parsing:**

- Problem: Cheerio loads entire HTML DOM for every selector attempt in generic parser
- Files: `src/lib/recipe-importers/generic-html-parser.ts` (474 lines of sequential selector attempts)
- Cause: Single-pass parsing with no optimization
- Improvement path: Cache selector results, use more efficient CSS selectors, implement early exit when high-confidence data found

**Base64 image data in database queries:**

- Problem: `imageData` (Bytes) loaded even when not needed
- Files: API routes select full recipe with `include: { ingredients: { include: { ingredient: true } } }` which includes imageData
- Cause: No selective field exclusion in Prisma queries
- Improvement path: Add `select` to exclude `imageData` from list queries, only load for detail/image endpoints

## Fragile Areas

**Recipe import parsers:**

- Files: `src/lib/recipe-importers/json-ld-parser.ts` (391 lines), `src/lib/recipe-importers/generic-html-parser.ts` (474 lines)
- Why fragile: Relies on external website HTML structure, no error boundaries for malformed data, heavy use of `any` types
- Safe modification: Always add new test cases in `src/lib/recipe-importers/__tests__/json-ld-parser.test.ts`, validate with multiple recipe sites, test with malformed/missing data
- Test coverage: Only 1 test file detected for importers (85 lines), missing tests for generic-html-parser.ts

**Transaction-based recipe mutations:**

- Files: `src/app/api/recipes/route.ts` (POST transaction lines 151-198), `src/app/api/recipes/[id]/route.ts` (PUT transaction lines 103-195)
- Why fragile: Complex multi-step transactions with ingredient creation/linking, error in any step rolls back entire operation
- Safe modification: Never modify transaction code without comprehensive integration tests, ensure all tx operations use `tx` client not `prisma`, test rollback scenarios
- Test coverage: No integration tests for transaction flows detected

**Form state management with `useFieldArray`:**

- Files: `src/components/recipes/ingredient-list.tsx` (133 lines), `src/components/recipes/instruction-steps.tsx` (73 lines)
- Why fragile: Complex React Hook Form integration with dynamic arrays, easy to break validation
- Safe modification: Test all array operations (add, remove, reorder), ensure form validation still triggers, verify `watch` subscriptions work
- Test coverage: No component tests for ingredient-list or instruction-steps

## Scaling Limits

**In-database image storage:**

- Current capacity: PostgreSQL Bytes column, no explicit limit beyond available disk
- Limit: 5MB per image (enforced by `IMAGE_CONFIG.maxSizeBytes`), but no total storage limit
- Scaling path: Migrate to S3/Cloudflare R2, keep only URLs in database, implement CDN for image serving, add image optimization/resizing

**Single-database architecture:**

- Current capacity: PostgreSQL container on Docker, single instance
- Limit: ~10K recipes before query performance degrades (estimate based on schema complexity)
- Scaling path: Add read replicas for queries, implement caching layer (Redis), partition large tables by date/user

**Synchronous recipe import:**

- Current capacity: HTTP request timeout limits import duration
- Limit: Cannot import recipes from slow sites (>30s response time)
- Scaling path: Implement background job queue (BullMQ, Inngest), add webhook for completion notification, show import progress UI

## Dependencies at Risk

**Next.js 16.0.4 (bleeding edge):**

- Risk: Using very new Next.js version (16.0.4) likely to have bugs, migration required `await params` pattern
- Impact: Breaking changes in minor versions, limited community solutions for issues
- Migration plan: Consider pinning to Next.js 15 LTS, or stay on 16.x with plan to update frequently, monitor Next.js GitHub issues

**React 18.2.0 (outdated):**

- Risk: Not on React 19, missing concurrent features
- Impact: Performance limitations, missing features
- Migration plan: Upgrade to React 19 when stable, test all Suspense boundaries and transitions

**Zustand 4.4.7 (unused):**

- Risk: Dependency installed but not used in codebase (no imports detected)
- Impact: Unused bundle size, confusion for developers
- Migration plan: Remove from package.json if not needed, or implement global state management if planned

**No dependency pinning:**

- Risk: `package.json` uses caret ranges (^) for all dependencies
- Impact: `pnpm install` on different machines may pull different versions
- Migration plan: Use `pnpm install --frozen-lockfile` in CI, consider exact versions for critical deps

## Missing Critical Features

**No error boundaries:**

- Problem: React errors crash entire app, no graceful degradation
- Blocks: Production deployment without error recovery
- Priority: High

**No image optimization:**

- Problem: Raw images stored/served without compression or responsive sizes
- Blocks: Mobile performance, bandwidth costs
- Priority: Medium

**No offline support:**

- Problem: App completely non-functional without network
- Blocks: Progressive Web App capabilities
- Priority: Low (Phase 1)

**No recipe duplication detection:**

- Problem: Users can import same recipe multiple times with no warning
- Blocks: Clean recipe library maintenance
- Priority: Medium

## Test Coverage Gaps

**API routes completely untested:**

- What's not tested: All endpoints in `src/app/api/recipes/` (route.ts, [id]/route.ts, import/route.ts, [id]/image/route.ts)
- Files: `src/app/api/recipes/route.ts` (261 lines), `src/app/api/recipes/[id]/route.ts` (271 lines), `src/app/api/recipes/import/route.ts` (167 lines), `src/app/api/recipes/[id]/image/route.ts` (87 lines)
- Risk: Database operations, transaction rollbacks, error handling all unverified
- Priority: High

**Component library (shadcn/ui) untested:**

- What's not tested: All UI components in `src/components/ui/` (card, button, select, input, textarea, label, badge)
- Files: 8 component files, 0 test files
- Risk: Visual regressions, accessibility issues undetected
- Priority: Low (vendor components)

**Feature components untested:**

- What's not tested: RecipeForm, IngredientList, InstructionSteps, ImportReview
- Files: `src/components/recipes/recipe-form.tsx` (351 lines), `src/components/recipes/ingredient-list.tsx` (133 lines), `src/components/recipes/instruction-steps.tsx` (73 lines), `src/components/recipes/import-review.tsx` (307 lines)
- Risk: Form validation, dynamic arrays, import review flow could break without detection
- Priority: High

**Database storage adapter untested:**

- What's not tested: Image validation, header checking, MIME type validation
- Files: `src/lib/storage/database-adapter.ts` (120 lines)
- Risk: Image corruption could slip through, invalid files stored
- Priority: Medium

**Generic HTML parser untested:**

- What's not tested: Entire fallback parser (474 lines of heuristic parsing)
- Files: `src/lib/recipe-importers/generic-html-parser.ts`
- Risk: Parser may fail silently on real websites, no confidence in heuristics
- Priority: High

**Overall coverage:**

- Only 4 test files found: 2 in `src/app/` (page component tests), 2 in `src/lib/` (utils, json-ld parser)
- No integration tests, no E2E tests
- Estimated coverage: <15% of critical code paths

---

_Concerns audit: 2026-02-18_
