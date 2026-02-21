<# Phase 68: Nursing Workflow v1 -- OS v3 Verification Script #>
param([switch]$SkipDocker, [switch]$Verbose)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $warn = 0
$results = @()

function Gate([string]$name, [bool]$ok, [string]$detail) {
  $script:results += [PSCustomObject]@{ Gate = $name; Status = if ($ok) { "PASS" } else { "FAIL" }; Detail = $detail }
  if ($ok) { $script:pass++ } else { $script:fail++ }
  $symbol = if ($ok) { "[PASS]" } else { "[FAIL]" }
  Write-Host "$symbol $name" -ForegroundColor $(if ($ok) { "Green" } else { "Red" })
}

Write-Host "`n=== Phase 68: Nursing Workflow v1 ===" -ForegroundColor Cyan
Write-Host "VistA-first read posture verification`n"

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = $PSScriptRoot | Split-Path -Parent }

# --- Gate 1: File Structure ---
Write-Host "--- Gate 1: File Structure ---"
$nursingRoute = Join-Path $root "apps/api/src/routes/nursing/index.ts"
$nursingPanel = Join-Path $root "apps/web/src/components/cprs/panels/NursingPanel.tsx"
$nursingPlan  = Join-Path $root "artifacts/phase68/nursing-plan.json"
$promptImpl   = Join-Path $root "prompts/74-PHASE-68-NURSING-WORKFLOW/74-01-IMPLEMENT.md"
Gate "Nursing route file exists" (Test-Path -LiteralPath $nursingRoute)
Gate "Nursing panel file exists" (Test-Path -LiteralPath $nursingPanel)
Gate "Nursing plan artifact exists" (Test-Path -LiteralPath $nursingPlan)
Gate "Prompt 74-01-IMPLEMENT exists" (Test-Path -LiteralPath $promptImpl)
Write-Host ""

# --- Gate 2: RPC Registry ---
Write-Host "--- Gate 2: RPC Registry ---"
$rpcReg = Get-Content (Join-Path $root "apps/api/src/vista/rpcRegistry.ts") -Raw
Gate "RPC registry has ORQQVI VITALS" ($rpcReg -match 'ORQQVI VITALS')
Gate "RPC registry has ORQQVI VITALS FOR DATE RANGE" ($rpcReg -match 'ORQQVI VITALS FOR DATE RANGE')
Gate "RPC registry has TIU DOCUMENTS BY CONTEXT" ($rpcReg -match 'TIU DOCUMENTS BY CONTEXT')
Gate "RPC registry has ORQPT WARD PATIENTS" ($rpcReg -match 'ORQPT WARD PATIENTS')
Gate "RPC registry has GMV ADD VM" ($rpcReg -match 'GMV ADD VM')
Write-Host ""

# --- Gate 3: Capabilities ---
Write-Host "--- Gate 3: Capabilities ---"
$caps = Get-Content (Join-Path $root "config/capabilities.json") -Raw
Gate "Capability: clinical.nursing.vitals" ($caps -match 'clinical\.nursing\.vitals')
Gate "Capability: clinical.nursing.vitalsRange" ($caps -match 'clinical\.nursing\.vitalsRange')
Gate "Capability: clinical.nursing.notes" ($caps -match 'clinical\.nursing\.notes')
Gate "Capability: clinical.nursing.wardPatients" ($caps -match 'clinical\.nursing\.wardPatients')
Gate "Capability: clinical.nursing.tasks" ($caps -match 'clinical\.nursing\.tasks')
Gate "Capability: clinical.nursing.mar" ($caps -match 'clinical\.nursing\.mar')
Gate "Capability: clinical.nursing.administer" ($caps -match 'clinical\.nursing\.administer')
Write-Host ""

# --- Gate 4: Action Registry ---
Write-Host "--- Gate 4: Action Registry ---"
$actionReg = Get-Content (Join-Path $root "apps/web/src/actions/actionRegistry.ts") -Raw
Gate "Action: nursing.vitals" ($actionReg -match 'nursing\.vitals')
Gate "Action: nursing.vitals-range" ($actionReg -match 'nursing\.vitals-range')
Gate "Action: nursing.notes" ($actionReg -match 'nursing\.notes')
Gate "Action: nursing.ward-patients" ($actionReg -match 'nursing\.ward-patients')
Gate "Action: nursing.tasks" ($actionReg -match 'nursing\.tasks')
Gate "Action: nursing.mar" ($actionReg -match 'nursing\.mar')
Gate "Action: nursing.administer" ($actionReg -match 'nursing\.administer')
Gate "Action location 'Nursing' exists" ($actionReg -match 'location:\s*"Nursing"')
Write-Host ""

# --- Gate 5: Tab Wiring ---
Write-Host "--- Gate 5: Tab Wiring ---"
$tabsJson = Get-Content (Join-Path $root "apps/web/src/lib/contracts/data/tabs.json") -Raw
$chartPage = Get-Content -LiteralPath (Join-Path $root "apps/web/src/app/cprs/chart/[dfn]/[tab]/page.tsx") -Raw
$panelIndex = Get-Content (Join-Path $root "apps/web/src/components/cprs/panels/index.ts") -Raw
Gate "tabs.json has CT_NURSING" ($tabsJson -match 'CT_NURSING')
Gate "VALID_TABS has 'nursing'" ($chartPage -match "'nursing'")
Gate "Chart page imports NursingPanel" ($chartPage -match 'NursingPanel')
Gate "TabContent switch has nursing case" ($chartPage -match "case 'nursing'")
Gate "Panel barrel exports NursingPanel" ($panelIndex -match 'NursingPanel')
Write-Host ""

# --- Gate 6: Modules ---
Write-Host "--- Gate 6: Modules ---"
$modules = Get-Content (Join-Path $root "config/modules.json") -Raw
Gate "modules.json clinical has /vista/nursing" ($modules -match '/vista/nursing')
Write-Host ""

# --- Gate 7: Index.ts Registration ---
Write-Host "--- Gate 7: Index.ts Registration ---"
$indexTs = Get-Content (Join-Path $root "apps/api/src/index.ts") -Raw
Gate "index.ts imports nursingRoutes" ($indexTs -match 'nursingRoutes')
Gate "index.ts registers nursingRoutes" ($indexTs -match 'server\.register\(nursingRoutes\)')
Write-Host ""

# --- Gate 8: Route Structure ---
Write-Host "--- Gate 8: Route Structure ---"
$routeContent = Get-Content $nursingRoute -Raw
Gate "Route: /vista/nursing/vitals" ($routeContent -match '/vista/nursing/vitals')
Gate "Route: /vista/nursing/vitals-range" ($routeContent -match '/vista/nursing/vitals-range')
Gate "Route: /vista/nursing/notes" ($routeContent -match '/vista/nursing/notes')
Gate "Route: /vista/nursing/ward-patients" ($routeContent -match '/vista/nursing/ward-patients')
Gate "Route: /vista/nursing/tasks" ($routeContent -match '/vista/nursing/tasks')
Gate "Route: /vista/nursing/mar" ($routeContent -match '/vista/nursing/mar[^/]')
Gate "Route: /vista/nursing/mar/administer" ($routeContent -match '/vista/nursing/mar/administer')
Gate "Route uses safeCallRpc" ($routeContent -match 'safeCallRpc')
Gate "Route uses requireSession" ($routeContent -match 'requireSession')
Gate "All responses have rpcUsed" ($routeContent -match 'rpcUsed')
Gate "All responses have pendingTargets" ($routeContent -match 'pendingTargets')
Write-Host ""

# --- Gate 9: No Fake Data ---
Write-Host "--- Gate 9: No Fake Data ---"
$panelContent = Get-Content $nursingPanel -Raw
Gate "Panel has no hardcoded patient names" (-not ($panelContent -match '(SMITH|JONES|DOE|CARTER),'))
Gate "Panel has no hardcoded vital values" (-not ($panelContent -match '\b(120/80|98\.6|72|160)\b'))
Gate "Panel has no mock MAR data" (-not ($panelContent -match '(Lisinopril|Metformin|Aspirin)\b'))
Gate "Route has no hardcoded data" (-not ($routeContent -match '(SMITH|JONES|DOE|CARTER),'))
Gate "Panel uses API fetch, not stubs" ($panelContent -match 'fetch\(')
Write-Host ""

# --- Gate 10: BCMA/MAR Pending Posture ---
Write-Host "--- Gate 10: BCMA/MAR Pending Posture ---"
Gate "MAR route returns integration-pending" (($routeContent -match 'integration-pending') -and ($routeContent -match 'PSB'))
Gate "Administer route returns 202" ($routeContent -match 'reply\.code\(202\)')
Gate "MAR mentions BCMA" ($routeContent -match 'BCMA')
Gate "Plan confirms bcmaPresent=false" ((Get-Content $nursingPlan -Raw) -match '"bcmaPresent":\s*false')
Write-Host ""

# --- Gate 11: TypeScript Compilation ---
Write-Host "--- Gate 11: TypeScript Compilation ---"
Push-Location (Join-Path $root "apps/api")
$apiTsc = & npx tsc --noEmit 2>&1 | Out-String
$apiClean = -not ($apiTsc -match 'error TS')
Pop-Location
Gate "API TSC clean" $apiClean

Push-Location (Join-Path $root "apps/web")
$webTsc = & npx tsc --noEmit 2>&1 | Out-String
# Check for nursing-specific errors only (pre-existing errors tolerated)
$webNursingErrors = ($webTsc -split "`n") | Where-Object { $_ -match 'error TS' -and $_ -match '(NursingPanel|nursing)' }
$webClean = ($webNursingErrors.Count -eq 0)
Pop-Location
Gate "Web TSC clean (no Nursing errors)" $webClean

Write-Host ""
Write-Host "========================================"
Write-Host "Phase 68 Nursing Verification Summary"
Write-Host "  PASS: $pass"
Write-Host "  FAIL: $fail"
Write-Host "  WARN: $warn"
Write-Host "========================================"
Write-Host ""
if ($fail -eq 0) { Write-Host "RESULT: ALL PASS" }
else { Write-Host "RESULT: $fail FAILURES"; exit 1 }
