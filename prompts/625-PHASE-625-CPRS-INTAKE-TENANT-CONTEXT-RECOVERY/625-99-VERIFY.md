## Verify

- [ ] `GET /intake/by-patient/46` does not return `TENANT_REQUIRED`
- [ ] CPRS Intake tab no longer shows `Tenant context required`
- [ ] No new TypeScript errors in edited files

## Live Checks

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -i -s -b cookies.txt "http://127.0.0.1:3001/intake/by-patient/46"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```