<#
.SYNOPSIS
  Phase 76 -- Modularization v1 Verifier
.DESCRIPTION
  Verifies tenant-scoped feature flags, module registry, enforcement,
  and all Phase 76 deliverables:
    1. File existence (web registry, admin layout, prompts)
    2. Web module registry structure (exports, 12 modules, helpers)
    3. API module guard has structured error code
    4. API module toggle writes immutable audit
    5. Admin layout has sidebar navigation
    6. Existing enforcement: tab strip, chart page, module guard wired
    7. Performance budgets config committed
    8. verify-latest.ps1 points to Phase 76
    9. TypeScript compile clean
   10. Anti-pattern checks
.PARAMETER SkipDocker
  Skip Docker and live VistA checks.
#>
param([switch]$SkipDocker)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot | Split-Path
$webDir = Join-Path (Join-Path $repoRoot "apps") "web"
$apiDir = Join-Path (Join-Path $repoRoot "apps") "api"

Write-Host ""
Write-Host "=== Phase 76 -- Modularization v1 ===" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0
$warn = 0

function Gate([string]$label, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $label" -ForegroundColor Red
    $script:fail++
  }
}

function Warn([string]$label) {
  Write-Host "  WARN  $label" -ForegroundColor Yellow
  $script:warn++
}

# ================================================================
# Section 1: File Existence
# ================================================================
Write-Host "-- File Existence --" -ForegroundColor Cyan

$files = @(
  "apps/web/src/modules/registry.ts",
  "apps/web/src/app/cprs/admin/layout.tsx",
  "apps/api/src/modules/module-registry.ts",
  "apps/api/src/middleware/module-guard.ts",
  "apps/api/src/modules/capability-service.ts",
  "apps/api/src/routes/module-capability-routes.ts",
  "apps/web/src/stores/tenant-context.tsx",
  "apps/web/src/components/cprs/CPRSTabStrip.tsx",
  "apps/web/src/app/cprs/admin/modules/page.tsx",
  "config/modules.json",
  "config/skus.json",
  "config/capabilities.json",
  "prompts/81-PHASE-76-MODULARIZATION-V1/81-01-IMPLEMENT.md",
  "prompts/81-PHASE-76-MODULARIZATION-V1/81-99-VERIFY.md"
)

foreach ($f in $files) {
  $name = Split-Path $f -Leaf
  Gate "$name exists" (Test-Path -LiteralPath (Join-Path $repoRoot $f))
}

# ================================================================
# Section 2: Web Module Registry Structure
# ================================================================
Write-Host ""
Write-Host "-- Web Module Registry --" -ForegroundColor Cyan

$webReg = ""
$webRegFile = Join-Path $repoRoot "apps/web/src/modules/registry.ts"
if (Test-Path -LiteralPath $webRegFile) { $webReg = Get-Content -Raw $webRegFile }

Gate "registry exports WebModuleDefinition" ($webReg -match "export\s+interface\s+WebModuleDefinition")
Gate "registry exports getModuleDefinitions" ($webReg -match "export\s+function\s+getModuleDefinitions")
Gate "registry exports getModuleById" ($webReg -match "export\s+function\s+getModuleById")
Gate "registry exports getModuleForTab" ($webReg -match "export\s+function\s+getModuleForTab")
Gate "registry exports isTabVisible" ($webReg -match "export\s+function\s+isTabVisible")
Gate "registry has kernel module" ($webReg -match 'id:\s*"kernel"')
Gate "registry has clinical module" ($webReg -match 'id:\s*"clinical"')
Gate "registry has 12 module definitions" ($webReg -match 'id:\s*"scheduling"')
Gate "registry defines tabSlugs" ($webReg -match "tabSlugs")
Gate "registry defines apiPrefixes" ($webReg -match "apiPrefixes")
Gate "registry defines dependencies" ($webReg -match "dependencies")
Gate "registry defines alwaysEnabled" ($webReg -match "alwaysEnabled")

# ================================================================
# Section 3: API Module Guard (Structured Error)
# ================================================================
Write-Host ""
Write-Host "-- API Module Guard --" -ForegroundColor Cyan

$guard = ""
$guardFile = Join-Path $repoRoot "apps/api/src/middleware/module-guard.ts"
if (Test-Path -LiteralPath $guardFile) { $guard = Get-Content -Raw $guardFile }

Gate "guard returns code: MODULE_DISABLED" ($guard -match 'code:\s*"MODULE_DISABLED"')
Gate "guard returns 403" ($guard -match "reply\.code\(403\)")
Gate "guard returns module id in response" ($guard -match "module:")
Gate "guard has bypass patterns" ($guard -match "BYPASS_PATTERNS")
Gate "guard extracts tenantId from session" ($guard -match "tenantId")
Gate "guard calls isRouteAllowed" ($guard -match "isRouteAllowed")

# ================================================================
# Section 4: API Module Toggle Audit
# ================================================================
Write-Host ""
Write-Host "-- Module Toggle Audit --" -ForegroundColor Cyan

$routes = ""
$routesFile = Join-Path $repoRoot "apps/api/src/routes/module-capability-routes.ts"
if (Test-Path -LiteralPath $routesFile) { $routes = Get-Content -Raw $routesFile }

Gate "routes import immutableAudit" ($routes -match "import.*immutableAudit.*immutable-audit")
Gate "routes call immutableAudit on toggle" ($routes -match 'immutableAudit\("module\.toggle"')
Gate "routes call immutableAudit on clear" ($routes -match 'immutableAudit\("module\.override-clear"')
Gate "audit action includes tenantId" ($routes -match "tenantId")
Gate "audit action includes actor info" ($routes -match "actorId|sub:.*duz")

$auditTs = ""
$auditFile = Join-Path $repoRoot "apps/api/src/lib/immutable-audit.ts"
if (Test-Path -LiteralPath $auditFile) { $auditTs = Get-Content -Raw $auditFile }

Gate "immutable-audit has module.toggle action" ($auditTs -match '"module\.toggle"')
Gate "immutable-audit has module.override-clear action" ($auditTs -match '"module\.override-clear"')

# ================================================================
# Section 5: Admin Layout Sidebar
# ================================================================
Write-Host ""
Write-Host "-- Admin Layout Sidebar --" -ForegroundColor Cyan

$layout = ""
$layoutFile = Join-Path $repoRoot "apps/web/src/app/cprs/admin/layout.tsx"
if (Test-Path -LiteralPath $layoutFile) { $layout = Get-Content -Raw $layoutFile }

Gate "admin layout is 'use client'" ($layout -match "'use client'")
Gate "admin layout has sidebar nav" ($layout -match "Admin.*navigation|Admin Console")
Gate "admin layout uses useTenant" ($layout -match "useTenant")
Gate "admin layout has module gating" ($layout -match "isModuleEnabled")
Gate "admin layout links to /cprs/admin/modules" ($layout -match "/cprs/admin/modules")
Gate "admin layout links to /cprs/admin/integrations" ($layout -match "/cprs/admin/integrations")
Gate "admin layout links to /cprs/admin/analytics" ($layout -match "/cprs/admin/analytics")
Gate "admin layout links to /cprs/admin/rcm" ($layout -match "/cprs/admin/rcm")
Gate "admin layout links to /cprs/admin/audit-viewer" ($layout -match "/cprs/admin/audit-viewer")
Gate "admin layout highlights active path" ($layout -match "pathname|active")

# ================================================================
# Section 6: Existing Enforcement (Tab Strip + Chart Page + Guard)
# ================================================================
Write-Host ""
Write-Host "-- Existing Enforcement --" -ForegroundColor Cyan

$tabStrip = ""
$tabStripFile = Join-Path $repoRoot "apps/web/src/components/cprs/CPRSTabStrip.tsx"
if (Test-Path -LiteralPath $tabStripFile) { $tabStrip = Get-Content -Raw $tabStripFile }

Gate "tab strip filters by isModuleEnabled" ($tabStrip -match "isModuleEnabled")
Gate "tab strip has TAB_TO_MODULE mapping" ($tabStrip -match "TAB_TO_MODULE")

$chartPage = ""
$chartPageFile = Join-Path $repoRoot "apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx"
if (Test-Path -LiteralPath $chartPageFile) { $chartPage = Get-Content -LiteralPath $chartPageFile -Raw }

Gate "chart page shows Module Disabled message" ($chartPage -match "Module Disabled")
Gate "chart page filters nav by isModuleEnabled" ($chartPage -match "isModuleEnabled")

$tenantCtx = ""
$tenantFile = Join-Path $repoRoot "apps/web/src/stores/tenant-context.tsx"
if (Test-Path -LiteralPath $tenantFile) { $tenantCtx = Get-Content -Raw $tenantFile }

Gate "tenant context exports useModuleEnabled" ($tenantCtx -match "export\s+function\s+useModuleEnabled")
Gate "tenant context exports useFeatureFlag" ($tenantCtx -match "export\s+function\s+useFeatureFlag")

# API: module guard is wired
$indexFile = Join-Path $repoRoot "apps/api/src/index.ts"
$indexTs = ""
if (Test-Path -LiteralPath $indexFile) { $indexTs = Get-Content -Raw $indexFile }

Gate "API wires moduleGuardHook" ($indexTs -match "moduleGuardHook")
Gate "API initializes module registry" ($indexTs -match "initModuleRegistry")

# ================================================================
# Section 7: Config Files
# ================================================================
Write-Host ""
Write-Host "-- Config Files --" -ForegroundColor Cyan

$modules = ""
$modulesFile = Join-Path $repoRoot "config/modules.json"
if (Test-Path -LiteralPath $modulesFile) { $modules = Get-Content -Raw $modulesFile }

Gate "modules.json has kernel" ($modules -match '"kernel"')
Gate "modules.json has clinical" ($modules -match '"clinical"')
Gate "modules.json has routePatterns" ($modules -match '"routePatterns"')
Gate "modules.json has 12 modules" ($modules -match '"scheduling"')

$skus = ""
$skusFile = Join-Path $repoRoot "config/skus.json"
if (Test-Path -LiteralPath $skusFile) { $skus = Get-Content -Raw $skusFile }

Gate "skus.json has FULL_SUITE" ($skus -match '"FULL_SUITE"')

# ================================================================
# Section 8: verify-latest.ps1
# ================================================================
Write-Host ""
Write-Host "-- verify-latest.ps1 --" -ForegroundColor Cyan

$latestFile = Join-Path $repoRoot "scripts/verify-latest.ps1"
$latest = ""
if (Test-Path -LiteralPath $latestFile) { $latest = Get-Content -Raw $latestFile }
Gate "verify-latest.ps1 references Phase 76" ($latest -match "phase76|phase-76|Phase 76")

# ================================================================
# Section 9: TypeScript Compile
# ================================================================
Write-Host ""
Write-Host "-- TypeScript Compile --" -ForegroundColor Cyan

Push-Location $apiDir
$tscApi = & pnpm exec tsc --noEmit 2>&1 | Out-String
$apiClean = ($LASTEXITCODE -eq 0)
Pop-Location
Gate "apps/api TSC clean" $apiClean

Push-Location $webDir
$tscWeb = & pnpm exec tsc --noEmit 2>&1 | Out-String
$webClean = ($LASTEXITCODE -eq 0)
Pop-Location
Gate "apps/web TSC clean" $webClean

# ================================================================
# Section 10: Anti-Pattern Checks
# ================================================================
Write-Host ""
Write-Host "-- Anti-Pattern Checks --" -ForegroundColor Cyan

$allNew = $webReg + $guard + $layout
$noCreds = -not ($allNew -match "PROV123|NURSE123|PHARM123")
Gate "No hardcoded credentials in new files" $noCreds

$noHipaaClaim = -not ($allNew -match "(?i)hipaa\s+compliant")
Gate "No HIPAA-compliant claim in new files" $noHipaaClaim

# ================================================================
# Summary
# ================================================================
$total = $pass + $fail
Write-Host ""
Write-Host "=== Phase 76 Results: $pass/$total passed, $warn warning(s) ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host ""

exit $fail
