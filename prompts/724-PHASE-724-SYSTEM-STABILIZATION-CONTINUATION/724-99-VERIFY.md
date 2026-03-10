# Phase 724 - System Stabilization Continuation - VERIFY

## Verification Steps
1. Confirm Docker containers are up:
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
2. Start API and verify startup logs include:
   - `Server listening` on `3001`
   - `Platform PG init` with `ok: true`
   - no `migration_failed`
3. Verify live connectivity:
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
   - `curl.exe -s http://127.0.0.1:3001/health`
4. Login and validate session + CSRF issuance:
   - `POST /auth/login` with `PRO1234 / PRO1234!!`
5. Validate core VistA reads (`dfn=46`):
   - allergies, vitals, meds, notes, reports, labs where applicable.
6. Validate module route health across enabled modules:
   - imaging, telehealth, scheduling, rcm, analytics, admin modules.
7. Validate representative UI workflows (CPRS + portal) for no dead-click regressions.
8. Run verifier:
   - `powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1`
9. If any gate fails, fix and re-run until all required gates pass.
10. Capture final evidence and summarize exact commands and responses.

## Acceptance Criteria
- API is stable on startup without repeated manual process killing.
- Live VistA connectivity is confirmed and clinical routes return real data.
- Module route health is green for enabled modules.
- UX/UI workflow checks show no blocking dead clicks in tested paths.
- `verify-latest` reports `RC_READY` with required gates passing.
- Ops artifacts reflect what changed, how to test, and remaining follow-ups.
