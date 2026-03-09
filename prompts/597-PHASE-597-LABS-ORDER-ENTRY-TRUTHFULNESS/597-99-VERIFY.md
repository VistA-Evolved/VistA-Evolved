# Phase 597 - Labs Order Entry Truthfulness - VERIFY

## Verification Steps

1. Confirm Docker and API readiness:
- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
- `curl.exe -s http://127.0.0.1:3001/health`
- `curl.exe -s http://127.0.0.1:3001/vista/ping`

2. Login and capture a valid session cookie:
- write `login-body.json` with `PRO1234 / PRO1234!!`
- `curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"`

3. Exercise the live lab-order route:
- `curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/lab -H "Content-Type: application/json" -H "X-CSRF-Token: <token>" -d '{"dfn":"46","labTest":"CBC"}'`
- verify the response is truthful for the current lane:
  either `ok:true` with a real order IEN, or `status:"unsupported-in-sandbox"` / `mode:"draft"` with an explicit pending note

4. Check the chart UI manually:
- open the CPRS Labs panel for DFN 46
- create a lab order request from the new composer
- verify the user sees the real or draft result state immediately with no fake success language

5. Regenerate metadata and run the verifier:
- `pnpm qa:phase-index`
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1`

## Acceptance Criteria

- The Labs panel exposes a working `+ New Lab Order` workflow.
- The frontend calls the live `/vista/cprs/orders/lab` route rather than using placeholder UI state.
- Real responses show a real VistA order reference when available.
- Draft or unsupported results are labeled clearly and explain the missing lab quick-order configuration.
- Action metadata includes the lab-order write path.
- Phase 597 is present in regenerated prompt metadata.