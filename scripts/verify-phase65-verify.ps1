<# Phase 65 VERIFY v3 -- Immunizations Integrity Gates
   G65-PLAN, G65-TRACE, G65-REALITY, G65-CLINICIAN, G65-PORTAL,
   G65-WRITE, G65-NEGATIVE, G65-REGRESSION
   Runs on top of the implement verifier to check VERIFY-specific fixes.
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

Write-Host "`n=== Phase 65 VERIFY v3: Immunizations Integrity ===" -ForegroundColor Cyan

# ─── G65-PLAN: Plan artifact completeness ───
Write-Host "`n--- G65-PLAN: Plan Artifact ---" -ForegroundColor Yellow
$plan = "artifacts/phase65/immu-plan.json"
Write-Gate "G65-PLAN-01  immu-plan.json exists" (Test-Path -LiteralPath $plan)
Write-Gate "G65-PLAN-02  plan has vivianVerified" (Test-FileContains $plan "vivianVerified")
Write-Gate "G65-PLAN-03  plan has readPath and writePath" (Test-FileContains $plan "writePath")
Write-Gate "G65-PLAN-04  plan has GET list endpoint" (Test-FileContains $plan "/vista/immunizations")
Write-Gate "G65-PLAN-05  plan has GET catalog endpoint" (Test-FileContains $plan "/vista/immunizations/catalog")
Write-Gate "G65-PLAN-06  plan has POST endpoint" (Test-FileRegex $plan '"method":\s*"POST"')

# ─── G65-TRACE: Action -> Endpoint -> RPC traceability ───
Write-Host "`n--- G65-TRACE: Action-Endpoint-RPC Trace ---" -ForegroundColor Yellow
$actions = "apps/web/src/actions/actionRegistry.ts"
$routes = "apps/api/src/routes/immunizations/index.ts"
$registry = "apps/api/src/vista/rpcRegistry.ts"
$caps = "config/capabilities.json"

Write-Gate "G65-TRACE-01  immunizations.list action" (Test-FileContains $actions "immunizations.list")
Write-Gate "G65-TRACE-02  immunizations.catalog action" (Test-FileContains $actions "immunizations.catalog")
Write-Gate "G65-TRACE-03  immunizations.add action (pending)" (Test-FileContains $actions "immunizations.add")
Write-Gate "G65-TRACE-04  ORQQPX IMMUN LIST in rpcRegistry" (Test-FileContains $registry "ORQQPX IMMUN LIST")
Write-Gate "G65-TRACE-05  PXVIMM IMM SHORT LIST in rpcRegistry" (Test-FileContains $registry "PXVIMM IMM SHORT LIST")
Write-Gate "G65-TRACE-06  ORQQPX IMMUN LIST in route" (Test-FileContains $routes "ORQQPX IMMUN LIST")
Write-Gate "G65-TRACE-07  PXVIMM IMM SHORT LIST in route" (Test-FileContains $routes "PXVIMM IMM SHORT LIST")
Write-Gate "G65-TRACE-08  clinical.immunizations.list in caps" (Test-FileContains $caps "clinical.immunizations.list")
Write-Gate "G65-TRACE-09  clinical.immunizations.add in caps" (Test-FileContains $caps "clinical.immunizations.add")
Write-Gate "G65-TRACE-10  PX SAVE DATA target in actions" (Test-FileContains $actions "PX SAVE DATA")

# ─── G65-REALITY: No false greens -- honest pending everywhere ───
Write-Host "`n--- G65-REALITY: No False Greens ---" -ForegroundColor Yellow
$cover = "apps/web/src/components/cprs/panels/CoverSheetPanel.tsx"
$panel = "apps/web/src/components/cprs/panels/ImmunizationsPanel.tsx"
$portal = "apps/portal/src/app/dashboard/immunizations/page.tsx"

# CoverSheet must have pending state for immunizations
Write-Gate "G65-REALITY-01  CoverSheet has immuPending state" (Test-FileContains $cover "immuPending")
Write-Gate "G65-REALITY-02  CoverSheet detects _integration pending" (Test-FileContains $cover "_integration")
Write-Gate "G65-REALITY-03  CoverSheet shows pending text with RPC" (Test-FileContains $cover "ORQQPX IMMUN LIST")
Write-Gate "G65-REALITY-04  CoverSheet catch sets immuPending" (Test-FileRegex $cover "catch.*immuPending|setImmuPending\(true\)")
Write-Gate "G65-REALITY-05  Panel shows Integration Pending banner" (Test-FileContains $panel "Integration Pending")
Write-Gate "G65-REALITY-06  Portal has .catch() handler" (Test-FileRegex $portal "\.catch\(")
Write-Gate "G65-REALITY-07  Portal catch sets pending posture" (Test-FileRegex $portal "pendingTargets.*ORQQPX|ORQQPX.*pendingTargets")

# ─── G65-CLINICIAN: Panel integrity ───
Write-Host "`n--- G65-CLINICIAN: Clinician Panel ---" -ForegroundColor Yellow
Write-Gate "G65-CLIN-01  ImmunizationsPanel.tsx exists" (Test-Path -LiteralPath $panel)
Write-Gate "G65-CLIN-02  fetches /vista/immunizations" (Test-FileContains $panel "/vista/immunizations")
Write-Gate "G65-CLIN-03  credentials: include" (Test-FileContains $panel "credentials")
Write-Gate "G65-CLIN-04  add button disabled" (Test-FileRegex $panel "disabled")
Write-Gate "G65-CLIN-05  exported in barrel" (Test-FileContains "apps/web/src/components/cprs/panels/index.ts" "ImmunizationsPanel")
Write-Gate "G65-CLIN-06  in VALID_TABS" (Test-FileContains "apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx" "immunizations")
Write-Gate "G65-CLIN-07  in tabs.json" (Test-FileContains "apps/web/src/lib/contracts/data/tabs.json" "CT_IMMUNIZATIONS")

# ─── G65-PORTAL: Portal page integrity ───
Write-Host "`n--- G65-PORTAL: Portal Page ---" -ForegroundColor Yellow
Write-Gate "G65-PORT-01  portal page exists" (Test-Path -LiteralPath $portal)
Write-Gate "G65-PORT-02  uses fetchImmunizations" (Test-FileContains $portal "fetchImmunizations")
Write-Gate "G65-PORT-03  uses DataSourceBadge" (Test-FileContains $portal "DataSourceBadge")
Write-Gate "G65-PORT-04  uses exportSectionUrl" (Test-FileContains $portal "exportSectionUrl")
Write-Gate "G65-PORT-05  .finally sets loading false" (Test-FileRegex $portal "\.finally\(")
Write-Gate "G65-PORT-06  portal health route" (Test-FileContains "apps/api/src/routes/portal-auth.ts" "portal/health/immunizations")
Write-Gate "G65-PORT-07  portal api fetchImmunizations" (Test-FileContains "apps/portal/src/lib/api.ts" "fetchImmunizations")

# ─── G65-WRITE: POST returns structured pending ───
Write-Host "`n--- G65-WRITE: Write Posture ---" -ForegroundColor Yellow
Write-Gate "G65-WRITE-01  POST route exists" (Test-FileRegex $routes 'server\.post.*immunizations')
Write-Gate "G65-WRITE-02  returns 202" (Test-FileContains $routes "202")
Write-Gate "G65-WRITE-03  pendingTargets in response" (Test-FileContains $routes "pendingTargets")
Write-Gate "G65-WRITE-04  PX SAVE DATA reference" (Test-FileContains $routes "PX SAVE DATA")
Write-Gate "G65-WRITE-05  immunizations.add in caps" (Test-FileContains $caps "clinical.immunizations.add")
Write-Gate "G65-WRITE-06  immunizations.add status pending" (Test-FileRegex $caps 'immunizations\.add[^}]*pending')

# ─── G65-NEGATIVE: Error handling ───
Write-Host "`n--- G65-NEGATIVE: Error Handling ---" -ForegroundColor Yellow
Write-Gate "G65-NEG-01  DFN validation in GET" (Test-FileRegex $routes "dfn|DFN")
Write-Gate "G65-NEG-02  returns 400 on bad DFN" (Test-FileContains $routes "400")
Write-Gate "G65-NEG-03  safeCallRpc used" (Test-FileContains $routes "safeCallRpc")
Write-Gate "G65-NEG-04  POST validates DFN param" (Test-FileRegex $routes 'post.*immunizations[\s\S]*dfn')

# ─── G65-REGRESSION: Pre-existing fixes ───
Write-Host "`n--- G65-REGRESSION: Pre-existing Fixes ---" -ForegroundColor Yellow
# LabResult fields in CoverSheet should use .name, .value, .date (not .test, .result, .collected)
Write-Gate "G65-REG-01  CoverSheet uses l.name (not .test)" (Test-FileRegex $cover "l\.name")
Write-Gate "G65-REG-02  CoverSheet uses l.value (not .result)" (Test-FileRegex $cover "l\.value")
Write-Gate "G65-REG-03  CoverSheet uses l.date (not .collected)" (Test-FileRegex $cover "l\.date")
Write-Gate "G65-REG-04  No lab.test in CoverSheet" (-not (Test-FileRegex $cover "lab\.test[^P]"))
Write-Gate "G65-REG-05  No lab.collected in CoverSheet" (-not (Test-FileContains $cover "lab.collected"))
# Comment correctness
Write-Gate "G65-REG-06  Immunizations section comment correct" (Test-FileContains $cover "Row 5: Immunizations")

# ─── TSC ───
Write-Host "`n--- TypeScript ---" -ForegroundColor Yellow
Push-Location "apps/api"
$tscOut = npx tsc --noEmit 2>&1
$tscOk = ($LASTEXITCODE -eq 0)
Pop-Location
Write-Gate "TSC  API compiles clean" $tscOk

# ─── Summary ───
Write-Host "`n=== Phase 65 VERIFY Results: $pass/$total passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
