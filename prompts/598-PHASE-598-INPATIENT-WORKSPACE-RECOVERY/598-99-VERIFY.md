# Phase 598 — VERIFY

## Verification Steps

1. Confirm Docker and API health before exercising inpatient workflow routes.
2. Log in against the live VEHU-backed API and start a medication reconciliation session for DFN 46.
3. Create a discharge plan linked to that med-rec session.
4. Call `/vista/med-rec/sessions` and `/vista/discharge/plans?dfn=46` and verify the new work appears in the recovery lists.
5. Type-check the web app after the inpatient UI changes.
6. Run `scripts/verify-latest.ps1` after implementation.

## Acceptance Criteria

1. The inpatient ADT workspace can load existing med-rec sessions for the active DFN.
2. The inpatient ADT workspace can load existing discharge plans for the active DFN.
3. Creating or updating workflow state refreshes the recovery lists without a page reload.
4. The UI does not imply that DG ADT discharge writeback is live in VEHU.
5. TypeScript compiles and the latest verifier passes.