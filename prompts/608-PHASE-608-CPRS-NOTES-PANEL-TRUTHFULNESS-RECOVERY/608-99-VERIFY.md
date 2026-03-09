# Phase 608 - VERIFY: CPRS Notes Panel Truthfulness Recovery

## Verification Goals

1. The standalone Notes panel no longer shows a false empty state when the latest notes fetch is failed or integration-pending.
2. The pending UI is grounded to real TIU RPC metadata.
3. Live VEHU notes reads still work for a valid patient.

## Manual Verification

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/cprs/notes/text?ien=14345"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
pnpm --dir apps/web exec tsc --noEmit
node scripts/build-phase-index.mjs
node scripts/generate-phase-qa.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Expected Outcome

- Live notes list returns `ok:true` with real TIU-backed note rows for DFN 46.
- Live note text route returns `ok:true` with real note body text.
- The Notes panel uses cache metadata to explain pending or failed reads instead of rendering a false `No notes on record` state.