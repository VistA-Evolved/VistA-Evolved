# Phase 667 - CPRS Notes Body Persistence Recovery (VERIFY)

## Verification Steps

1. Confirm Docker and API readiness before retesting:
- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
- `curl.exe -s http://127.0.0.1:3001/health`
- `curl.exe -s http://127.0.0.1:3001/vista/ping`

2. Log in with the VEHU clinician credentials and create a fresh note for DFN 46 through the CPRS Notes panel.

3. Verify the Notes list refreshes and returns the new TIU IEN through `GET /vista/cprs/notes?dfn=46`.

4. Verify the route only reports success when TIU readback shows persisted body lines.
5. If VEHU still produces shell notes with `Line Count: 0`, verify the backend returns a structured blocked status and the Notes UI surfaces that blocker instead of a false success banner.

6. Exercise the addendum path on an unsigned note and verify it follows the same truthful blocked posture if body persistence fails.

7. Confirm the touched files have no new workspace diagnostics.

## Acceptance Criteria

- The Notes panel no longer reports a false successful create when VEHU only creates a shell note.
- The create route either proves persisted body lines or returns a structured blocked status with a clinician-readable message.
- The addendum route follows the same truthful success or blocked contract.
- The touched files remain free of new diagnostics.