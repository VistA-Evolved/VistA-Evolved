# Phase 685 - VERIFY: eMAR Barcode Scan Order Fallback

## Verification Steps

1. Confirm Docker, API, and VistA health are clean before testing:
   - `curl.exe -s http://127.0.0.1:3001/health`
2. Authenticate with the VEHU clinician account:
   - `PRO1234 / PRO1234!!`
3. Call `GET /emar/schedule?dfn=46` and confirm the active medication is still
   present for the patient.
4. Call `POST /emar/barcode-scan` for `dfn=46` with a barcode string that
   matches the active medication text and confirm the route no longer reports
   `activeMedCount: 0`.
5. Confirm the barcode-scan response includes the fallback-enriched
   `rpcUsed` array when `ORWPS ACTIVE` alone is insufficient.
6. Open `/cprs/emar?dfn=46`, switch to the BCMA Scanner tab, and verify the UI
   reflects the corrected barcode match posture.

## Acceptance Criteria

- `POST /emar/barcode-scan` returns `ok: true` with a non-zero
  `activeMedCount` for DFN 46.
- The response can match the visible active medication instead of falsely
  behaving as if no active meds exist.
- Schedule and scanner surfaces are consistent for the same patient.
- No new diagnostics are introduced in touched files.
