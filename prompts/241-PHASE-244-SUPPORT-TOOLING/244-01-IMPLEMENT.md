# Phase 244 — Support Tooling (Wave 6 P7)

## User Request

Build internal support tooling for operational diagnostics:

- System health dashboard API endpoints
- Diagnostic data collection (VistA, adapters, modules, stores)
- Support ticket stub with state tracking
- Admin support page

## Implementation Steps

1. Create `apps/api/src/support/diagnostics.ts` — system diagnostic collector
2. Create `apps/api/src/support/ticket-store.ts` — in-memory support ticket tracker
3. Create `apps/api/src/routes/support-routes.ts` — API endpoints
4. Wire routes into register-routes.ts
5. Create admin support page
6. Build, verify, commit

## Files Touched

- NEW: `apps/api/src/support/diagnostics.ts`
- NEW: `apps/api/src/support/ticket-store.ts`
- NEW: `apps/api/src/routes/support-routes.ts`
- NEW: `apps/web/src/app/cprs/admin/support/page.tsx`
- MOD: `apps/api/src/server/register-routes.ts`
- MOD: `apps/web/src/app/cprs/admin/layout.tsx`
- NEW: `scripts/verify-phase244-support-tooling.ps1`
