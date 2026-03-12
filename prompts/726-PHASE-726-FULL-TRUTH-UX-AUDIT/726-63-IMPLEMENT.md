# Phase 726-63 Implement - Order Sets Slice

## User Request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist, prove `/cprs/order-sets` against the live canonical VEHU stack, patch only evidence-backed truth defects, and record the slice only after browser proof.

## Inventory

### Frontend surface

- `apps/web/src/app/cprs/order-sets/page.tsx`
- `apps/web/src/components/cprs/CPRSMenuBar.tsx`
- `apps/web/src/stores/patient-context.tsx`
- `apps/web/src/stores/data-cache.tsx`

### Backing behavior exercised by the page

- Local quick-order template catalog in the page component
- Local draft-order persistence through `useDataCache()`
- Patient context resolution through `usePatient()`
- Navigation handoff to `/cprs/chart/:dfn/orders`

### Related backend routes for truth comparison

- `GET /admin/vista/clinical-setup/order-sets`
- `GET /vista/admin/order-sets`

## Implementation Steps

1. Verify Docker, API, and `/vista/ping` health on the canonical VEHU stack before any edits.
2. Confirm the page’s actual contract by comparing the browser behavior with the local client implementation and any similarly named live VistA order-set routes.
3. Browser-prove `/cprs/order-sets` in authenticated and unauthenticated contexts, including local draft creation and the handoff into the Orders tab.
4. Identify any real truth defect such as fake VistA claims, misleading patient defaults, broken local draft persistence, or dishonest unauthenticated behavior.
5. Apply the smallest possible fix in the web route or related client store only if the browser proof exposes a real defect.
6. Re-prove the affected authenticated and unauthenticated browser states after the fix.
7. Record the slice in the browser audit artifact, runtime override ledger, ops summary, and notion update.
8. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` before advancing.