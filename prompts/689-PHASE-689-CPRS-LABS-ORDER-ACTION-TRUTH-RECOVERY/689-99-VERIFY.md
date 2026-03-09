# Phase 689 - CPRS Labs Order Action Truth Recovery Verify

## Verification Steps
1. Confirm Docker/API/VistA health with `docker ps`, `/health`, and `/vista/ping`.
2. Open `/cprs/chart/46/labs` and switch to the Orders view.
3. Confirm `Submit VistA Request` is disabled while the VistA Lab Test Request field is blank.
4. Confirm `Create Workflow Order` is disabled while Test Name is blank.
5. Enter a test name in each relevant field and confirm the corresponding action enables.
6. Run changed-file diagnostics and a frontend compile check.

## Acceptance Criteria
- The Labs Orders view no longer exposes enabled primary actions that silently no-op on blank required inputs.
- Both order-entry actions enable only when their minimum required text input is present.
- Existing order-entry behavior remains unchanged once the inputs are populated.
- Ops artifacts record the live browser proof for the corrected UI contract.