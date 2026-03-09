# Phase 610 - VERIFY: CPRS Phase 12 Parity Panel Truthfulness Recovery

## Verification Goals

1. The remaining standalone Phase 12 parity panels no longer render false empty states for failed or integration-pending reads.
2. Pending UI remains grounded to the actual VistA RPCs behind each tab.
3. Live VEHU list routes for consults, surgery, D/C summaries, labs, and reports still return truthful posture for DFN 46.

## Manual Verification

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/consults?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/surgery?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/dc-summaries?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/labs?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/reports?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
Set-Location apps/web
pnpm exec tsc --noEmit
Set-Location ..\..
node scripts/build-phase-index.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Expected Outcome

- The five standalone parity panels show grounded pending posture rather than false empty states whenever the latest fetch is not trustworthy.
- Live list routes still return real VEHU posture for DFN 46.
- Report text loading remains functional for a real report definition when present.