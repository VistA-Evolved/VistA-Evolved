# Phase 81 — Imaging Viewer v1 (VistA Metadata + DICOM Posture)

## User Request

Deliver a credible imaging workflow:

- Imaging studies list per patient (VistA metadata grounded)
- Imaging report viewer (text reports)
- Image viewer posture (DICOM viewer if configured; else integration instructions)

## Implementation Steps

### Step 0 — Inventory

Existing imaging infrastructure is extensive (Phases 14D, 18C, 22, 23, 24, 37C):

- `apps/api/src/services/imaging-service.ts` — VistA MAG4 + Orthanc fallback study list, report, viewer URL
- `apps/api/src/routes/imaging.ts` — Phase 14D: `/vista/imaging/status`, `/vista/imaging/report`
- `apps/api/src/routes/imaging-proxy.ts` — Phase 22+24: DICOMweb proxy, viewer redirect
- `apps/web/src/components/cprs/panels/ImagingPanel.tsx` — 5-tab panel (Studies/Worklist/Orders/Devices/Audit)
- `apps/api/src/config/imaging-tenant.ts` — Tenant-scoped Orthanc/viewer config
- `apps/api/src/adapters/imaging/` — Interface + VistA + Stub adapters

### Step 1 — New Phase 81 Files

1. `scripts/imaging/buildImagingPlan.ts` — Plan artifact builder
2. `apps/api/src/routes/imaging-viewer.ts` — Clean Phase 81 route file with 3 endpoints:
   - `GET /imaging/studies/:dfn` — Study list (delegates to imaging-service logic)
   - `GET /imaging/report/:studyId` — Report text (VistA RA + TIU fallback + pendingTarget)
   - `GET /imaging/viewer-link/:studyId` — Viewer URL or integration instructions
3. UI enhancement to `ImagingPanel.tsx`:
   - Add inline report viewer when study selected
   - Add "View Report" button in study detail panel
   - Add viewer-not-configured instructions panel
4. `apps/api/e2e/imaging-viewer.spec.ts` — E2E tests
5. `scripts/verify-phase81-imaging-viewer.ps1` — Verifier

### Step 2 — Verification Gates

- Source files exist
- Route handlers registered
- VistA RPCs referenced (MAG4, RA DETAILED REPORT, TIU)
- Pending targets documented
- UI has report viewer
- E2E tests cover list + report + viewer link + invalid ID
- No PHI leakage

### Files Touched

- `apps/api/src/routes/imaging-viewer.ts` (NEW)
- `apps/api/src/index.ts` (ADD registration)
- `apps/web/src/components/cprs/panels/ImagingPanel.tsx` (ENHANCE)
- `scripts/imaging/buildImagingPlan.ts` (NEW)
- `apps/api/e2e/imaging-viewer.spec.ts` (NEW)
- `scripts/verify-phase81-imaging-viewer.ps1` (NEW)
- `docs/runbooks/phase81-imaging-viewer.md` (NEW)
