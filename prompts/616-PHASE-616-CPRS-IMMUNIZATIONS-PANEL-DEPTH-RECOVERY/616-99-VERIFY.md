# Phase 616 - CPRS Immunizations Panel Depth Recovery Verification

## Verification Steps

1. Confirm Docker containers `vehu` and `ve-platform-db` are running.
2. Confirm the API is healthy at `/health` and VistA is reachable at `/vista/ping`.
3. Authenticate with `PRO1234 / PRO1234!!` and verify `GET /vista/immunizations?dfn=46` returns `ok: true` with a truthful live response.
4. Verify `GET /vista/immunizations/catalog` returns `ok: true` with real catalog rows from VistA.
5. Open `/cprs/chart/46/immunizations` in the browser and confirm the panel renders without module gating issues.
6. Confirm the chart shows patient history state, catalog/type-picker depth, and explicit write posture without fake success.
7. Run targeted diagnostics for changed files and fix any new errors caused by the recovery.

## Acceptance Criteria

- The immunizations chart tab renders successfully in the clinician UI.
- The panel displays live VistA immunization history response state for DFN 46.
- The panel displays live catalog/type-picker data from `PXVIMM IMM SHORT LIST`.
- The add immunization action remains honest and clearly marked integration-pending.
- No new relevant typecheck or lint errors are introduced by the change.
- Runbook and ops artifacts describe the recovery and its live verification.