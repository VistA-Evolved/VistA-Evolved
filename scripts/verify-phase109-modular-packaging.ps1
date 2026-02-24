<# Phase 109 -- Modular Packaging + Feature Flags Verifier

   Gates:
    1. Schema: 4 table definitions in schema.ts
    2. Migration: CREATE TABLE statements for all 4 tables
    3. Repository: module-repo.ts exists with exports
    4. Routes: module-entitlement-routes.ts registered in index.ts
    5. Catalog seed: module-catalog-seed.ts exists
    6. DB provider wiring: setDbEntitlementProvider in module-registry.ts
    7. Module guard bypass: /admin/modules in guard bypass list
    8. Admin UI: Entitlements/Flags/Audit tabs in page.tsx
    9. Module catalog doc: docs/architecture/module-catalog.md
   10. Prompt files exist
   11. No console.log in Phase 109 files
   12. TypeScript compiles (apps/api)
#>

param([switch]$SkipTsc)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$total = 0

function Gate([string]$label, [bool]$ok, [string]$detail) {
    $script:total++
    if ($ok) { $script:pass++; Write-Host "  PASS  $label" }
    else { $script:fail++; Write-Host "  FAIL  $label -- $detail" }
}

Write-Host "`n=== Phase 109: Modular Packaging + Feature Flags Verifier ===`n"

# 1. Schema: 4 table definitions
$schemaFile = Join-Path $root "apps\api\src\platform\db\schema.ts"
$schemaContent = if (Test-Path -LiteralPath $schemaFile) { Get-Content $schemaFile -Raw } else { "" }
Gate "schema: moduleCatalog table" ($schemaContent -match 'moduleCatalog') "moduleCatalog not in schema.ts"
Gate "schema: tenantModule table" ($schemaContent -match 'tenantModule') "tenantModule not in schema.ts"
Gate "schema: tenantFeatureFlag table" ($schemaContent -match 'tenantFeatureFlag') "tenantFeatureFlag not in schema.ts"
Gate "schema: moduleAuditLog table" ($schemaContent -match 'moduleAuditLog') "moduleAuditLog not in schema.ts"

# 2. Migration: CREATE TABLE statements
$migrateFile = Join-Path $root "apps\api\src\platform\db\migrate.ts"
$migrateContent = if (Test-Path -LiteralPath $migrateFile) { Get-Content $migrateFile -Raw } else { "" }
Gate "migration: module_catalog CREATE TABLE" ($migrateContent -match 'CREATE TABLE IF NOT EXISTS module_catalog') "missing CREATE TABLE module_catalog"
Gate "migration: tenant_module CREATE TABLE" ($migrateContent -match 'CREATE TABLE IF NOT EXISTS tenant_module') "missing CREATE TABLE tenant_module"
Gate "migration: tenant_feature_flag CREATE TABLE" ($migrateContent -match 'CREATE TABLE IF NOT EXISTS tenant_feature_flag') "missing CREATE TABLE tenant_feature_flag"
Gate "migration: module_audit_log CREATE TABLE" ($migrateContent -match 'CREATE TABLE IF NOT EXISTS module_audit_log') "missing CREATE TABLE module_audit_log"

# 3. Repository
$repoFile = Join-Path $root "apps\api\src\platform\db\repo\module-repo.ts"
Gate "repository: module-repo.ts exists" (Test-Path -LiteralPath $repoFile) "module-repo.ts missing"
$repoContent = if (Test-Path -LiteralPath $repoFile) { Get-Content $repoFile -Raw } else { "" }
Gate "repository: upsertModuleCatalog export" ($repoContent -match 'export function upsertModuleCatalog') "missing upsertModuleCatalog"
Gate "repository: setModuleEnabled export" ($repoContent -match 'export function setModuleEnabled') "missing setModuleEnabled"
Gate "repository: seedTenantModules export" ($repoContent -match 'export function seedTenantModules') "missing seedTenantModules"
Gate "repository: appendModuleAudit export" ($repoContent -match 'export function appendModuleAudit') "missing appendModuleAudit"
Gate "repository: getEnabledModuleIds export" ($repoContent -match 'export function getEnabledModuleIds') "missing getEnabledModuleIds"

# 3b. Repo barrel export
$barrelFile = Join-Path $root "apps\api\src\platform\db\repo\index.ts"
$barrelContent = if (Test-Path -LiteralPath $barrelFile) { Get-Content $barrelFile -Raw } else { "" }
Gate "repo barrel: moduleRepo export" ($barrelContent -match 'module-repo') "module-repo not in repo barrel"

# 4. Routes registered in index.ts
$indexFile = Join-Path $root "apps\api\src\index.ts"
$indexContent = if (Test-Path -LiteralPath $indexFile) { Get-Content $indexFile -Raw } else { "" }
$routeFile = Join-Path $root "apps\api\src\routes\module-entitlement-routes.ts"
Gate "routes: module-entitlement-routes.ts exists" (Test-Path -LiteralPath $routeFile) "route file missing"
Gate "routes: import in index.ts" ($indexContent -match 'module-entitlement-routes') "module-entitlement-routes not imported"
Gate "routes: register in index.ts" ($indexContent -match 'moduleEntitlementRoutes') "moduleEntitlementRoutes not registered"

# 5. Catalog seed
$seedFile = Join-Path $root "apps\api\src\modules\module-catalog-seed.ts"
Gate "seed: module-catalog-seed.ts exists" (Test-Path -LiteralPath $seedFile) "module-catalog-seed.ts missing"
Gate "seed: referenced in index.ts" ($indexContent -match 'module-catalog-seed') "seed not referenced in index.ts"

# 6. DB provider wiring
$registryFile = Join-Path $root "apps\api\src\modules\module-registry.ts"
$registryContent = if (Test-Path -LiteralPath $registryFile) { Get-Content $registryFile -Raw } else { "" }
Gate "registry: setDbEntitlementProvider export" ($registryContent -match 'export function setDbEntitlementProvider') "missing setDbEntitlementProvider"
Gate "registry: dbEntitlementProvider usage" ($registryContent -match 'dbEntitlementProvider') "dbEntitlementProvider not used in getEnabledModules"
Gate "index: setDbEntitlementProvider called" ($indexContent -match 'setDbEntitlementProvider') "setDbEntitlementProvider not called in index.ts"

# 7. Module guard bypass
$guardFile = Join-Path $root "apps\api\src\middleware\module-guard.ts"
$guardContent = if (Test-Path -LiteralPath $guardFile) { Get-Content $guardFile -Raw } else { "" }
Gate "guard: /admin/modules bypass" ($guardContent -match 'admin.*modules') "/admin/modules not in guard bypass"

# 8. Admin UI
$uiFile = Join-Path $root "apps\web\src\app\cprs\admin\modules\page.tsx"
$uiContent = if (Test-Path -LiteralPath $uiFile) { Get-Content $uiFile -Raw } else { "" }
Gate "UI: EntitlementsTab component" ($uiContent -match 'EntitlementsTab') "EntitlementsTab not found"
Gate "UI: FeatureFlagsTab component" ($uiContent -match 'FeatureFlagsTab') "FeatureFlagsTab not found"
Gate "UI: ModuleAuditTab component" ($uiContent -match 'ModuleAuditTab') "ModuleAuditTab not found"
Gate "UI: /admin/modules/entitlements API call" ($uiContent -match '/admin/modules/entitlements') "entitlements API not called"
Gate "UI: /admin/modules/feature-flags API call" ($uiContent -match '/admin/modules/feature-flags') "feature-flags API not called"
Gate "UI: /admin/modules/audit API call" ($uiContent -match '/admin/modules/audit') "audit API not called"

# 9. Module catalog doc
$catalogDoc = Join-Path $root "docs\architecture\module-catalog.md"
Gate "docs: module-catalog.md exists" (Test-Path -LiteralPath $catalogDoc) "module-catalog.md missing"

# 10. Prompt files
$promptImpl = Join-Path $root "prompts\113-PHASE-109-MODULAR-PACKAGING\109-01-IMPLEMENT.md"
$promptVerify = Join-Path $root "prompts\113-PHASE-109-MODULAR-PACKAGING\109-99-VERIFY.md"
Gate "prompts: 109-01-IMPLEMENT.md" (Test-Path -LiteralPath $promptImpl) "IMPLEMENT prompt missing"
Gate "prompts: 109-99-VERIFY.md" (Test-Path -LiteralPath $promptVerify) "VERIFY prompt missing"

# 11. No console.log in Phase 109 files
$phase109Files = @(
    "apps\api\src\platform\db\repo\module-repo.ts",
    "apps\api\src\routes\module-entitlement-routes.ts",
    "apps\api\src\modules\module-catalog-seed.ts"
)
$consoleLogCount = 0
foreach ($f in $phase109Files) {
    $fp = Join-Path $root $f
    if (Test-Path -LiteralPath $fp) {
        $content = Get-Content $fp -Raw
        $matches109 = [regex]::Matches($content, 'console\.log')
        $consoleLogCount += $matches109.Count
    }
}
Gate "lint: no console.log in Phase 109 files" ($consoleLogCount -eq 0) "$consoleLogCount console.log found"

# 12. TypeScript compiles
if (-not $SkipTsc) {
    Write-Host "`n  Running TypeScript check (apps/api)..."
    Push-Location (Join-Path $root "apps\api")
    $tscOutput = & npx tsc --noEmit 2>&1 | Out-String
    $tscOk = $LASTEXITCODE -eq 0
    Pop-Location
    Gate "tsc: apps/api compiles" $tscOk "TypeScript errors found"
} else {
    Write-Host "  SKIP  TypeScript check (--SkipTsc)"
}

# Summary
Write-Host "`n=== Phase 109 Verification: $pass / $total gates passed ===`n"
if ($fail -gt 0) {
    Write-Host "  $fail gate(s) FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  ALL GATES PASSED" -ForegroundColor Green
    exit 0
}
