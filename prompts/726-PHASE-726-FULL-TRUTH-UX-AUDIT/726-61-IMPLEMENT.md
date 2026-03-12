# Phase 726-61 Implement - Inpatient Operations Slice

## User Request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist, prove `/cprs/inpatient` against the live canonical VEHU stack, patch only evidence-backed truth defects, and record the slice only after browser proof.

## Inventory

### Frontend surface

- `apps/web/src/app/cprs/inpatient/page.tsx`

### Backing API routes exercised by the page

- `GET /vista/inpatient/wards`
- `GET /vista/inpatient/ward-census?ward=IEN`
- `GET /vista/inpatient/bedboard?ward=IEN`
- `GET /vista/inpatient/patient-movements?dfn=N`
- `POST /vista/inpatient/admit`
- `POST /vista/inpatient/transfer`
- `POST /vista/inpatient/discharge`
- `GET /vista/med-rec/sessions`
- `GET /vista/med-rec/session/:id`
- `POST /vista/med-rec/start`
- `POST /vista/med-rec/session/:id/decide`
- `POST /vista/med-rec/session/:id/complete`
- `GET /vista/discharge/plans?dfn=N`
- `GET /vista/discharge/plan/:id`
- `POST /vista/discharge/plan`
- `PATCH /vista/discharge/plan/:id`
- `PATCH /vista/discharge/plan/:id/checklist/:itemId`
- `POST /vista/discharge/plan/:id/ready`
- `POST /vista/discharge/plan/:id/complete`

### Backend route files

- `apps/api/src/routes/inpatient/index.ts`
- `apps/api/src/routes/discharge-workflow.ts`
- `apps/api/src/routes/med-reconciliation.ts`

## Implementation Steps

1. Verify Docker, API, and `/vista/ping` health on the canonical VEHU stack before any edits.
2. Corroborate the authenticated and unauthenticated contracts for the browser-visible inpatient, med-rec, and discharge routes used by `/cprs/inpatient`.
3. Browser-prove `/cprs/inpatient` in authenticated and unauthenticated contexts across the visible Census, Bed Board, ADT and discharge preparation, and Movements surfaces.
4. Identify any real truth defect such as fail-open auth handling, fake empty or zero-state rendering, misleading write affordances, or a visible frontend/backend route mismatch.
5. Apply the smallest possible fix in the web route if the browser proof exposes a real defect.
6. Re-prove the affected authenticated and unauthenticated browser states after the fix.
7. Record the slice in the browser audit artifact, runtime override ledger, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` before advancing.