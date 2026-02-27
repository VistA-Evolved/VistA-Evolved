<#
.SYNOPSIS
  Phase 157 verifier -- Audit JSONL Shipping to Object Store
.DESCRIPTION
  Validates:
    1. TypeScript compiles clean
    2. PG migration v22 exists
    3. SQLite migration has audit_ship tables
    4. Drizzle schema has audit ship tables
    5. S3 client module exists
    6. Shipper module exists
    7. Manifest module exists
    8. Shipping routes exist
    9. Posture gate exists
   10. Store policy entries exist
   11. Security shutdown wiring
   12. Index.ts startup wiring
   13. Env vars documented
   14. No console.log added
   15. No hardcoded credentials
   16. Runbook exists
   17. AUTH_RULES cover /audit/shipping
   18. Posture route registered
#>
param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0

function Gate($name, $ok, $detail) {
  if ($ok) {
    Write-Host "  PASS  $name -- $detail" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $name -- $detail" -ForegroundColor Red
    $script:fail++
  }
}
function WarnGate($name, $detail) {
  Write-Host "  WARN  $name -- $detail" -ForegroundColor Yellow
  $script:warn++
}

$root = Split-Path $PSScriptRoot -Parent
$api  = Join-Path $root "apps/api"

Write-Host "`n=== Phase 157: Audit JSONL Shipping Verifier ===" -ForegroundColor Cyan

# Gate 1: TypeScript compiles
if (-not $SkipBuild) {
  Write-Host "`n--- Gate 1: TypeScript build ---"
  Push-Location $api
  $buildOut = npx tsc --noEmit 2>&1 | Out-String
  $buildOk = $LASTEXITCODE -eq 0
  Pop-Location
  Gate "typescript_compiles" $buildOk $(if ($buildOk) { "Clean" } else { "Errors: $($buildOut.Substring(0, [Math]::Min(200, $buildOut.Length)))" })
} else {
  WarnGate "typescript_compiles" "Skipped (-SkipBuild)"
}

# Gate 2: PG migration v22
Write-Host "`n--- Gate 2: PG migration v22 ---"
$pgMigrate = Get-Content (Join-Path $api "src/platform/pg/pg-migrate.ts") -Raw
$hasV22 = $pgMigrate -match "version:\s*22"
$hasShipTable = $pgMigrate -match "audit_ship_offset"
Gate "pg_migration_v22" ($hasV22 -and $hasShipTable) "version 22 with audit_ship_offset table"

# Gate 3: SQLite migration
Write-Host "`n--- Gate 3: SQLite migration ---"
$sqliteMigrate = Get-Content (Join-Path $api "src/platform/db/migrate.ts") -Raw
$hasSqliteShip = $sqliteMigrate -match "audit_ship_offset" -and $sqliteMigrate -match "audit_ship_manifest"
Gate "sqlite_migration" $hasSqliteShip "audit_ship_offset + audit_ship_manifest tables"

# Gate 4: Drizzle schema
Write-Host "`n--- Gate 4: Drizzle schema ---"
$schema = Get-Content (Join-Path $api "src/platform/db/schema.ts") -Raw
$hasSchema = $schema -match "auditShipOffset" -and $schema -match "auditShipManifest"
Gate "drizzle_schema" $hasSchema "auditShipOffset + auditShipManifest tables"

# Gate 5: S3 client exists
Write-Host "`n--- Gate 5: S3 client ---"
$s3Path = Join-Path $api "src/audit-shipping/s3-client.ts"
$hasS3 = Test-Path -LiteralPath $s3Path
Gate "s3_client_exists" $hasS3 $s3Path

# Gate 6: Shipper module
Write-Host "`n--- Gate 6: Shipper module ---"
$shipperPath = Join-Path $api "src/audit-shipping/shipper.ts"
$hasShipper = Test-Path -LiteralPath $shipperPath
Gate "shipper_module_exists" $hasShipper $shipperPath

# Gate 7: Manifest module
Write-Host "`n--- Gate 7: Manifest module ---"
$manifestPath = Join-Path $api "src/audit-shipping/manifest.ts"
$hasManifest = Test-Path -LiteralPath $manifestPath
Gate "manifest_module_exists" $hasManifest $manifestPath

# Gate 8: Shipping routes
Write-Host "`n--- Gate 8: Shipping routes ---"
$routesPath = Join-Path $api "src/routes/audit-shipping-routes.ts"
$hasRoutes = Test-Path -LiteralPath $routesPath
Gate "shipping_routes_exist" $hasRoutes $routesPath

# Gate 9: Posture gate
Write-Host "`n--- Gate 9: Posture gate ---"
$posturePath = Join-Path $api "src/posture/audit-shipping-posture.ts"
$hasPosture = Test-Path -LiteralPath $posturePath
Gate "posture_gate_exists" $hasPosture $posturePath

# Gate 10: Store policy entries
Write-Host "`n--- Gate 10: Store policy ---"
$storePolicy = Get-Content (Join-Path $api "src/platform/store-policy.ts") -Raw
$hasStoreEntries = $storePolicy -match "audit-ship-offsets" -and $storePolicy -match "audit-ship-manifests"
Gate "store_policy_entries" $hasStoreEntries "audit-ship-offsets + audit-ship-manifests"

# Gate 11: Security shutdown wiring
Write-Host "`n--- Gate 11: Shutdown wiring ---"
$security = Get-Content (Join-Path $api "src/middleware/security.ts") -Raw
$hasShutdown = $security -match "stopShipperJob"
Gate "shutdown_wiring" $hasShutdown "stopShipperJob in graceful shutdown"

# Gate 12: Index.ts startup wiring
Write-Host "`n--- Gate 12: Startup wiring ---"
$index = Get-Content (Join-Path $api "src/index.ts") -Raw
$hasStartup = $index -match "startShipperJob" -and $index -match "auditShippingRoutes"
Gate "startup_wiring" $hasStartup "startShipperJob + auditShippingRoutes in index.ts"

# Gate 13: Env vars documented
Write-Host "`n--- Gate 13: Env vars ---"
$envExample = Get-Content (Join-Path $api ".env.example") -Raw
$hasEnvVars = $envExample -match "AUDIT_SHIP_ENABLED" -and $envExample -match "AUDIT_SHIP_ENDPOINT" -and $envExample -match "AUDIT_SHIP_BUCKET"
Gate "env_vars_documented" $hasEnvVars "AUDIT_SHIP_* vars in .env.example"

# Gate 14: No console.log
Write-Host "`n--- Gate 14: No console.log ---"
$shipDir = Join-Path $api "src/audit-shipping"
$consoleCount = 0
if (Test-Path -LiteralPath $shipDir) {
  $consoleCount = (Get-ChildItem $shipDir -Filter "*.ts" -Recurse | Select-String "console\." | Measure-Object).Count
}
Gate "no_console_log" ($consoleCount -eq 0) "Found $consoleCount console.log calls in audit-shipping/"

# Gate 15: No hardcoded credentials
Write-Host "`n--- Gate 15: No hardcoded creds ---"
$credCheck = 0
if (Test-Path -LiteralPath $shipDir) {
  $credCheck = (Get-ChildItem $shipDir -Filter "*.ts" -Recurse | Select-String "PROV123|minioadmin|password" | Measure-Object).Count
}
Gate "no_hardcoded_creds" ($credCheck -eq 0) "Found $credCheck credential patterns"

# Gate 16: Runbook exists
Write-Host "`n--- Gate 16: Runbook ---"
$runbookPath = Join-Path $root "docs/runbooks/phase157-audit-shipping.md"
$hasRunbook = Test-Path -LiteralPath $runbookPath
Gate "runbook_exists" $hasRunbook $runbookPath

# Gate 17: AUTH_RULES cover audit/shipping
Write-Host "`n--- Gate 17: AUTH_RULES ---"
# /audit/* is covered by the catch-all /^/(admin|audit|reports)\// -> admin
$hasAuthRule = $security -match '\(admin\|audit\|reports\)'
Gate "auth_rules_coverage" $hasAuthRule "/audit/* covered by admin catch-all"

# Gate 18: Posture route registered
Write-Host "`n--- Gate 18: Posture route ---"
$postureIndex = Get-Content (Join-Path $api "src/posture/index.ts") -Raw
$hasPostureRoute = $postureIndex -match "audit-shipping"
Gate "posture_route_registered" $hasPostureRoute "/posture/audit-shipping endpoint exists"

# Summary
Write-Host "`n=== Summary: $pass PASS / $fail FAIL / $warn WARN ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
exit $fail
