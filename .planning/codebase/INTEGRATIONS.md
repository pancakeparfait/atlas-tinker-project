# External Integrations

**Analysis Date:** 2026-02-18

## APIs & External Services

**Recipe Import:**

- Web scraping via native `fetch()` - Imports recipes from external URLs
  - Implementation: `src/lib/recipe-importers/importer.ts`
  - Parsers: JSON-LD structured data (`src/lib/recipe-importers/json-ld-parser.ts`), generic HTML (`src/lib/recipe-importers/generic-html-parser.ts`)
  - User-Agent header spoofing to avoid bot detection
  - No SDK/API key required (public web scraping)

**No External Service Dependencies:**

- No payment processors (Stripe, PayPal, etc.)
- No cloud storage providers (S3, Cloudinary, etc.)
- No email services (SendGrid, Mailgun, etc.)
- No analytics services (Google Analytics, Mixpanel, etc.)
- No error tracking services (Sentry, LogRocket, etc.)

## Data Storage

**Databases:**

- PostgreSQL 15
  - Connection: `DATABASE_URL` environment variable
  - Format: `postgresql://postgres:password@localhost:5432/recipe_organizer`
  - Client: Prisma ORM 5.7.0
  - Schema: `prisma/schema.prisma` (models: Recipe, Ingredient, RecipeIngredient, MealPlan, PlannedMeal, ShoppingList, ShoppingListItem)
  - Local development: Docker Compose service (`docker-compose.yml`)

**File Storage:**

- Local filesystem and database BLOB storage only
  - Recipe images stored as `Bytes` in `Recipe.imageData` field
  - MIME type tracked in `Recipe.imageMimeType`
  - Original filename in `Recipe.imageFileName`
  - Optional URL reference in `Recipe.imageUrl` (for imported recipes)
  - No external CDN or object storage

**Caching:**

- Client-side only via TanStack Query
  - Query cache configuration in `src/app/layout.tsx` (QueryClientProvider)
  - No Redis or external cache layer

## Authentication & Identity

**Auth Provider:**

- None (Phase 1 - single-user application)
  - Placeholder env vars present (`NEXTAUTH_URL`, `NEXTAUTH_SECRET`) for future NextAuth.js integration
  - No current authentication or authorization checks

## Monitoring & Observability

**Error Tracking:**

- None (console errors only)

**Logs:**

- Console logging only
  - Server-side: `console.error()`, `console.warn()` in API routes and parsers
  - Client-side: `console.error()` in query error handlers
  - No structured logging or log aggregation service

**Performance Monitoring:**

- None (no APM tools)

## CI/CD & Deployment

**Hosting:**

- Not configured (likely target: Vercel based on Next.js stack)
  - No deployment configuration files detected
  - No Vercel-specific config (`vercel.json` not present)

**CI Pipeline:**

- None
  - No GitHub Actions workflows (`.github/workflows/` not detected)
  - No CircleCI, Travis, or other CI config files

**Container Registry:**

- None (Docker Compose for local development only)

## Environment Configuration

**Required env vars:**

- `DATABASE_URL` - PostgreSQL connection string (critical)
- `NODE_ENV` - Environment mode (development/production)

**Optional/Future env vars:**

- `NEXTAUTH_URL` - Application URL (reserved for future auth)
- `NEXTAUTH_SECRET` - NextAuth.js secret (reserved for future auth)

**Secrets location:**

- Local development: `.env`, `.env.local` (gitignored)
- Production: Not configured (expected: hosting platform environment variables)
- Template: `.env.example` committed to repository

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

## Development Tools & Infrastructure

**Database Management:**

- Prisma Studio - Local database GUI
  - Access via `pnpm db:studio`
  - Web interface on localhost (port assigned by Prisma)

**Local Services (Docker Compose):**

- PostgreSQL 15 - Database server
  - Port: 5432
  - Container: `recipe-organizer-postgres`
  - Health checks configured
- pgAdmin 4 - Database administration web UI
  - Port: 8080
  - Container: `recipe-organizer-pgadmin`
  - Credentials: admin@recipe-organizer.com / admin

**HTML Parsing Libraries (Internal Processing):**

- Cheerio 1.1.2 - Server-side jQuery-like API for HTML parsing
- JSDOM 27.2.0 - DOM implementation for Node.js environment
- Used for: Recipe data extraction from external websites

---

_Integration audit: 2026-02-18_
