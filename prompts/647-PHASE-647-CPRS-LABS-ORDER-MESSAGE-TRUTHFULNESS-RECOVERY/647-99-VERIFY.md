# Phase 647 - CPRS Labs Order Message Truthfulness Recovery - VERIFY

## Verification Steps

1. Confirm Docker and API readiness:
- `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
- `curl.exe -s http://127.0.0.1:3001/health`
- `curl.exe -s http://127.0.0.1:3001/vista/ping`

2. Login and capture a valid session cookie plus CSRF token:
- write `login-body.json` with `PRO1234 / PRO1234!!`
- `curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"`

3. Exercise the live backend order route:
- `curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/lab -H "Content-Type: application/json" -H "X-CSRF-Token: <csrfToken>" -d '{"dfn":"46","labTest":"CBC"}'`
- verify VEHU returns the truthful draft posture with `status:"unsupported-in-sandbox"` and a concrete `message`

4. Exercise the CPRS Labs Orders UI:
- open `/cprs/chart/46/labs`
- switch to Orders
- submit `CBC` through `Submit VistA Request`
- verify the UI shows the backend draft/unsupported message instead of a generic `Lab request failed`

5. Check editor diagnostics for the modified frontend file.

## Acceptance Criteria

- The Labs Orders tab preserves backend draft or sync-pending messaging when `ok:false` but the response is still truthful.
- The chart only shows a red error state for real failures, not for honest sandbox posture.
- The runbook reflects the default VEHU free-text lab-order behavior.
- Phase 647 artifacts exist and the recovered UI behavior is verified live.