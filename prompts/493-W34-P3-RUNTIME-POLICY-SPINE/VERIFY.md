# Phase 493 — W34-P3 VERIFY: Runtime Policy Spine

## Verification Gates

### Gate 1 — country-policy-hook.ts exists

```powershell
if (-not (Test-Path "apps/api/src/middleware/country-policy-hook.ts")) {
  Write-Error "FAIL: country-policy-hook.ts not found"; exit 1
}
Write-Host "PASS: country-policy-hook.ts exists"
```

### Gate 2 — Hook exports countryPolicyHook

```powershell
$hook = Get-Content apps/api/src/middleware/country-policy-hook.ts -Raw
if ($hook -notmatch 'export.*countryPolicyHook') {
  Write-Error "FAIL: countryPolicyHook export not found"; exit 1
}
Write-Host "PASS: countryPolicyHook exported"
```

### Gate 3 — Hook reads countryPackId from tenant config

```powershell
$hook = Get-Content apps/api/src/middleware/country-policy-hook.ts -Raw
if ($hook -notmatch 'countryPackId') {
  Write-Error "FAIL: Hook does not read countryPackId"; exit 1
}
if ($hook -notmatch 'resolveCountryPolicy') {
  Write-Error "FAIL: Hook does not call resolveCountryPolicy"; exit 1
}
Write-Host "PASS: Hook resolves country policy from tenant"
```

### Gate 4 — Hook registered in register-routes.ts

```powershell
$routes = Get-Content apps/api/src/server/register-routes.ts -Raw
if ($routes -notmatch 'country-policy-hook|countryPolicyHook') {
  Write-Error "FAIL: Hook not registered in register-routes.ts"; exit 1
}
Write-Host "PASS: Hook registered in server"
```

### Gate 5 — GET /country-policy/effective endpoint exists

```powershell
$routes = Get-Content apps/api/src/routes/country-pack-routes.ts -Raw
if ($routes -notmatch 'country-policy/effective|countryPolicy') {
  Write-Error "FAIL: /country-policy/effective endpoint not found"; exit 1
}
Write-Host "PASS: Effective policy endpoint exists"
```

## Expected Result

All 5 gates PASS. Every authenticated request has `request.countryPolicy`
available for P4-P9 subsystems to read.
