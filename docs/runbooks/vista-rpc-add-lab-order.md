# VistA RPC Lab Order Entry

> Route: `/vista/cprs/orders/lab`
> Target RPCs: `ORWDX LOCK`, `ORWDXM AUTOACK`, `ORWDX UNLOCK`

## Current VEHU posture

The route is live and truthful, but the default VEHU sandbox does not ship with configured LRZ lab quick orders. That means a free-text lab request usually returns a server-side draft with `status: "unsupported-in-sandbox"` instead of a fake success.

If a valid lab quick-order IEN is provisioned in the active lane, the same route can place a real unsigned order.

## Manual test

```powershell
Set-Content -Path login-body.json -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII
$login = curl.exe -s -c cookies.txt -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d "@login-body.json"
$csrf = ($login | ConvertFrom-Json).csrfToken
curl.exe -s -b cookies.txt -X POST http://127.0.0.1:3001/vista/cprs/orders/lab -H "Content-Type: application/json" -H "X-CSRF-Token: $csrf" -d '{"dfn":"46","labTest":"CBC"}'
Remove-Item login-body.json,cookies.txt -ErrorAction SilentlyContinue
```

## Expected result

- Real lane with configured lab quick orders: `ok: true`, `mode: "real"`, `orderIEN`, `status: "unsigned"`
- Default VEHU sandbox: `ok: false`, `mode: "draft"`, `status: "unsupported-in-sandbox"`, `pendingNote` explaining missing lab quick-order configuration

## UI note

The CPRS Labs panel now exposes this route directly. Users can submit a request by lab name, and advanced operators can provide a `quickOrderIen` when a provisioned lane supports it.

In default VEHU, free-text requests like `CBC` usually resolve to `ok:false`, `mode:"draft"`, and `status:"unsupported-in-sandbox"` because LRZ quick orders are not configured. The chart must surface that backend `message` or `pendingNote` directly instead of collapsing it into a generic failure banner.