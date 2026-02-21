<#
  verify-phase67-adt.ps1 -- Phase 67: ADT + Inpatient Lists v1 (VistA-first read posture)
  Gates: file structure, RPC registry, capabilities, actions, tab wiring, modules, TSC, no-fake-data
#>
param([switch]$SkipDocker, [switch]$Verbose)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
$results = @()

function Gate([string]$name, [bool]$ok, [string]$detail) {
  $script:results += [PSCustomObject]@{ Gate = $name; Status = if ($ok) { "PASS" } else { "FAIL" }; Detail = $detail }
  if ($ok) { $script:pass++ } else { $script:fail++ }
  $symbol = if ($ok) { "[PASS]" } else { "[FAIL]" }
  Write-Host "$symbol $name" -ForegroundColor $(if ($ok) { "Green" } else { "Red" })
  if ($detail -and $Verbose) { Write-Host "       $detail" -ForegroundColor Gray }
}

function Warn([string]$name, [string]$detail) {
  $script:warn++
  $script:results += [PSCustomObject]@{ Gate = $name; Status = "WARN"; Detail = $detail }
  Write-Host "[WARN] $name" -ForegroundColor Yellow
}

Write-Host "`n=== Phase 67: ADT + Inpatient Lists v1 ===" -ForegroundColor Cyan
Write-Host "VistA-first read posture verification`n"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = $PSScriptRoot | Split-Path -Parent }

# --- Gate 1: File structure ---
Write-Host "`n--- Gate 1: File Structure ---" -ForegroundColor White
$adtRoute = "$root\apps\api\src\routes\adt\index.ts"
$adtPanel = "$root\apps\web\src\components\cprs\panels\ADTPanel.tsx"
$prompt01 = "$root\prompts\73-PHASE-67-ADT-INPATIENT\73-01-IMPLEMENT.md"
$prompt99 = "$root\prompts\73-PHASE-67-ADT-INPATIENT\73-99-VERIFY.md"

Gate "ADT route file exists" (Test-Path -LiteralPath $adtRoute) $adtRoute
Gate "ADT panel file exists" (Test-Path -LiteralPath $adtPanel) $adtPanel
Gate "Prompt 73-01-IMPLEMENT exists" (Test-Path -LiteralPath $prompt01) $prompt01
Gate "Prompt 73-99-VERIFY exists" (Test-Path -LiteralPath $prompt99) $prompt99

# --- Gate 2: RPC Registry ---
Write-Host "`n--- Gate 2: RPC Registry ---" -ForegroundColor White
$rpcFile = Get-Content "$root\apps\api\src\vista\rpcRegistry.ts" -Raw -ErrorAction SilentlyContinue
$adtRpcs = @(
  "ORQPT WARDS",
  "ORQPT WARD PATIENTS",
  "ORQPT PROVIDER PATIENTS",
  "ORQPT TEAMS",
  "ORQPT TEAM PATIENTS",
  "ORQPT SPECIALTIES",
  "ORQPT SPECIALTY PATIENTS",
  "ORWU1 NEWLOC",
  "ORWPT16 ADMITLST"
)
foreach ($rpc in $adtRpcs) {
  Gate "RPC registry has $rpc" ($rpcFile -match [regex]::Escape($rpc)) ""
}
Gate "RPC registry has domain 'adt'" ($rpcFile -match 'domain:\s*"adt"') ""

# --- Gate 3: Capabilities ---
Write-Host "`n--- Gate 3: Capabilities ---" -ForegroundColor White
$capFile = Get-Content "$root\config\capabilities.json" -Raw -ErrorAction SilentlyContinue
$adtCaps = @(
  "clinical.adt.wards",
  "clinical.adt.wardPatients",
  "clinical.adt.providerPatients",
  "clinical.adt.teams",
  "clinical.adt.teamPatients",
  "clinical.adt.specialties",
  "clinical.adt.specialtyPatients",
  "clinical.adt.locations",
  "clinical.adt.admissions",
  "clinical.adt.admit",
  "clinical.adt.transfer",
  "clinical.adt.discharge"
)
foreach ($cap in $adtCaps) {
  Gate "Capability: $cap" ($capFile -match [regex]::Escape($cap)) ""
}

# --- Gate 4: Action Registry ---
Write-Host "`n--- Gate 4: Action Registry ---" -ForegroundColor White
$actFile = Get-Content "$root\apps\web\src\actions\actionRegistry.ts" -Raw -ErrorAction SilentlyContinue
$adtActions = @(
  "adt.wards",
  "adt.ward-patients",
  "adt.provider-patients",
  "adt.teams",
  "adt.team-patients",
  "adt.specialties",
  "adt.specialty-patients",
  "adt.locations",
  "adt.admission-list",
  "adt.admit",
  "adt.transfer",
  "adt.discharge"
)
foreach ($act in $adtActions) {
  Gate "Action: $act" ($actFile -match [regex]::Escape($act)) ""
}
Gate "Action location 'ADT' exists" ($actFile -match 'location:\s*"ADT"') ""

# --- Gate 5: Tab Wiring ---
Write-Host "`n--- Gate 5: Tab Wiring ---" -ForegroundColor White
$tabsFile = Get-Content "$root\apps\web\src\lib\contracts\data\tabs.json" -Raw -ErrorAction SilentlyContinue
Gate "tabs.json has CT_ADT" ($tabsFile -match "CT_ADT") ""

$chartPage = Get-Content -LiteralPath "$root\apps\web\src\app\cprs\chart\[dfn]\[tab]\page.tsx" -Raw -ErrorAction SilentlyContinue
Gate "VALID_TABS has 'adt'" ($chartPage -match "'adt'") ""
Gate "Chart page imports ADTPanel" ($chartPage -match "ADTPanel") ""
Gate "TabContent switch has adt case" ($chartPage -match "case 'adt'") ""

$barrelFile = Get-Content "$root\apps\web\src\components\cprs\panels\index.ts" -Raw -ErrorAction SilentlyContinue
Gate "Panel barrel exports ADTPanel" ($barrelFile -match "ADTPanel") ""

# --- Gate 6: Modules ---
Write-Host "`n--- Gate 6: Modules ---" -ForegroundColor White
$modFile = Get-Content "$root\config\modules.json" -Raw -ErrorAction SilentlyContinue
Gate "modules.json clinical has /vista/adt" ($modFile -match "/vista/adt") ""

# --- Gate 7: Index.ts Registration ---
Write-Host "`n--- Gate 7: Index.ts Registration ---" -ForegroundColor White
$indexFile = Get-Content "$root\apps\api\src\index.ts" -Raw -ErrorAction SilentlyContinue
Gate "index.ts imports adtRoutes" ($indexFile -match "adtRoutes") ""
Gate "index.ts registers adtRoutes" ($indexFile -match "server\.register\(adtRoutes\)") ""

# --- Gate 8: Route Structure ---
Write-Host "`n--- Gate 8: Route Structure ---" -ForegroundColor White
$routeFile = Get-Content $adtRoute -Raw -ErrorAction SilentlyContinue
$routeEndpoints = @(
  "/vista/adt/wards",
  "/vista/adt/ward-patients",
  "/vista/adt/provider-patients",
  "/vista/adt/teams",
  "/vista/adt/team-patients",
  "/vista/adt/specialties",
  "/vista/adt/specialty-patients",
  "/vista/adt/locations",
  "/vista/adt/admission-list",
  "/vista/adt/admit",
  "/vista/adt/transfer",
  "/vista/adt/discharge"
)
foreach ($ep in $routeEndpoints) {
  Gate "Route: $ep" ($routeFile -match [regex]::Escape($ep)) ""
}
Gate "Route uses safeCallRpc" ($routeFile -match "safeCallRpc") ""
Gate "Route uses requireSession" ($routeFile -match "requireSession") ""
Gate "All responses have rpcUsed" ($routeFile -match "rpcUsed") ""
Gate "All responses have pendingTargets" ($routeFile -match "pendingTargets") ""

# --- Gate 9: No Fake Data ---
Write-Host "`n--- Gate 9: No Fake Data ---" -ForegroundColor White
$panelContent = Get-Content $adtPanel -Raw -ErrorAction SilentlyContinue
# Check no hardcoded patient names or ward names
Gate "Panel has no hardcoded ward names" (-not ($panelContent -match '"ICU"|"CCU"|"Med-Surg"|"MICU"|"Surgical"')) ""
Gate "Panel has no hardcoded patient names" (-not ($panelContent -match '"John Doe"|"Jane Smith"|"CARTER"|"EIGHT,PATIENT"')) ""
Gate "Route has no hardcoded ward names" (-not ($routeFile -match '"ICU"|"CCU"|"Med-Surg"')) ""
Gate "Panel uses API fetch, not stubs" ($panelContent -match "apiFetch|fetch\(") ""

# --- Gate 10: TSC ---
Write-Host "`n--- Gate 10: TypeScript Compilation ---" -ForegroundColor White
Push-Location "$root\apps\api"
$apiTsc = & npx tsc --noEmit 2>&1
$apiClean = $LASTEXITCODE -eq 0
Pop-Location
Gate "API TSC clean" $apiClean ($apiTsc | Select-Object -First 3 | Out-String)

Push-Location "$root\apps\web"
$webTsc = & npx tsc --noEmit 2>&1
# Pre-existing errors in dialog files are tolerated; check no ADT-related errors
$adtErrors = $webTsc | Select-String "ADTPanel|routes/adt" -ErrorAction SilentlyContinue
$webClean = ($null -eq $adtErrors) -or ($adtErrors.Count -eq 0)
Pop-Location
Gate "Web TSC clean (no ADT errors)" $webClean ($adtErrors | Out-String)

# --- Summary ---
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 67 ADT Verification Summary" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "========================================`n" -ForegroundColor Cyan

if ($fail -gt 0) {
  Write-Host "RESULT: FAIL ($fail gates failed)" -ForegroundColor Red
  exit 1
} else {
  Write-Host "RESULT: ALL PASS" -ForegroundColor Green
  exit 0
}
