# Phase 139 — IMPLEMENT: Scheduling Lifecycle + Clinic Resources + Portal Integration

## User Request
Wire real SD scheduling flows where VistA RPCs exist. Eliminate "SD scheduling RPCs named but sandbox data sparse" by:
- Implementing check-in / check-out lifecycle actions
- Adding request queue triage (approve/reject) for clinician workflow
- Adding tenant-scoped clinic preferences (PG, RLS-enforced)
- Creating inventory discovery script
- Enhancing portal appointments with real VistA data merge
- Enhancing admin scheduling UI with action buttons

## Implementation Steps
1. PG migration v16: `clinic_preferences` table (tenant_id, clinic_ien, timezone, slot_duration, display_config)
2. PG schema + repo for clinic preferences
3. New API endpoints:
   - POST /scheduling/appointments/:id/checkin
   - POST /scheduling/appointments/:id/checkout
   - POST /scheduling/requests/:id/approve
   - POST /scheduling/requests/:id/reject
   - GET /scheduling/clinic/:ien/preferences
   - PUT /scheduling/clinic/:ien/preferences (admin)
4. Immutable audit actions: scheduling.checkin, scheduling.checkout, scheduling.approve, scheduling.reject, scheduling.clinic_preferences
5. Capabilities: 5 new entries in capabilities.json
6. Admin scheduling page: request approve/reject buttons, check-in actions
7. Portal appointments page: enhanced data merge + status display
8. Inventory script: scripts/vista/inventory-scheduling.mjs
9. Runbook: docs/runbooks/scheduling-lifecycle.md

## Verification
- TSC clean
- Next.js build clean
- Vitest passes
- Gauntlet FAST 4P/0F/1W, RC 15P/0F/1W

## Files Touched
- apps/api/src/platform/pg/pg-migrate.ts (v16)
- apps/api/src/platform/pg/pg-schema.ts (clinic_preferences)
- apps/api/src/platform/pg/repo/pg-clinic-preferences-repo.ts (new)
- apps/api/src/routes/scheduling/index.ts (6 new endpoints)
- apps/api/src/lib/immutable-audit.ts (5 new actions)
- config/capabilities.json (5 new)
- apps/web/src/app/cprs/scheduling/page.tsx (action buttons)
- apps/portal/src/app/dashboard/appointments/page.tsx (VistA data merge)
- scripts/vista/inventory-scheduling.mjs (new)
- docs/runbooks/scheduling-lifecycle.md (new)
