# Technology Stack

**Analysis Date:** 2026-02-18

## Languages

**Primary:**

- TypeScript 5.3.2 - All application code (components, API routes, utilities)
- JavaScript - Configuration files only (next.config.js, jest.config.js, tailwind.config.js)

**Secondary:**

- SQL - PostgreSQL database schema managed through Prisma ORM

## Runtime

**Environment:**

- Node.js >=18.0.0 (specified in `package.json` engines)

**Package Manager:**

- pnpm (lockfile: `pnpm-lock.yaml` present)

## Frameworks

**Core:**

- Next.js 16.0.4 - Full-stack React framework with App Router
- React 18.2.0 - UI library
- Prisma 5.7.0 - Database ORM and migration tool

**Testing:**

- Jest 30.2.0 - Test runner
- Testing Library (React 16.3.2, Jest DOM 6.9.1, User Event 14.6.1) - Component testing utilities
- ts-jest 29.4.5 - TypeScript transformer for Jest
- jest-environment-jsdom 30.2.0 - Browser-like test environment

**Build/Dev:**

- TypeScript 5.3.2 - Type checking and compilation
- ESLint 8.54.0 - Code linting
- Prettier 3.1.0 - Code formatting
- tsx 4.6.0 - TypeScript execution for scripts (database seeding)
- Turbopack - Next.js 16 bundler (configured in `next.config.js`)

## Key Dependencies

**Critical:**

- @prisma/client 5.7.0 - Database client (auto-generated from schema)
- @tanstack/react-query 5.8.4 - Server state management and data fetching
- zod 3.22.4 - Schema validation for forms and API payloads
- react-hook-form 7.48.2 - Form state management
- @hookform/resolvers 3.3.2 - Zod integration for react-hook-form

**UI Components:**

- @radix-ui/\* (multiple packages) - Unstyled, accessible UI primitives
  - react-dialog 1.0.5
  - react-dropdown-menu 2.0.6
  - react-label 2.1.8
  - react-select 2.0.0
  - react-slot 1.0.2
  - react-toast 1.1.5
  - react-icons 1.3.0
- lucide-react 0.294.0 - Icon library
- tailwindcss 3.3.6 - Utility-first CSS framework
- tailwindcss-animate 1.0.7 - Animation utilities
- class-variance-authority 0.7.0 - Component variant styling
- clsx 2.0.0 / tailwind-merge 2.2.0 - Conditional class name utilities

**Infrastructure:**

- cheerio 1.1.2 - HTML parsing for recipe import (server-side jQuery-like API)
- jsdom 27.2.0 - DOM implementation for HTML parsing in Node.js
- date-fns 2.30.0 - Date manipulation and formatting
- zustand 4.4.7 - Lightweight state management (client-side stores)

**Development:**

- @typescript-eslint/eslint-plugin 6.12.0 - TypeScript-specific linting rules
- @typescript-eslint/parser 6.12.0 - TypeScript parser for ESLint
- prettier-plugin-tailwindcss 0.5.7 - Automatic Tailwind class sorting
- autoprefixer 10.4.16 - CSS vendor prefixing
- postcss 8.4.32 - CSS transformation tool

## Configuration

**Environment:**

- Environment variables in `.env`, `.env.local` (local development)
- `.env.example` template provided
- Required variables:
  - `DATABASE_URL` - PostgreSQL connection string
  - `NEXTAUTH_URL` - Application URL (future auth integration)
  - `NEXTAUTH_SECRET` - Auth secret (future auth integration)
  - `NODE_ENV` - Environment mode

**Build:**

- `tsconfig.json` - TypeScript configuration with strict mode enabled
  - Module resolution: bundler
  - Path aliases configured (`@/*` → `src/*`)
  - Target: ES5
  - JSX: react-jsx
- `next.config.js` - Next.js configuration
  - Typed routes enabled
  - Remote image patterns configured
  - Turbopack enabled
  - Webpack customization for undici externalization
- `tailwind.config.js` - Tailwind CSS configuration with shadcn/ui theming
- `postcss.config.js` - PostCSS with Tailwind and autoprefixer
- `.prettierrc` - Code formatting (no semicolons, single quotes, 2-space indent, 80 chars)
- `.eslintrc.json` - Linting rules (TypeScript strict, no unused vars, prefer const)

## Platform Requirements

**Development:**

- Node.js 18.0.0 or higher
- pnpm package manager
- PostgreSQL 15 (via Docker or local installation)
- Docker and Docker Compose (recommended for database)

**Production:**

- Deployment target: Vercel or any Node.js hosting platform
- PostgreSQL database (external managed service or self-hosted)
- Environment variables configured on hosting platform

---

_Stack analysis: 2026-02-18_
