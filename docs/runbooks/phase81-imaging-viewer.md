# Phase 81 -- Imaging Viewer v1 Runbook

## Overview

Phase 81 adds a credible imaging workflow with 3 clean endpoints:
- **Study list** per patient (VistA MAG4 -> Orthanc QIDO-RS -> pendingTargets)
- **Report viewer** (VistA RA DETAILED REPORT -> TIU fallback -> pendingTarget)
- **Viewer posture** (OHIF URL if configured, DICOMweb fallback, or setup instructions)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /imaging/studies/:dfn | Patient study list |
| GET | /imaging/report/:studyId | Radiology report text |
| GET | /imaging/viewer-link/:studyId | DICOM viewer URL or instructions |

## VistA RPCs Used

| RPC | Purpose | Sandbox Status |
|-----|---------|----------------|
| MAG4 REMOTE PROCEDURE | Study list from VistA Imaging | Not available |
| MAG4 PAT GET IMAGES | Full image inventory | Not available |
| RA DETAILED REPORT | Radiology report text | Available, data empty |
| TIU GET RECORD TEXT | Document text fallback | Available |
| TIU DOCUMENTS BY CONTEXT | Document query | Available |

## How to Test

### Prerequisites
1. API server running: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
2. VistA Docker running: `cd services/vista && docker compose --profile dev up -d`
3. (Optional) Orthanc + OHIF: `cd services/imaging && docker compose up -d`

### Manual Testing

```bash
# 1. Study list (returns Orthanc data or pendingTargets)
curl http://127.0.0.1:3001/imaging/studies/3

# 2. Report viewer (returns pendingTarget in sandbox)
curl http://127.0.0.1:3001/imaging/report/1.2.3.4.5

# 3. Viewer link (returns OHIF URL or instructions)
curl http://127.0.0.1:3001/imaging/viewer-link/1.2.3.4.5
```

### UI Testing
1. Open CPRS web app
2. Select a patient
3. Navigate to Imaging tab
4. Select a study -> click "View Report" or "Viewer Link"
5. Report text or pending target info displays inline
6. Viewer link shows OHIF URL or setup instructions

## Plan Artifact

Generate the imaging plan:
```bash
npx tsx scripts/imaging/buildImagingPlan.ts
# Output: artifacts/phase81/imaging-plan.json
```

## Verification

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-phase81-imaging-viewer.ps1
```

## Architecture Notes

- Phase 81 routes delegate to existing Phase 22-24 infrastructure
- No new in-memory stores created
- Pixel data retrieval is exclusively via Orthanc/DICOMweb
- If VistA Imaging RPCs become available, they take priority automatically
- Viewer probes OHIF + Orthanc health before generating URLs
