# Phase 673 - VERIFY: CPRS Medications Route Orders Fallback

## Verification Steps

1. Verify Docker containers and API health before testing the medications route.
2. Authenticate with the live VEHU clinician account `PRO1234 / PRO1234!!`.
3. Call `GET /vista/medications?dfn=46` and confirm the response now returns the active medication row for the audited patient.
4. Confirm the response includes truthful RPC provenance for the `ORWPS ACTIVE` primary path and any fallback order RPCs used.
5. Open `http://127.0.0.1:3000/cprs/chart/46/meds` and verify the Medications tab shows the active medication instead of `No medications`.
6. Re-check Orders and Nursing MAR for the same patient to ensure the medication surfaces remain aligned.

## Acceptance Criteria

- `/vista/medications?dfn=46` returns `{ "ok": true }` with at least one live medication row.
- The active medication matches the same patient context already proven in Orders and Nursing MAR.
- The Medications tab no longer shows a false chart-empty state for DFN 46.
- The route contract remains truthful if both primary and fallback VistA reads are genuinely empty.
- Documentation and ops notes reflect the live-verified behavior.

## Evidence

- Capture the authenticated curl response for `/vista/medications?dfn=46`.
- Capture the live Medications tab browser state after the backend fix.