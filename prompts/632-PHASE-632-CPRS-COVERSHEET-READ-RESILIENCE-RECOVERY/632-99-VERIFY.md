# Phase 632 — VERIFY: CPRS Cover Sheet Read Resilience Recovery

## Verification Steps

1. Confirm runtime health:
   - `curl.exe -s http://127.0.0.1:3001/ready`
2. Log in with a clinician session:
   - `Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII`
   - `curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"`
3. Verify live vitals:
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/vitals?dfn=46"`
4. Verify live notes:
   - `curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"`
5. Clean up:
   - `Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue`
6. Reload `http://127.0.0.1:3000/cprs/chart/46/cover` and confirm the Vitals and Recent Notes cards match the live route posture.

## Expected Outcomes

- `/vista/vitals?dfn=46` no longer fails with `Connection closed before response`.
- `/vista/notes?dfn=46` remains stable under the same runtime.
- The Cover Sheet no longer shows spurious pending posture for Vitals or Recent Notes when the live routes succeed.