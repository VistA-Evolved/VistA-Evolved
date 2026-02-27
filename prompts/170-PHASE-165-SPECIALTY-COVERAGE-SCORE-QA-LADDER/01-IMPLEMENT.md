# Phase 165 — Specialty Coverage Score + QA Ladder Extension

## User Request
Implement per-specialty coverage scoring and extend the QA ladder with specialty-level confidence metrics.

## Implementation Steps
1. Create `apps/api/src/templates/coverage-scorer.ts` — Per-specialty scoring engine
2. Create `apps/api/src/templates/qa-ladder-ext.ts` — QA ladder extension for specialty validation
3. Add coverage routes to template-routes.ts or new route file
4. Create UI page
5. Create runbook

## Verification Steps
- `pnpm -C apps/api exec tsc --noEmit` — clean
- `pnpm -C apps/web exec tsc --noEmit` — clean

## Files Touched
- NEW: apps/api/src/templates/coverage-scorer.ts
- NEW: apps/api/src/templates/qa-ladder-ext.ts
- NEW: apps/api/src/routes/coverage-routes.ts
- EDIT: apps/api/src/index.ts (import + register)
- NEW: apps/web/src/app/cprs/admin/coverage/page.tsx
- NEW: docs/runbooks/phase165-specialty-coverage-qa.md
