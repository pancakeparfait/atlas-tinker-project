---
phase: 2
slug: multi-image-support
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 + ts-jest 29.4.5 + @testing-library/react 16.3.2 |
| **Config file** | `jest.config.js` (project root) — existing |
| **Quick run command** | `pnpm test --testPathPattern="recipe-image\|image-gallery\|image-upload\|sortable-thumbnail-strip\|database-adapter\|api/recipes"` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | quick ~6s; full ~22s (baseline 111 tests + ~40 new) |

---

## Sampling Rate

- **After every task commit:** Run quick command (above)
- **After every plan wave:** Run `pnpm test` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~25 seconds for full suite (under the 60s Nyquist cap)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01a | 01 | 1 | IMG-05 | T-02-01 | Schema validates; no destructive ops in autonomous flow | static | `pnpm exec prisma validate && grep -q "model RecipeImage" prisma/schema.prisma` | ✅ | ⬜ pending |
| 02-01-01b | 01 | 1 | IMG-05 | T-02-01 | Data-copy INSERT preserved across `prisma migrate deploy` (CI parity) | integration | `pnpm exec prisma migrate status && grep -rq "INSERT INTO recipe_images" prisma/migrations/` | ❌ W0 | ⬜ pending |
| 02-01-01c | 01 | 1 | IMG-05 | — | @dnd-kit packages resolvable (no transitive integrity risk beyond audit) | static | `node -e "require.resolve('@dnd-kit/core'); require.resolve('@dnd-kit/sortable'); require.resolve('@dnd-kit/utilities')"` | ✅ | ⬜ pending |
| 02-01-02 | 01 | 1 | IMG-05, IMG-06 | T-02-02, T-02-03, T-02-04, T-02-05 | Composite `where: { id, recipeId }` guard; list never selects `data`; renormalize inside `$transaction`; oversized buffers rejected | unit | `pnpm test --testPathPattern="storage/__tests__/database-adapter"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | IMG-01, IMG-06 | T-02-07, T-02-10, T-02-12 | `f instanceof File` type guard; per-file `validateImage` before save; concurrency-tolerated duplicate-order documented | unit | `pnpm test --testPathPattern="api/recipes/.*images/__tests__/route"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 2 | IMG-02, IMG-03 | T-02-08, T-02-09 | Ownership-guard `findFirst({ where: { id, recipeId }})` → 404 (not 403); DELETE returns 404 on P2025 | unit | `pnpm test --testPathPattern="api/recipes/.*imageId.*route"` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 2 | IMG-04, IMG-07 | T-02-09, T-02-11 | Zod schema on reorder body; list endpoint never selects `data: true`; recipe list omits raw `images` array, projects `primaryImageId` | unit | `pnpm test --testPathPattern="api/recipes/.*reorder\|api/recipes/__tests__/route\|api/recipes/\\[id\\]/__tests__/route"` | ⚠️ partial (extends existing) | ⬜ pending |
| 02-03-01 | 03 | 3 | IMG-01, IMG-02, IMG-03, IMG-04, IMG-07 | T-02-14, T-02-15 | Mutations invalidate three cache keys on success; verb-specific error messages on non-OK; no server-only imports | unit | `pnpm test --testPathPattern="queries/__tests__/recipe-image-queries"` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 4 | IMG-02 | T-02-16, T-02-17, T-02-18 | Defensive sort by order; `<img>` src interpolation guarded by server ownership check; no crash on empty/undefined images | unit (RTL) | `pnpm test --testPathPattern="components/recipes/__tests__/image-gallery"` | ❌ W0 | ⬜ pending |
| 02-04-02 | 04 | 4 | IMG-02 | T-02-18 | Detail page no longer gates on `recipe.imageUrl`; `images ?? []` fallback | unit (RTL, extends) | `pnpm test --testPathPattern="app/recipes/\\[id\\]/__tests__/page"` | ✅ (extends) | ⬜ pending |
| 02-05-01 | 05 | 4 | IMG-01, IMG-06 | T-02-19 | Client-side validateClientSide rejects oversized/wrong-MIME files before network call (defense-in-depth — server is authoritative) | unit (RTL) | `pnpm test --testPathPattern="components/recipes/__tests__/image-upload-zone"` | ❌ W0 | ⬜ pending |
| 02-05-02 | 05 | 4 | IMG-03, IMG-04 | T-02-20, T-02-21, T-02-22, T-02-23 | window.confirm gate before destructive delete; v1 stable `@dnd-kit/{core,sortable,utilities}` only (no v2/legacy libs); aria-labels on drag/delete | unit (RTL) | `pnpm test --testPathPattern="components/recipes/__tests__/sortable-thumbnail-strip"` | ❌ W0 | ⬜ pending |
| 02-05-03 | 05 | 4 | IMG-01, IMG-03, IMG-04 | — | Edit page mounts both new components; conditional render on `recipe.images?.length > 0` | unit (RTL) | `pnpm test --testPathPattern="app/recipes/\\[id\\]/edit/__tests__/page"` | ❌ W0 | ⬜ pending |
| 02-06-01 | 06 | 4 | IMG-07 | T-02-24, T-02-25 | List render never embeds bytes; missing `primaryImageId` does not crash (placeholder branch) | unit (RTL) | `pnpm test --testPathPattern="src/app/recipes/__tests__/page"` | ⚠️ partial (creates if absent) | ⬜ pending |
| Manual-01 | 04, 05 | 4 | IMG-02, IMG-04 | — | Visual: DnD reorder feels smooth; thumbnail strip horizontal scroll works on mobile | manual | `pnpm dev` and exercise `/recipes/[id]/edit` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*File-Exists legend: ✅ exists today · ❌ W0 (created in Wave 0 / by the task that owns it) · ⚠️ partial (extends/creates conditionally)*

---

## Wave 0 Requirements

The following test files do not yet exist and are referenced by Wave 1+ plans. Each is created by the same task that produces the implementation under test (tests are written first per the `tdd="true"` discipline applied across every task in Phase 2). Listed here so the executor can pre-flight that no file outside the plan paths is implicitly required.

- [ ] `src/lib/storage/__tests__/database-adapter.test.ts` — created in plan 02-01 task 2 (covers IMG-05, IMG-06; threats T-02-02/03/04/05)
- [ ] `src/app/api/recipes/[id]/images/__tests__/route.test.ts` — created in plan 02-02 task 1 (covers IMG-01, IMG-06; threats T-02-07/10/12)
- [ ] `src/app/api/recipes/[id]/images/[imageId]/__tests__/route.test.ts` — created in plan 02-02 task 2 (covers IMG-02, IMG-03; threats T-02-08/09)
- [ ] `src/app/api/recipes/[id]/images/reorder/__tests__/route.test.ts` — created in plan 02-02 task 3 (covers IMG-04; threat T-02-09)
- [ ] `src/app/api/recipes/__tests__/route.test.ts` — created/extended in plan 02-02 task 3 (covers IMG-07; threat T-02-11)
- [ ] `src/lib/queries/__tests__/recipe-image-queries.test.ts` — created in plan 02-03 task 1 (covers IMG-01/02/03/04/07; threats T-02-14/15)
- [ ] `src/components/recipes/__tests__/image-gallery.test.tsx` — created in plan 02-04 task 1 (covers IMG-02; threats T-02-16/17/18)
- [ ] `src/components/recipes/__tests__/image-upload-zone.test.tsx` — created in plan 02-05 task 1 (covers IMG-01, IMG-06; threat T-02-19)
- [ ] `src/components/recipes/__tests__/sortable-thumbnail-strip.test.tsx` — created in plan 02-05 task 2 (covers IMG-03, IMG-04; threats T-02-20/21/22/23)
- [ ] `src/app/recipes/[id]/edit/__tests__/page.test.tsx` — created in plan 02-05 task 3 (if absent; covers IMG-01/03/04 integration)
- [ ] `src/app/recipes/__tests__/page.test.tsx` — created or extended in plan 02-06 task 1 (covers IMG-07; threats T-02-24/25)

No additional framework install is needed — Jest 30.2.0 + ts-jest + @testing-library/react are already present in package.json (per RESEARCH §Validation Architecture).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DnD reorder feels smooth (no jank, drop position obvious) | IMG-04 | Subjective UX; jsdom does not run a real layout engine, so `transform`/`transition` smoothness cannot be measured by RTL | Run `pnpm dev`; open `/recipes/<id>/edit` with ≥3 images; reorder via mouse + via keyboard (Tab to handle, Space, arrow keys); confirm visual feedback and final order persists across refresh |
| Hero image loads at appropriate quality on real network | IMG-02 | next/image optimization pipeline not exercised in jsdom | Run `pnpm dev`; load `/recipes/<id>` with at least one image; inspect the network panel for the `/_next/image` request and confirm `Content-Type: image/*` with `Cache-Control: public, max-age=3600` |
| Mobile horizontal scroll of thumbnail strip | IMG-02, IMG-04 | jsdom has no viewport; touch behavior not simulated | Open Chrome DevTools device emulation at iPhone 14 width; open recipe with ≥5 images; swipe horizontally on the strip; confirm scroll works and active thumbnail ring is visible |
| Drag-over visual on real file from OS file manager | IMG-01 | jsdom synthesizes `dragover` but cannot drag from Finder/Explorer | Run `pnpm dev`; open `/recipes/<id>/edit`; drag a real JPEG from the OS into the upload zone; confirm copy flips to "Drop to add photos" and border highlights |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task in every plan has an `<automated>` command)
- [x] Wave 0 covers all MISSING references (11 test files listed above; each tied to the owning task)
- [x] No watch-mode flags (every command runs once and exits)
- [x] Feedback latency < 25s for full suite, < 6s for quick suite
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-13
