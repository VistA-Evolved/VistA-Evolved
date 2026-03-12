# Phase 726-59 Implement - VistA Admin Console Slice

## User Request

Continue the Phase 726 browser-control truth audit correctly and sequentially from the regenerated checklist, prove `/cprs/admin/vista-admin` against the live canonical VEHU stack, patch only evidence-backed truth defects, and record the slice only after browser proof.

## Inventory

### Frontend surface

- `apps/web/src/app/cprs/admin/vista-admin/page.tsx`
- Dynamic terminal child: `apps/web/src/components/cprs/VistaTerminal.tsx`

### Backing API routes exercised by the default browser path

- `GET /vista/ping`
- `GET /vista/admin/users`
- `GET /vista/admin/parameters`
- `GET /vista/admin/taskman`
- `GET /vista/admin/security-keys` as currently wired in the page
- WebSocket terminal target when the escape hatch is opened: `/ws/console`

### Backend route registration / implementation

- `apps/api/src/routes/vista-admin.ts`
- `apps/api/src/server/register-routes.ts`

## Implementation Steps

1. Corroborate the authenticated and unauthenticated contracts for the page’s default live requests on the canonical 3001 API.
2. Browser-prove `/cprs/admin/vista-admin` authenticated and unauthenticated, including the visible system tab and the terminal escape hatch if exercised.
3. Identify any real truth defect such as fail-open auth handling, stale success state reuse, or an obvious frontend/backend route mismatch on a visible tab.
4. Apply the smallest possible fix in the web route or backing component.
5. Re-prove the affected authenticated and unauthenticated browser states after the fix.
6. Record the slice in the browser audit artifact, runtime override ledger, ops summary, and notion update.
7. Regenerate `pnpm audit:ui-estate:runtime` and `pnpm audit:ui-estate:truth` before advancing.