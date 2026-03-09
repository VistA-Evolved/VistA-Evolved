# Phase 654 - CPRS Orders Sign Recovery Verify

## Verification Steps

1. Confirm Docker and API prerequisites are healthy:
   - `docker ps --format "table {{.Names}}\t{{.Status}}"`
   - `curl.exe -s http://127.0.0.1:3001/health`
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
2. Log in with the VEHU clinician credentials `PRO1234 / PRO1234!!` and capture the CSRF token.
3. Fetch `GET /vista/cprs/orders?dfn=46` and confirm the unsigned order `8207;2` is still present before signing.
4. Call `POST /vista/cprs/orders/sign` with `dfn=46`, `orderIds=["8207;2"]`, and `esCode="PRO1234!!"`.
5. Confirm the route no longer returns a raw M error and instead returns either:
   - `ok:true` with `status:"signed"`, or
   - a structured blocker/failure payload without raw `%YDB-E-*` text.
6. Re-fetch `GET /vista/cprs/orders?dfn=46` and compare the live order state after the sign attempt.
7. Re-test the flow in the browser chart Orders tab and confirm the clinician no longer sees a raw VistA exception.

## Acceptance Criteria

- The sign route uses `ORWDX LOCK`, `ORWOR1 SIG`, and `ORWDX UNLOCK` in the real path.
- The route no longer passes DFN into `ORWOR1 SIG`.
- Raw M errors are not returned to the clinician UI.
- Live VEHU verification is recorded in ops artifacts.
- The canonical runbook reflects the corrected sign contract.
