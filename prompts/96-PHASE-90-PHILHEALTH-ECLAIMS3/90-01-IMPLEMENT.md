# Phase 90 — PhilHealth eClaims 3.0 Posture (Export + Validation + Readiness) — IMPLEMENT

## User Request

Build Phase 90: PhilHealth eClaims 3.0 posture module with claim draft domain,
CF1-CF4 export pipeline, eSOA validation, test upload simulator, facility setup
UI, and honest status tracking (never claiming certification).

## Deliverables

1. **PhilHealth Claim Draft Domain** — types + in-memory store for claim drafts
   with honest statuses (draft → ready_for_submission → exported → test_uploaded).
2. **Validation Engine** — field validation + eSOA mandate rules (scanned PDF
   rejected for admissions >= April 2026).
3. **Export Pipeline** — generates eClaims Package (manifest + CF1-CF4 + eSOA).
4. **Test Upload Simulator** — simulated DTD/schema validation + fake TCN
   (marked SIMULATED). Never claims real submission.
5. **Facility Setup API + UI** — accreditation identifiers, provider accreditations,
   eClaims 3.0 readiness checklist.
6. **Admin UI** — PhilHealth Setup page + PhilHealth Claims page.
7. **Runbook** — docs/runbooks/philhealth-eclaims3-posture.md with NOT CERTIFIED banner.

## Implementation Steps

1. Create types: apps/api/src/rcm/payerOps/philhealth-types.ts
2. Create store: apps/api/src/rcm/payerOps/philhealth-store.ts
3. Create validator: apps/api/src/rcm/payerOps/philhealth-validator.ts
4. Create routes: apps/api/src/rcm/payerOps/philhealth-routes.ts
5. Register routes in index.ts
6. Create Setup page: apps/web/src/app/cprs/admin/philhealth-setup/page.tsx
7. Create Claims page: apps/web/src/app/cprs/admin/philhealth-claims/page.tsx
8. Add nav links to admin layout
9. Create runbook + ops artifacts

## Verification Steps

- TypeScript compiles clean (tsc --noEmit)
- All PhilHealth routes registered under /rcm/payerops/philhealth/
- Validation enforces eSOA rules for admissions >= April 2026
- Export produces structured manifest with CF1-CF4 + eSOA
- Test upload returns SIMULATED TCN
- UI shows NOT CERTIFIED / SIMULATED banners
- No PHI in audit logs

## Files Touched

- apps/api/src/rcm/payerOps/philhealth-types.ts (new)
- apps/api/src/rcm/payerOps/philhealth-store.ts (new)
- apps/api/src/rcm/payerOps/philhealth-validator.ts (new)
- apps/api/src/rcm/payerOps/philhealth-routes.ts (new)
- apps/api/src/index.ts (register routes)
- apps/web/src/app/cprs/admin/philhealth-setup/page.tsx (new)
- apps/web/src/app/cprs/admin/philhealth-claims/page.tsx (new)
- apps/web/src/app/cprs/admin/layout.tsx (add nav links)
- docs/runbooks/philhealth-eclaims3-posture.md (new)
- ops/phase90-summary.md (new)
- ops/phase90-notion-update.json (new)
