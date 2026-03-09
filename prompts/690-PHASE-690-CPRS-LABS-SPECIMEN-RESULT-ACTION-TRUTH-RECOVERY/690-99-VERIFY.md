# Phase 690 - CPRS Labs Specimen/Result Action Truth Recovery Verify

## Verification Steps
1. Confirm Docker/API/VistA health with `docker ps`, `/health`, and `/vista/ping`.
2. Open `/cprs/chart/46/labs` and switch to `Specimens`.
3. Confirm `Create Specimen` is disabled while Order and Accession Number are blank.
4. Switch to `Critical Alerts` and confirm `Record Result` is disabled while Order, Analyte, and Value are blank.
5. Enter the minimum required fields and confirm each corresponding action enables.
6. Run changed-file diagnostics and a frontend compile check.

## Acceptance Criteria
- The Labs Specimens view no longer exposes an enabled create action without the required order/accession fields.
- The Labs Result recording view no longer exposes an enabled create action without the required order/analyte/value fields.
- Existing create behavior remains unchanged once the minimum required fields are present.
- Ops artifacts record the live browser proof for the corrected UI contract.