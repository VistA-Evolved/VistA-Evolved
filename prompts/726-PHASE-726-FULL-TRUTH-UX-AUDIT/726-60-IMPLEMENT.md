# Phase 726-60 Implement - Workflows Admin Slice

## User Request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist, prove `/cprs/admin/workflows` against the live canonical VEHU stack, patch only evidence-backed truth defects, and record the slice only after browser proof.

## Inventory

### Frontend surface

- `apps/web/src/app/cprs/admin/workflows/page.tsx`

### Backing API routes exercised by the page

- `GET /admin/workflows/definitions`
- `POST /workflows/start`
- `GET /workflows/instances`
- `POST /workflows/instances/:id/step/:stepId`
- `GET /admin/workflows/packs`
- `POST /admin/workflows/seed`
- `GET /admin/workflows/stats`
- `GET /vista/cprs/notes/titles`
- `GET /workflow/switchboard`
- `GET /workflow/switchboard/:name`

### Backend route files

- `apps/api/src/workflows/workflow-routes.ts`
- `apps/api/src/workflow/switchboard-routes.ts`

## Implementation Steps

1. Corroborate the authenticated and unauthenticated contracts for every browser-visible tab route used by `/cprs/admin/workflows`.
2. Browser-prove `/cprs/admin/workflows` in authenticated and unauthenticated contexts across the visible Definitions, Instances, Packs, Stats, and Switchboard tabs.
3. Identify any real truth defect such as fail-open auth handling, fake empty or zero-state rendering, or a visible frontend/backend route mismatch.
4. Apply the smallest possible fix in the web route.
5. Re-prove the affected authenticated and unauthenticated browser states after the fix.
6. Record the slice in the browser audit artifact, runtime override ledger, ops summary, and notion update.
7. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` before advancing.