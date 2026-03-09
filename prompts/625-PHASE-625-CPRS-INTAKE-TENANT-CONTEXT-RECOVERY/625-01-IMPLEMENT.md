## User Request

Continue the live CPRS chart audit and fix the next real clinician-facing defect rather than stopping after Reports.

## Problem

The CPRS Intake tab for DFN 46 renders:

- `Tenant context required`
- `No intake sessions for this patient`

Live API reproduction:

- `GET /intake/by-patient/46` returns `400` with `TENANT_REQUIRED`
- `GET /intake/packs` also returns `400` with `TENANT_REQUIRED`

## Inventory

- Inspected: `apps/web/src/components/cprs/panels/IntakePanel.tsx`
- Inspected: `apps/api/src/intake/intake-routes.ts`
- Inspected: `apps/api/src/middleware/security.ts`
- Inspected: `apps/api/src/middleware/module-guard.ts`
- Inspected: `apps/api/src/server/register-routes.ts`

## Root Cause

`/intake/*` routes are designed to support mixed auth modes:

- portal session
- clinician session
- kiosk/device flows

The route handlers resolve those sessions themselves, but `moduleGuardHook` currently blocks `/intake/*` before handler auth/session resolution runs, producing `TENANT_REQUIRED`.

## Implementation Steps

1. Preserve existing intake route contracts and their own portal/clinician auth logic.
2. Allow `/intake/*` requests to reach the route handlers instead of being preempted by module guard.
3. Keep `GET /intake/question-schema` public as-is.
4. Reverify clinician Intake panel behavior live after restarting the API.

## Verification Steps

1. Login with clinician credentials `PRO1234 / PRO1234!!`.
2. Verify `GET /intake/by-patient/46` no longer returns `TENANT_REQUIRED`.
3. Reload CPRS Intake tab and confirm the tenant-context error disappears.
4. Confirm no new TypeScript errors in edited files.

## Files Touched

- `apps/api/src/middleware/module-guard.ts`