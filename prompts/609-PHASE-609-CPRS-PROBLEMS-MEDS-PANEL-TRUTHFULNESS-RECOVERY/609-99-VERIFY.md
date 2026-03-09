# Phase 609 - VERIFY: CPRS Problems and Medications Panel Truthfulness Recovery

## Verification Goals

1. The standalone Problems and Medications tabs no longer render false empty states for failed or integration-pending reads.
2. The pending UI remains grounded to real VistA RPC metadata.
3. Live VEHU problem and medication list routes still return real data posture for DFN 46.

## Manual Verification

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/problems?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/medications?dfn=46"
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

```powershell
pnpm --dir apps/web exec tsc --noEmit
node scripts/build-phase-index.mjs
powershell -ExecutionPolicy Bypass -File scripts/verify-latest.ps1
```

## Expected Outcome

- Live problems route returns `ok:true` with real `ORQQPL PROBLEM LIST` data for DFN 46.
- Live medications route returns truthful `ok:true` posture for DFN 46 and does not regress medication parsing.
- The standalone Problems and Medications tabs show grounded pending posture when their latest fetch is not trustworthy instead of showing false empty-chart copy.