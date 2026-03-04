# Phase 396 -- W22-P8: Clinical Reasoning + Quality Measures -- VERIFY

## Verification Gates

### Gate 1: TypeScript Compilation

- `cd apps/api && pnpm exec tsc --noEmit` -- PASS (zero errors)

### Gate 2: File Inventory

- [x] apps/api/src/clinical-reasoning/types.ts
- [x] apps/api/src/clinical-reasoning/reasoning-store.ts
- [x] apps/api/src/clinical-reasoning/reasoning-routes.ts
- [x] apps/api/src/clinical-reasoning/index.ts

### Gate 3: Wiring

- [x] register-routes.ts -- import + server.register(clinicalReasoningRoutes)
- [x] security.ts -- /clinical-reasoning/\* session
- [x] store-policy.ts -- 7 entries (libraries, measures, eval-results, patient-results, plans, activities, reports)

### Gate 4: API Contract (30 endpoints)

- CQL Libraries: CRUD x5
- Quality Measures: CRUD x5 + evaluate
- Evaluations: list + get
- Patient Results: list + create
- Plan Definitions: CRUD x5
- Activity Definitions: CRUD x5
- Reports: list + create + get
- Dashboard: 1
