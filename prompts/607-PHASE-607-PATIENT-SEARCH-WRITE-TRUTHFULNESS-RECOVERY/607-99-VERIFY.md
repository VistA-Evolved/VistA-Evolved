# Phase 607 - VERIFY: Patient Search Write Truthfulness Recovery

## Verification Steps

1. Confirm Docker prerequisites are healthy:
   - docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
2. Confirm the API is healthy:
   - curl.exe -s http://127.0.0.1:3001/health
3. Authenticate with clinician credentials and capture session cookies plus CSRF token.
4. Exercise POST /vista/allergies with DFN 46 and verify ok:true with ORWDAL32 SAVE ALLERGY.
5. Exercise POST /vista/vitals with DFN 46 and verify ok:true with GMV ADD VM.
6. Exercise POST /vista/notes with DFN 46 and verify ok:true with TIU CREATE RECORD + TIU SET DOCUMENT TEXT.
7. Exercise POST /vista/medications with DFN 46 and verify the response is truthful:
   - either ok:true with a real orderIEN from ORWDXM AUTOACK
   - or ok:true plus mode:draft/syncPending when live AUTOACK cannot complete
8. Run the repo verifier used by current governance if it is relevant to touched areas.

## Acceptance Criteria

- Patient-search non-problem write calls are no longer rejected for CSRF mismatch.
- Allergy, vitals, and note writes succeed live against VEHU.
- Medication ordering no longer reports a misleading generic failure when the system intentionally falls back to a draft.
- The returned medication payload clearly distinguishes live VistA success from draft sync-pending status.
- Ops artifacts are updated with what changed, how it was verified, and any remaining VistA limitation.

## Files Touched

- apps/web/src/app/patient-search/page.tsx
- apps/api/src/server/inline-routes.ts
- docs/runbooks/vista-rpc-add-medication.md
- ops/summary.md
- ops/notion-update.json