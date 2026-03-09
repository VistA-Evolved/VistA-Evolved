# Phase 649 - VERIFY: CPRS Cover Sheet Orders Summary Truthfulness Recovery

## User Request

Verify that the CPRS Cover Sheet Orders Summary card reflects live unsigned orders for DFN 46 instead of remaining permanently integration-pending when `ORWORB UNSIG ORDERS` is unavailable.

## Verification Steps

1. Verify Docker and API health.
2. Log into the API with VEHU clinician credentials.
3. Call `GET /vista/cprs/orders?dfn=46` and confirm the recovered orders route returns at least one unsigned order.
4. Call `GET /vista/cprs/orders-summary?dfn=46` and confirm it returns the live unsigned order count and recent rows instead of `integration-pending`.
5. Open `/cprs/chart/46/cover` and confirm the Orders Summary card shows the live unsigned order count.
6. Confirm no new diagnostics in edited files.

## Manual Commands

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/orders-summary?dfn=46"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Expected Outcome

- The orders summary route returns live unsigned order data for DFN 46 even when `ORWORB UNSIG ORDERS` is unavailable on the VistA instance.
- The Cover Sheet Orders Summary card shows the live unsigned count instead of a stale pending badge.
- The recovery does not introduce new editor or TypeScript diagnostics.
