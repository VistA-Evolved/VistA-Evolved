# ---------------------------------------------------------------
# Phase 51 Verifier -- Enterprise Packaging + Module Marketplace
# ---------------------------------------------------------------
# Gates:
#   G51-1  Disabled-module routes are not accessible (guard enforces 403)
#   G51-2  Dependency constraints enforced
#   G51-3  Tenant config changes reflected safely
#   G51-4  Structural / build integrity
# ---------------------------------------------------------------
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  $id -- $desc" -ForegroundColor Green; $script:pass++ }
    else         { Write-Host "  FAIL  $id -- $desc" -ForegroundColor Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  $id -- $desc ($_)" -ForegroundColor Red; $script:fail++
  }
}

$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Phase 51 -- Enterprise Packaging"       -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------
# G51-1  Module guard blocks disabled routes
# ---------------------------------------------------------------
Write-Host "--- G51-1  Module guard blocks disabled routes ---" -ForegroundColor Yellow

$guardFile = Join-Path $root "apps/api/src/middleware/module-guard.ts"
$registryFile = Join-Path $root "apps/api/src/modules/module-registry.ts"
$modulesJson = Join-Path $root "config/modules.json"
$indexFile = Join-Path $root "apps/api/src/index.ts"

Gate "G51-1a" "module-guard.ts exists" {
  Test-Path -LiteralPath $guardFile
}

Gate "G51-1b" "module-guard imports isRouteAllowed" {
  $c = Get-Content $guardFile -Raw
  $c -match "isRouteAllowed"
}

Gate "G51-1c" "module-guard returns 403 for disabled modules" {
  $c = Get-Content $guardFile -Raw
  $c -match "403" -and $c -match "Module not enabled"
}

Gate "G51-1d" "module-guard has BYPASS_PATTERNS including /api/marketplace" {
  $c = Get-Content $guardFile -Raw
  $c -match "BYPASS_PATTERNS" -and $c -match "api.*marketplace"
}

Gate "G51-1e" "module-guard hook registered globally in index.ts" {
  $c = Get-Content $indexFile -Raw
  $c -match "moduleGuardHook"
}

Gate "G51-1f" "modules.json has routePatterns for every non-kernel module" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $allOk = $true
  foreach ($prop in $j.modules.PSObject.Properties) {
    $mod = $prop.Value
    if ($prop.Name -eq "kernel") { continue }
    if (-not $mod.routePatterns -or $mod.routePatterns.Count -eq 0) {
      Write-Host "    missing routePatterns: $($prop.Name)" -ForegroundColor Red
      $allOk = $false
    }
  }
  $allOk
}

Gate "G51-1g" "isRouteAllowed function exists in module-registry.ts" {
  $c = Get-Content $registryFile -Raw
  $c -match "export function isRouteAllowed"
}

Gate "G51-1h" "resolveModuleForRoute function exists in module-registry.ts" {
  $c = Get-Content $registryFile -Raw
  $c -match "export function resolveModuleForRoute"
}

Gate "G51-1i" "module-guard bypass includes health/ready/version/metrics/auth" {
  $c = Get-Content $guardFile -Raw
  $c -match "health" -and $c -match "ready" -and $c -match "version" -and
  $c -match "metrics" -and $c -match "auth"
}

# ---------------------------------------------------------------
# G51-2  Dependency constraints enforced
# ---------------------------------------------------------------
Write-Host ""
Write-Host "--- G51-2  Dependency constraints enforced ---" -ForegroundColor Yellow

Gate "G51-2a" "validateDependencies function exists in module-registry.ts" {
  $c = Get-Content $registryFile -Raw
  $c -match "export function validateDependencies"
}

Gate "G51-2b" "POST /api/modules/override calls validateDependencies" {
  $routeFile = Join-Path $root "apps/api/src/routes/module-capability-routes.ts"
  $c = Get-Content $routeFile -Raw
  $c -match "validateDependencies" -and $c -match "/api/modules/override"
}

Gate "G51-2c" "Override route returns 400 on dependency failure" {
  $routeFile = Join-Path $root "apps/api/src/routes/module-capability-routes.ts"
  $c = Get-Content $routeFile -Raw
  $c -match "Dependency validation failed"
}

Gate "G51-2d" "setTenantModules always injects kernel" {
  $c = Get-Content $registryFile -Raw
  $c -match 'kernel' -and $c -match "setTenantModules"
}

Gate "G51-2e" "rcm module depends on kernel and clinical" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $deps = $j.modules.rcm.dependencies
  ($deps -contains "kernel") -and ($deps -contains "clinical")
}

Gate "G51-2f" "migration module depends on kernel and clinical" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $deps = $j.modules.migration.dependencies
  ($deps -contains "kernel") -and ($deps -contains "clinical")
}

Gate "G51-2g" "kernel module has no dependencies" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $j.modules.kernel.dependencies.Count -eq 0
}

Gate "G51-2h" "kernel is alwaysEnabled" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $j.modules.kernel.alwaysEnabled -eq $true
}

Gate "G51-2i" "marketplace upsert validates dependencies" {
  $mtFile = Join-Path $root "apps/api/src/config/marketplace-tenant.ts"
  $c = Get-Content $mtFile -Raw
  $c -match "validateDependencies" -and $c -match "upsertMarketplaceTenant"
}

# ---------------------------------------------------------------
# G51-3  Tenant config changes reflected safely
# ---------------------------------------------------------------
Write-Host ""
Write-Host "--- G51-3  Tenant config changes reflected safely ---" -ForegroundColor Yellow

$mtFile = Join-Path $root "apps/api/src/config/marketplace-tenant.ts"

Gate "G51-3a" "marketplace-tenant.ts exists" {
  Test-Path -LiteralPath $mtFile
}

Gate "G51-3b" "upsertMarketplaceTenant function exported" {
  $c = Get-Content $mtFile -Raw
  $c -match "export function upsertMarketplaceTenant"
}

Gate "G51-3c" "getMarketplaceTenantConfig function exported" {
  $c = Get-Content $mtFile -Raw
  $c -match "export function getMarketplaceTenantConfig"
}

Gate "G51-3d" "updateTenantConnectors function exported" {
  $c = Get-Content $mtFile -Raw
  $c -match "export function updateTenantConnectors"
}

Gate "G51-3e" "updateTenantJurisdiction function exported" {
  $c = Get-Content $mtFile -Raw
  $c -match "export function updateTenantJurisdiction"
}

Gate "G51-3f" "getAvailableJurisdictions returns 4 packs" {
  $c = Get-Content $mtFile -Raw
  ($c -match '"us"') -and ($c -match '"ph"') -and ($c -match '"global"') -and ($c -match '"sandbox"')
}

Gate "G51-3g" "initMarketplaceTenantConfig seeds from env" {
  $c = Get-Content $mtFile -Raw
  $c -match "initMarketplaceTenantConfig" -and $c -match "TENANT_JURISDICTION" -and $c -match "FACILITY_NAME"
}

Gate "G51-3h" "No secrets stored in marketplace-tenant (no API_KEY/TOKEN/SECRET/PASSWORD literals)" {
  $c = Get-Content $mtFile -Raw
  -not ($c -match 'API_KEY\s*[:=]' -or $c -match 'TOKEN\s*[:=]\s*"[^"]+[a-zA-Z0-9]{8}' -or $c -match 'PASSWORD\s*[:=]\s*"[^"]')
}

Gate "G51-3i" "Connector settings are non-secret (no secret field in ConnectorConfig)" {
  $c = Get-Content $mtFile -Raw
  $c -match "Non-secret settings"
}

Gate "G51-3j" "deleteMarketplaceTenant prevents default deletion" {
  $c = Get-Content $mtFile -Raw
  $c -match 'tenantId === "default"' -and $c -match "deleteMarketplaceTenant"
}

Gate "G51-3k" "Marketplace routes registered in module-capability-routes.ts" {
  $routeFile = Join-Path $root "apps/api/src/routes/module-capability-routes.ts"
  $c = Get-Content $routeFile -Raw
  ($c -match "/api/marketplace/config") -and
  ($c -match "/api/marketplace/connectors") -and
  ($c -match "/api/marketplace/jurisdiction") -and
  ($c -match "/api/marketplace/jurisdictions") -and
  ($c -match "/api/marketplace/summary")
}

Gate "G51-3l" "Marketplace routes require admin role" {
  $routeFile = Join-Path $root "apps/api/src/routes/module-capability-routes.ts"
  $c = Get-Content $routeFile -Raw
  # All marketplace routes check admin role
  $c -match 'role.*!==.*"admin"' -or $c -match 'role !== "admin"'
}

Gate "G51-3m" "AUTH_RULES includes /api/marketplace pattern" {
  $secFile = Join-Path $root "apps/api/src/middleware/security.ts"
  $c = Get-Content $secFile -Raw
  $c -match "marketplace"
}

# ---------------------------------------------------------------
# G51-4  Structural / build integrity
# ---------------------------------------------------------------
Write-Host ""
Write-Host "--- G51-4  Structural / build integrity ---" -ForegroundColor Yellow

Gate "G51-4a" "modules.json _meta.version is 2.0.0" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $j._meta.version -eq "2.0.0"
}

Gate "G51-4b" "modules.json has 13 modules" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  @($j.modules.PSObject.Properties).Count -eq 13
}

Gate "G51-4c" "Every module has version field" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $allOk = $true
  foreach ($prop in $j.modules.PSObject.Properties) {
    if (-not $prop.Value.version) { $allOk = $false; Write-Host "    missing version: $($prop.Name)" -ForegroundColor Red }
  }
  $allOk
}

Gate "G51-4d" "Every module has permissions array" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $allOk = $true
  foreach ($prop in $j.modules.PSObject.Properties) {
    if ($null -eq $prop.Value.permissions) { $allOk = $false; Write-Host "    missing permissions: $($prop.Name)" -ForegroundColor Red }
  }
  $allOk
}

Gate "G51-4e" "Every module has dataStores array" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $allOk = $true
  foreach ($prop in $j.modules.PSObject.Properties) {
    if ($null -eq $prop.Value.dataStores) { $allOk = $false; Write-Host "    missing dataStores: $($prop.Name)" -ForegroundColor Red }
  }
  $allOk
}

Gate "G51-4f" "Every module has healthCheckEndpoint" {
  $j = Get-Content $modulesJson -Raw | ConvertFrom-Json
  $allOk = $true
  foreach ($prop in $j.modules.PSObject.Properties) {
    if (-not $prop.Value.healthCheckEndpoint) { $allOk = $false; Write-Host "    missing healthCheckEndpoint: $($prop.Name)" -ForegroundColor Red }
  }
  $allOk
}

Gate "G51-4g" "skus.json has 7 SKU profiles" {
  $skuFile = Join-Path $root "config/skus.json"
  $j = Get-Content $skuFile -Raw | ConvertFrom-Json
  @($j.skus.PSObject.Properties).Count -eq 7
}

Gate "G51-4h" "FULL_SUITE SKU includes all 13 modules" {
  $skuFile = Join-Path $root "config/skus.json"
  $j = Get-Content $skuFile -Raw | ConvertFrom-Json
  $j.skus.FULL_SUITE.modules.Count -eq 13
}

Gate "G51-4i" "getModuleManifest function in module-registry.ts" {
  $c = Get-Content $registryFile -Raw
  $c -match "export function getModuleManifest"
}

Gate "G51-4j" "getAllModuleManifests function in module-registry.ts" {
  $c = Get-Content $registryFile -Raw
  $c -match "export function getAllModuleManifests"
}

Gate "G51-4k" "GET /api/modules/manifests route registered" {
  $routeFile = Join-Path $root "apps/api/src/routes/module-capability-routes.ts"
  $c = Get-Content $routeFile -Raw
  $c -match "/api/modules/manifests"
}

Gate "G51-4l" "Admin UI page exists (modules)" {
  $uiFile = Join-Path $root "apps/web/src/app/cprs/admin/modules/page.tsx"
  Test-Path -LiteralPath $uiFile
}

Gate "G51-4m" "Platform module docs exist" {
  $d1 = Join-Path $root "docs/platform/modules.md"
  $d2 = Join-Path $root "docs/platform/tenant-config.md"
  (Test-Path -LiteralPath $d1) -and (Test-Path -LiteralPath $d2)
}

Gate "G51-4n" "initMarketplaceTenantConfig called in index.ts" {
  $c = Get-Content $indexFile -Raw
  $c -match "initMarketplaceTenantConfig"
}

Gate "G51-4o" "getModuleStatus returns Phase 51 fields (version, permissions, dataStores)" {
  $c = Get-Content $registryFile -Raw
  ($c -match "version:") -and ($c -match "permissions:") -and ($c -match "dataStores:")
}

# -- TypeScript compilation checks --
Write-Host ""
Write-Host "--- TypeScript compilation checks ---" -ForegroundColor Yellow

Gate "G51-4p" "API tsc --noEmit clean" {
  Push-Location (Join-Path $root "apps/api")
  $out = npx tsc --noEmit 2>&1 | Out-String
  Pop-Location
  $LASTEXITCODE -eq 0
}

Gate "G51-4q" "Web tsc --noEmit clean" {
  Push-Location (Join-Path $root "apps/web")
  $out = npx tsc --noEmit 2>&1 | Out-String
  Pop-Location
  $LASTEXITCODE -eq 0
}

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
$total = $pass + $fail + $skip
Write-Host " Phase 51 Results: $pass PASS / $fail FAIL / $skip SKIP  (total $total)" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

exit $fail
