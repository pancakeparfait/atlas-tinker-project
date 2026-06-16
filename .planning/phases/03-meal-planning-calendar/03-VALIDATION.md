---
phase: 3
slug: meal-planning-calendar
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-16
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 29.x (already configured) |
| **Config file** | `jest.config.js` |
| **Quick run command** | `pnpm test --testPathPattern="meal-plan"` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds (quick), ~45 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test --testPathPattern="meal-plan"`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-task Verification Map

| task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | MEAL-01-09 | integration | `pnpm test` | ⬜ pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: This table will be populated during planning once tasks are defined.*

---

## Wave 0 Requirements

- [ ] `src/lib/queries/__tests__/meal-plan-queries.test.ts` — Query hook tests
- [ ] `src/components/meal-plans/__tests__/calendar-grid.test.tsx` — Calendar rendering tests
- [ ] `src/components/meal-plans/__tests__/meal-slot.test.tsx` — Slot interaction tests
- [ ] `src/app/api/meal-plans/__tests__/route.test.ts` — API route tests

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Calendar visual layout | MEAL-01 | Visual correctness (alignment, spacing, colors) | Open /meal-plans, verify 4-week grid, Mon-Sun columns, meal type color indicators |
| Current day highlighting | MEAL-01 | Visual styling (blue border/tint) | Verify today's date has distinct visual treatment |
| Recipe popover positioning | MEAL-06 | Popover placement relative to trigger | Click recipe name, verify popover doesn't overflow viewport |
| Navigation transitions | MEAL-02 | Smooth week switching | Click prev/next arrows, verify calendar updates without flicker |
| Empty slot hover state | MEAL-03 | Hover affordance ('+' icon appears) | Hover over empty meal slot, verify '+' indicator appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
