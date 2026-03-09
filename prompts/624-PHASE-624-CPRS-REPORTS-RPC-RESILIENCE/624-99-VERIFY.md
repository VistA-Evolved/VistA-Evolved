## Verify

- [ ] API starts cleanly against live VEHU Docker
- [ ] `GET /vista/reports?dfn=46` returns `ok:true`
- [ ] `GET /vista/reports?dfn=46` includes non-zero report catalog data
- [ ] `GET /vista/reports/text?dfn=46&id=<report-id>` returns `ok:true`
- [ ] CPRS Reports tab no longer shows `request-failed`
- [ ] CPRS Reports tab renders live report types from `ORWRP REPORT LISTS`
- [ ] No new TypeScript errors in edited files

## Live Checks

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/reports?dfn=46"
curl.exe -s -b cookies.txt "http://127.0.0.1:3001/vista/reports/text?dfn=46&id=1"
Remove-Item login-body.json, cookies.txt -ErrorAction SilentlyContinue
```