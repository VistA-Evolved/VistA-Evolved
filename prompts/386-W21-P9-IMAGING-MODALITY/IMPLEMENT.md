# Phase 386 — W21-P9 Imaging Modality Connectivity — IMPLEMENT

## User Request

Build imaging modality connectivity per Wave 21 manifest W21-P9. Implements
Modality Worklist (MWL), MPPS tracking, modality AE registration, and
DICOMweb bridge endpoints.

## Implementation Steps

1. Create `imaging-modality-types.ts` — types for worklist items, MPPS records,
   modality AE config, dose reports, statistics
2. Create `imaging-modality-store.ts` — in-memory stores for worklist (10K),
   MPPS (20K), modalities (500), audit (20K). Auto-links MPPS to worklist
   by accession number. DICOM UID generation.
3. Create `imaging-modality-routes.ts` — 15 REST endpoints:
   - 4 worklist endpoints (create, list, get, status)
   - 4 MPPS endpoints (create, list, get, status)
   - 5 modality endpoints (register, list, get, status, echo)
   - 2 stats/audit endpoints
4. Wire barrel export, register-routes, store-policy (4 entries)

## Files Touched

- `apps/api/src/devices/imaging-modality-types.ts` (NEW)
- `apps/api/src/devices/imaging-modality-store.ts` (NEW)
- `apps/api/src/devices/imaging-modality-routes.ts` (NEW)
- `apps/api/src/devices/index.ts` (MODIFIED)
- `apps/api/src/server/register-routes.ts` (MODIFIED)
- `apps/api/src/platform/store-policy.ts` (MODIFIED — 4 entries)
