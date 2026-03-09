# Phase 603 — CPRS Cover Sheet Immunizations Recovery — VERIFY

## Verification Steps

1. Confirm Docker prerequisites:
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
2. Start the API with `.env.local` loaded and confirm clean startup logs.
3. Log in with `PRO1234 / PRO1234!!` and call:
   - `GET /vista/immunizations?dfn=46`
4. Verify the immunizations route returns live VistA-backed output with
   `rpcUsed` including `ORQQPX IMMUN LIST`.
5. Open the CPRS chart for patient DFN 46 and verify the cover sheet
   immunizations panel shows either live rows or `No immunizations on record`
   instead of a stale pending banner when the route is healthy.
6. Run TypeScript validation for touched apps.
7. Run `scripts/verify-latest.ps1`.

## Acceptance Criteria

- Cover sheet immunizations pending state is derived from the latest fetch only.
- A prior transient failure does not leave the panel stuck in pending state.
- Live empty data renders as an empty-state message, not integration pending.
- TypeScript passes for touched frontend code.
- Repo verification remains green.
