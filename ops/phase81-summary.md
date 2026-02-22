# Phase 81 Summary -- Imaging Viewer v1 (VistA Metadata + DICOM Posture)

## What Changed

### New Files
- `apps/api/src/routes/imaging-viewer.ts` -- 3 VistA-grounded imaging endpoints
- `scripts/imaging/buildImagingPlan.ts` -- Plan artifact builder
- `apps/api/e2e/imaging-viewer.spec.ts` -- E2E tests (5 suites)
- `scripts/verify-phase81-imaging-viewer.ps1` -- Verifier (68 gates)
- `docs/runbooks/phase81-imaging-viewer.md` -- Runbook
- `prompts/86-PHASE-81-IMAGING-VIEWER-V1/86-01-IMPLEMENT.md` -- Prompt
- `prompts/86-PHASE-81-IMAGING-VIEWER-V1/86-99-VERIFY.md` -- Verify prompt

### Modified Files
- `apps/api/src/index.ts` -- Register imaging viewer routes
- `apps/web/src/components/cprs/panels/ImagingPanel.tsx` -- Report viewer, viewer link, pending targets UI
- `scripts/verify-latest.ps1` -- Delegate to Phase 81 verifier

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/imaging/studies/:dfn` | Imaging studies for patient (VistA MAG4 -> Orthanc QIDO-RS -> pendingTargets) |
| GET | `/imaging/report/:studyId` | Radiology report (RA DETAILED REPORT -> TIU GET RECORD TEXT -> pendingTarget) |
| GET | `/imaging/viewer-link/:studyId` | OHIF viewer URL or integration instructions |

## VistA RPCs Referenced
- MAG4 REMOTE PROCEDURE (sandbox: unavailable)
- MAG4 PAT GET IMAGES (sandbox: unavailable)
- RA DETAILED REPORT (sandbox: available, data empty)
- TIU GET RECORD TEXT (sandbox: available)
- TIU DOCUMENTS BY CONTEXT (sandbox: available)
- MAGG PAT PHOTOS (sandbox: unavailable)

## Pending Targets
- `MAG4_PAT_IMAGES` -- VistA Imaging must be configured (not in WorldVistA Docker)
- `RA_DETAILED_REPORT` -- VistA Rad/Nuc Med must have data
- `TIU_REPORT_TEXT` -- Radiology TIU notes must be signed
- `ORTHANC_DICOMWEB` -- Orthanc must be running with studies ingested

## How to Test Manually
```powershell
# Start API
cd apps/api
npx tsx --env-file=.env.local src/index.ts

# Studies list
curl http://127.0.0.1:3001/imaging/studies/3

# Report
curl http://127.0.0.1:3001/imaging/report/STUDY-001

# Viewer link
curl http://127.0.0.1:3001/imaging/viewer-link/STUDY-001
```

## Verifier Output
```
68 PASS / 0 FAIL / 68 total
```

## Follow-ups
- Wire VistA Imaging (MAG4) when available in production environment
- Enable Orthanc QIDO-RS for real study queries
- Add OHIF viewer embedding (iframe) in future phase
- Add radiology report search/filtering
