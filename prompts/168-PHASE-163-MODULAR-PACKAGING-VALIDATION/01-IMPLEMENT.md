# Phase 163 — Modular Packaging Validation

## User Request

Implement a modular packaging validation layer that enforces integrity at startup and via admin APIs.

## Implementation Steps

1. Create `apps/api/src/modules/validation/` directory with:
   - `types.ts` — Validation result types
   - `dependency-validator.ts` — Startup dep validation, circular detection
   - `boundary-checker.ts` — Module boundary + route overlap + adapter consistency
   - `coverage-validator.ts` — Capability-module coverage, SKU integrity, store-policy cross-ref
   - `index.ts` — Barrel + `runAllValidations()`
2. Create `apps/api/src/routes/module-validation-routes.ts` — Admin endpoints
3. Wire routes into `index.ts`
4. Add store-policy entries
5. Create UI page at `apps/web/src/app/cprs/admin/module-validation/page.tsx`
6. Create runbook at `docs/runbooks/phase163-modular-packaging-validation.md`

## Verification Steps

- `pnpm -C apps/api exec tsc --noEmit` — clean
- `pnpm -C apps/web exec tsc --noEmit` — clean

## Files Touched

- NEW: apps/api/src/modules/validation/\*.ts (5 files)
- NEW: apps/api/src/routes/module-validation-routes.ts
- EDIT: apps/api/src/index.ts (import + register)
- EDIT: apps/api/src/platform/store-policy.ts (+1 entry)
- NEW: apps/web/src/app/cprs/admin/module-validation/page.tsx
- NEW: docs/runbooks/phase163-modular-packaging-validation.md
