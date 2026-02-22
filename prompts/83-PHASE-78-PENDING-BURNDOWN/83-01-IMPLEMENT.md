# Phase 78 — IMPLEMENT: PendingTargets Burn-Down v1 (Top 20 Gaps)

## User Request
Close the top 20 pending-target gaps by severity and user impact.
VistA-first, Vivian-gated. No fake success.

## Selected Gaps (see /artifacts/phase78/selection.json)

### Batch 1 — Wire existing RPCs to stub routes (gaps 1-2)
- orders.dc → ORWDXA DC (already in registry)
- orders.flag → ORWDXA FLAG (already in registry)

### Batch 2 — Add registry + wire new endpoints (gaps 3-7)
- cover.load-reminders → ORQQPX REMINDERS LIST (add to registry)
- consults.detail → ORQQCN DETAIL (add endpoint)
- imaging.radiology-report → RA DETAILED REPORT (add endpoint)
- imaging.patient-images → MAG4 PAT GET IMAGES (add endpoint)
- imaging.patient-photos → MAGG PAT PHOTOS (add endpoint)

### Batch 3 — Fix traceability for already-wired endpoints (gaps 8-14)
- inbox.unsigned-orders, inbox.user-info → /vista/inbox exists
- rcm.encounters, rcm.insurance, rcm.icd-search → /vista/rcm/* exists
- catalog.list-rpcs → /vista/rpc-catalog exists
- interop.hl7-links → /vista/interop/hl7-links exists

### Batch 4 — Document impossible in sandbox (gaps 15-20)
- nursing.tasks/mar/administer → BCMA/PSB absent
- adt.admit/transfer/discharge → DGPM writes not broker RPCs

## Files Touched
- apps/api/src/vista/rpcRegistry.ts (add ORQQPX REMINDERS LIST)
- apps/api/src/routes/cprs/wave2-routes.ts (wire DC, FLAG)
- apps/api/src/routes/cprs/wave1-routes.ts (wire reminders)
- apps/api/src/routes/cprs/wave1-routes.ts (add consults.detail, imaging reads)
- scripts/build-traceability-index.ts (fix action→endpoint mappings)

## Verification
- Re-run pending-targets-index builder → count should drop by >= 20
- Re-run traceability-index builder → pending count should drop
- All new/modified endpoints return real VistA data or explicit justified pending
