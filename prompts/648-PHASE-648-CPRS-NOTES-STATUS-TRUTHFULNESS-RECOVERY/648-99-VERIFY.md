# Phase 648 - VERIFY: CPRS Notes Status Truthfulness Recovery

## User Request

Verify that the CPRS Notes panel reflects live TIU note status truthfully for DFN 46 and does not mislabel unsigned notes as signed.

## Verification Steps

1. Verify Docker and API health before exercising the chart.
2. Log into the API with the VEHU clinician credentials.
3. Call `GET /vista/notes?dfn=46` and confirm note `14349` returns `status:"unsigned"`.
4. Call `GET /vista/tiu-text?id=14349` and confirm the TIU text includes `STATUS: UNSIGNED`.
5. Open `/cprs/chart/46/notes` in the clinician UI and confirm the matching note is labeled `Unsigned`, not `Signed`.
6. Confirm the Notes panel still compiles cleanly after the status-classifier fix.

## Manual Commands

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"
curl.exe -s http://127.0.0.1:3001/health
curl.exe -s http://127.0.0.1:3001/vista/ping
```

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/notes?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/tiu-text?id=14349"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```

## Expected Outcome

- Live backend output for note `14349` is consistently unsigned across both the note-list route and TIU text route.
- The CPRS Notes panel displays `Unsigned` for the note row and selected-note detail.
- No new TypeScript or editor diagnostics are introduced in the recovered panel.
