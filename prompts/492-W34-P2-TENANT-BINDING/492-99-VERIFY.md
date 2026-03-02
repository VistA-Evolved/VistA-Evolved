# Phase 492 — W34-P2 VERIFY: Tenant Binding

## Verification Gates

### Gate 1 — TenantConfig has 3 new fields
```powershell
$tc = Get-Content apps/api/src/config/tenant-config.ts -Raw
$hasPackId = $tc -match 'countryPackId'
$hasLocale = $tc -match 'locale:\s*string'
$hasTimezone = $tc -match 'timezone:\s*string'
if (-not $hasPackId -or -not $hasLocale -or -not $hasTimezone) {
  Write-Error "FAIL: TenantConfig missing countryPackId/locale/timezone"; exit 1
}
Write-Host "PASS: TenantConfig has all 3 country binding fields"
```

### Gate 2 — TenantConfigRow has 3 new fields
```powershell
$repo = Get-Content apps/api/src/platform/pg/repo/tenant-config-repo.ts -Raw
$hasPackId = $repo -match 'country_pack_id'
$hasLocale = $repo -match 'locale.*TEXT'
$hasTimezone = $repo -match 'timezone.*TEXT'
if (-not $hasPackId -or -not $hasLocale -or -not $hasTimezone) {
  Write-Error "FAIL: TenantConfigRow missing DB columns"; exit 1
}
Write-Host "PASS: TenantConfigRow has all 3 DB columns"
```

### Gate 3 — PG migration v51 exists
```powershell
$migrate = Get-Content apps/api/src/platform/pg/pg-migrate.ts -Raw
if ($migrate -notmatch 'version:\s*51') {
  Write-Error "FAIL: Migration v51 not found"; exit 1
}
if ($migrate -notmatch 'country_pack_id') {
  Write-Error "FAIL: Migration v51 does not add country_pack_id column"; exit 1
}
Write-Host "PASS: PG migration v51 exists with country_pack_id"
```

### Gate 4 — resolveCountryPolicy function exists
```powershell
$loader = Get-Content apps/api/src/platform/country-pack-loader.ts -Raw
if ($loader -notmatch 'resolveCountryPolicy') {
  Write-Error "FAIL: resolveCountryPolicy not found in country-pack-loader.ts"; exit 1
}
Write-Host "PASS: resolveCountryPolicy() exists"
```

### Gate 5 — Default tenant seeds US pack
```powershell
$tc = Get-Content apps/api/src/config/tenant-config.ts -Raw
if ($tc -notmatch 'countryPackId.*US') {
  Write-Error "FAIL: Default tenant does not seed US country pack"; exit 1
}
Write-Host "PASS: Default tenant seeds US country pack"
```

### Gate 6 — Upsert SQL includes new columns
```powershell
$repo = Get-Content apps/api/src/platform/pg/repo/tenant-config-repo.ts -Raw
if ($repo -notmatch 'country_pack_id.*locale.*timezone') {
  Write-Error "FAIL: Upsert SQL missing new columns"; exit 1
}
Write-Host "PASS: Upsert SQL includes country_pack_id, locale, timezone"
```

## Expected Result

All 6 gates PASS. TenantConfig is extended with country pack binding fields,
DB migration adds the columns, and resolveCountryPolicy() provides the
canonical lookup path for P3-P9.
