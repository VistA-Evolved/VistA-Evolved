# Phase 629 - CPRS Surgery Route Resilience Recovery

## User request

Continue the live CPRS chart audit until the full UI works truthfully end to end, using VistA-first behavior and checking prompt lineage whenever a panel looks incomplete, pending, or wrong.

## Problem observed live

During the live Surgery panel audit for DFN=46:

- The web panel showed `No surgical cases on file`.
- A direct live HTTP check to `GET /vista/surgery?dfn=46` intermittently returned `{"ok":false,"error":"Connection closed before response","rpcUsed":"ORWSR LIST"}`.

That discrepancy is not acceptable for a clinician-facing UI. It indicates the Surgery list route is still using the fragile direct broker pattern (`connect()/callRpc()/disconnect()`) instead of the resilient RPC wrapper used by other recovered panels.

## Inventory first

Files inspected:

- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`
- `apps/web/src/stores/data-cache.tsx`
- `prompts/612-PHASE-612-CPRS-SURGERY-DETAIL-OPERATIVE-REPORT-PARITY/612-01-IMPLEMENT.md`

Existing routes/endpoints involved:

- `GET /vista/surgery?dfn=46`
- `GET /vista/surgery/detail?id=...&dfn=46`

Existing UI involved:

- `SurgeryPanel`
- data-cache `surgery` domain

Exact files to change:

- `apps/api/src/server/inline-routes.ts`

## Implementation steps

1. Replace the surgery list route's raw broker calls with `safeCallRpc('ORWSR LIST', ...)`.
2. Replace surgery detail route raw calls with `safeCallRpc` for `ORWSR ONECASE`, `ORWSR LIST`, `TIU GET RECORD TEXT`, and `TIU DETAILED DISPLAY`.
3. Return explicit `status: 'request-failed'` plus `pendingTargets` on surgery list failure so the frontend can show a truthful pending/error banner instead of an empty-table claim.
4. Keep the existing surgery detail resolution logic intact; change transport behavior, not the functional contract.

## Verification steps

1. Confirm `/ready` is healthy before and after the change.
2. Login with VEHU clinician credentials and call:
   - `GET /vista/surgery?dfn=46`
3. Verify the route no longer intermittently fails with raw broker transport errors.
4. Reload the Surgery tab and confirm it either:
   - truthfully shows no cases from a clean `ok:true` response, or
   - shows a pending/error banner if the RPC fails.
5. Run diagnostics on `apps/api/src/server/inline-routes.ts`.

## Files touched

- `apps/api/src/server/inline-routes.ts`
- `prompts/629-PHASE-629-CPRS-SURGERY-ROUTE-RESILIENCE-RECOVERY/629-01-IMPLEMENT.md`
- `prompts/629-PHASE-629-CPRS-SURGERY-ROUTE-RESILIENCE-RECOVERY/629-99-VERIFY.md`