<# Phase 65 -- Immunizations v1 (VistA-First) Verification
   Checks: rpcRegistry, actionRegistry, capabilities, API routes,
   clinician panel, portal page, portal health route, cover sheet,
   tabs.json, PDF formatter.
#>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Write-Gate([string]$Name, [bool]$Ok) {
  $script:total++
  if ($Ok) { $script:pass++; Write-Host "  PASS  $Name" -ForegroundColor Green }
  else     { $script:fail++; Write-Host "  FAIL  $Name" -ForegroundColor Red }
}

function Test-FileContains([string]$Path, [string]$Pattern) {
  if (!(Test-Path -LiteralPath $Path)) { return $false }
  $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
  return ($content -match [regex]::Escape($Pattern))
}

function Test-FileRegex([string]$Path, [string]$Regex) {
  if (!(Test-Path -LiteralPath $Path)) { return $false }
  $content = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
  return ($content -match $Regex)
}

Write-Host "`n=== Phase 65: Immunizations v1 (VistA-First) ===" -ForegroundColor Cyan

# --- Artifacts ---
Write-Host "`n--- Artifacts ---" -ForegroundColor Yellow
Write-Gate "inventory.json exists" (Test-Path -LiteralPath "artifacts/phase65/inventory.json")
Write-Gate "immu-plan.json exists" (Test-Path -LiteralPath "artifacts/phase65/immu-plan.json")

# --- Prompts ---
Write-Host "`n--- Prompts ---" -ForegroundColor Yellow
Write-Gate "71-01-IMPLEMENT.md exists" (Test-Path -LiteralPath "prompts/71-PHASE-65-IMMUNIZATIONS/71-01-IMPLEMENT.md")
Write-Gate "71-99-VERIFY.md exists" (Test-Path -LiteralPath "prompts/71-PHASE-65-IMMUNIZATIONS/71-99-VERIFY.md")

# --- rpcRegistry ---
Write-Host "`n--- rpcRegistry ---" -ForegroundColor Yellow
$rpcRegPath = "apps/api/src/vista/rpcRegistry.ts"
Write-Gate "ORQQPX IMMUN LIST in rpcRegistry" (Test-FileContains $rpcRegPath "ORQQPX IMMUN LIST")
Write-Gate "PXVIMM IMM SHORT LIST in rpcRegistry" (Test-FileContains $rpcRegPath "PXVIMM IMM SHORT LIST")
Write-Gate "domain: immunizations in rpcRegistry" (Test-FileContains $rpcRegPath "immunizations")

# --- API Routes ---
Write-Host "`n--- API Routes ---" -ForegroundColor Yellow
$apiRoutePath = "apps/api/src/routes/immunizations/index.ts"
Write-Gate "immunizations route file exists" (Test-Path -LiteralPath $apiRoutePath)
Write-Gate "GET /vista/immunizations in route" (Test-FileContains $apiRoutePath "/vista/immunizations")
Write-Gate "ORQQPX IMMUN LIST used in route" (Test-FileContains $apiRoutePath "ORQQPX IMMUN LIST")
Write-Gate "safeCallRpc used (not direct callRpc)" (Test-FileContains $apiRoutePath "safeCallRpc")
Write-Gate "GET /vista/immunizations/catalog in route" (Test-FileContains $apiRoutePath "/vista/immunizations/catalog")
Write-Gate "POST /vista/immunizations (pending)" (Test-FileContains $apiRoutePath "integration-pending")
Write-Gate "pendingTargets array in response" (Test-FileContains $apiRoutePath "pendingTargets")
Write-Gate "rpcUsed array in response" (Test-FileContains $apiRoutePath "rpcUsed")

# --- index.ts registration ---
Write-Host "`n--- index.ts ---" -ForegroundColor Yellow
$indexPath = "apps/api/src/index.ts"
Write-Gate "immunizationsRoutes imported" (Test-FileContains $indexPath "immunizationsRoutes")
Write-Gate "immunizationsRoutes registered" (Test-FileContains $indexPath "server.register(immunizationsRoutes)")

# --- Clinician Panel ---
Write-Host "`n--- Clinician Panel ---" -ForegroundColor Yellow
$panelPath = "apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx"
Write-Gate "ImmunizationsPanel.tsx exists" (Test-Path -LiteralPath $panelPath)
Write-Gate "Panel fetches /vista/immunizations" (Test-FileContains $panelPath "/vista/immunizations")
Write-Gate "credentials: include" (Test-FileContains $panelPath "credentials: 'include'")
Write-Gate "Add button disabled with pending note" (Test-FileRegex $panelPath "disabled.*pending|pending.*disabled")
Write-Gate "Integration pending banner" (Test-FileContains $panelPath "Integration Pending")

# --- Panel barrel export ---
$barrelPath = "apps/web/src/components/cprs/panels/index.ts"
Write-Gate "ImmunizationsPanel in barrel" (Test-FileContains $barrelPath "ImmunizationsPanel")

# --- Chart page ---
Write-Host "`n--- Chart Page ---" -ForegroundColor Yellow
$chartPath = "apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx"
Write-Gate "immunizations in VALID_TABS" (Test-FileContains $chartPath "'immunizations'")
Write-Gate "ImmunizationsPanel imported" (Test-FileContains $chartPath "ImmunizationsPanel")
Write-Gate "immunizations case in TabContent" (Test-FileRegex $chartPath "case\s+'immunizations'")

# --- tabs.json ---
Write-Host "`n--- tabs.json ---" -ForegroundColor Yellow
$tabsPath = "apps/web/src/lib/contracts/data/tabs.json"
Write-Gate "CT_IMMUNIZATIONS in tabs.json" (Test-FileContains $tabsPath "CT_IMMUNIZATIONS")
Write-Gate "Tab label 'Immunizations'" (Test-FileContains $tabsPath '"label": "Immunizations"')

# --- Action Registry ---
Write-Host "`n--- Action Registry ---" -ForegroundColor Yellow
$actionPath = "apps/web/src/actions/actionRegistry.ts"
Write-Gate "immunizations.list action" (Test-FileContains $actionPath "immunizations.list")
Write-Gate "immunizations.catalog action" (Test-FileContains $actionPath "immunizations.catalog")
Write-Gate "immunizations.add action (pending)" (Test-FileContains $actionPath "immunizations.add")
Write-Gate "ORQQPX IMMUN LIST in actions" (Test-FileContains $actionPath "ORQQPX IMMUN LIST")
Write-Gate "PX SAVE DATA in actions" (Test-FileContains $actionPath "PX SAVE DATA")

# --- Capabilities ---
Write-Host "`n--- Capabilities ---" -ForegroundColor Yellow
$capsPath = "config/capabilities.json"
Write-Gate "clinical.immunizations.list capability" (Test-FileContains $capsPath "clinical.immunizations.list")
Write-Gate "clinical.immunizations.add capability" (Test-FileContains $capsPath "clinical.immunizations.add")
Write-Gate "immunizations.list status=live" (Test-FileRegex $capsPath 'clinical\.immunizations\.list[\s\S]*?"status":\s*"live"')
Write-Gate "immunizations.add status=pending" (Test-FileRegex $capsPath 'clinical\.immunizations\.add[\s\S]*?"status":\s*"pending"')

# --- Portal ---
Write-Host "`n--- Portal ---" -ForegroundColor Yellow
$portalPagePath = "apps/portal/src/app/dashboard/immunizations/page.tsx"
Write-Gate "Portal immunizations page exists" (Test-Path -LiteralPath $portalPagePath)
Write-Gate "Portal page uses fetchImmunizations" (Test-FileContains $portalPagePath "fetchImmunizations")
Write-Gate "Portal page uses DataSourceBadge" (Test-FileContains $portalPagePath "DataSourceBadge")
Write-Gate "Portal page uses exportSectionUrl" (Test-FileContains $portalPagePath "exportSectionUrl")

$portalApiPath = "apps/portal/src/lib/api.ts"
Write-Gate "fetchImmunizations in portal api" (Test-FileContains $portalApiPath "fetchImmunizations")
Write-Gate "portal/health/immunizations in portal api" (Test-FileContains $portalApiPath "/portal/health/immunizations")

$portalAuthPath = "apps/api/src/routes/portal-auth.ts"
Write-Gate "portal/health/immunizations route" (Test-FileContains $portalAuthPath "/portal/health/immunizations")
Write-Gate "ORQQPX IMMUN LIST in portal route" (Test-FileContains $portalAuthPath "ORQQPX IMMUN LIST")

# --- PDF formatter ---
Write-Host "`n--- PDF Formatter ---" -ForegroundColor Yellow
$pdfPath = "apps/api/src/services/portal-pdf.ts"
Write-Gate "formatImmunizationsForPdf handles name field" (Test-FileContains $pdfPath "i.name")

# --- Cover Sheet ---
Write-Host "`n--- Cover Sheet ---" -ForegroundColor Yellow
$coverPath = "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx"
Write-Gate "Immunizations section in cover sheet" (Test-FileContains $coverPath "ORQQPX IMMUN LIST")
Write-Gate "Cover sheet fetches /vista/immunizations" (Test-FileContains $coverPath "/vista/immunizations")

# --- No dead clicks ---
Write-Host "`n--- No Dead Clicks ---" -ForegroundColor Yellow
Write-Gate "Add button is disabled (not silent no-op)" (Test-FileRegex $panelPath "disabled")
Write-Gate "POST returns 202 with pending info" (Test-FileContains $apiRoutePath "202")

# --- Summary ---
Write-Host "`n=== Phase 65 Results: $pass/$total PASS, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
