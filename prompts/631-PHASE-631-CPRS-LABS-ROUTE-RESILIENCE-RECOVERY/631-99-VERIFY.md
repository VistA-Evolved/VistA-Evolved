# Phase 631 — VERIFY: CPRS Labs Route Resilience Recovery

## Verification Steps

1. Confirm the API is healthy:
   - `curl.exe -s http://127.0.0.1:3001/ready`
2. Log in with a real clinician session:
   - `Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII`
   - `curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"`
3. Call the live Labs route:
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/labs?dfn=46"`
4. Clean up:
   - `Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue`
5. Reload `http://127.0.0.1:3000/cprs/chart/46/labs` and confirm the Labs panel matches the live response.

## Expected Outcomes

- `/vista/labs?dfn=46` no longer fails with `Connection closed before response`.
- The Labs panel only shows `No lab results available for this patient.` when the live route returns `ok:true` with zero results.
- If a future live failure occurs, the response exposes truthful `request-failed` posture with `pendingTargets: ['ORWLRR INTERIM']`.