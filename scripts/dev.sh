#!/usr/bin/env bash
#
# One-command local development bootstrap.
#
# Starts PostgreSQL in Docker, applies migrations, seeds sample data on a
# fresh database, then runs the Next.js dev server on the host.
#
# Usage: pnpm dev:all
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

info() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m==>\033[0m %s\n' "$*" >&2; }

# --- 1. Docker must be running -------------------------------------------
if ! docker info >/dev/null 2>&1; then
  warn "Docker is not running. Start Docker Desktop or OrbStack, then re-run 'pnpm dev:all'."
  exit 1
fi

# --- 2. Local env files ---------------------------------------------------
# Next.js reads .env.local; the Prisma CLI reads .env. Both are gitignored.
# Keep them in sync so migrations and the app cannot point at different DBs.
if [ ! -f .env ] && [ ! -f .env.local ]; then
  cp .env.example .env
  cp .env.example .env.local
  info "Created .env and .env.local from .env.example"
else
  if [ ! -f .env ]; then
    cp .env.local .env
    info "Created .env from .env.local"
  fi
  if [ ! -f .env.local ]; then
    cp .env .env.local
    info "Created .env.local from .env"
  fi
fi

# --- 3. Dependencies (only when missing or stale) --------------------------
modules_stamp="node_modules/.modules.yaml"
if [ ! -d node_modules ] ||
  [ ! -f "$modules_stamp" ] ||
  [ package.json -nt "$modules_stamp" ] ||
  [ pnpm-lock.yaml -nt "$modules_stamp" ]; then
  info "Installing dependencies..."
  pnpm install
fi

# --- 4. PostgreSQL --------------------------------------------------------
info "Starting PostgreSQL..."
if ! docker compose up -d --wait --wait-timeout 180 postgres; then
  warn "PostgreSQL did not start. If port 5432 is already in use, stop the other"
  warn "Postgres instance (e.g. 'brew services stop postgresql') and try again."
  exit 1
fi

# --- 5. Schema + Prisma client -------------------------------------------
info "Applying database migrations..."
pnpm exec prisma migrate deploy
pnpm db:generate

# --- 6. Sample data (idempotent; no-op on an already-seeded database) -----
info "Seeding sample data if needed..."
pnpm db:seed

# --- 7. App ---------------------------------------------------------------
info "Starting Next.js on http://localhost:3000 (Ctrl-C stops the app)"
exec pnpm dev
