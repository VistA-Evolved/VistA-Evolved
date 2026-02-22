# Phase 83 Verifier -- Inpatient ADT + Census + Bedboard
# Gates: file existence, source integrity, integration, UI, no-fake-data, docs

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$pass = 0; $fail = 0; $skip = 0

function Gate([string]$name, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS  $name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $name" -ForegroundColor Red
    $script:fail++
  }
}

function Skip([string]$name, [string]$reason) {
  Write-Host "  SKIP  $name ($reason)" -ForegroundColor Yellow
  $script:skip++
}

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path -LiteralPath "$root\apps")) { $root = $PSScriptRoot | Split-Path | Split-Path }

Write-Host "=== Phase 83 Verifier -- Inpatient ADT + Census + Bedboard ===" -ForegroundColor Cyan
Write-Host ""

# --- Section 1: File Existence ---
Write-Host "--- Section 1: File Existence ---" -ForegroundColor Yellow

$apiRoutes = "$root\apps\api\src\routes\inpatient\index.ts"
$webPage = "$root\apps\web\src\app\cprs\inpatient\page.tsx"
$grounding = "$root\docs\runbooks\inpatient-adt-grounding.md"
$runbook = "$root\docs\runbooks\inpatient-adt.md"
$prompt = "$root\prompts\88-PHASE-83-INPATIENT-ADT\88-01-IMPLEMENT.md"
$menuBar = "$root\apps\web\src\components\cprs\CPRSMenuBar.tsx"

Gate "inpatient routes file exists" (Test-Path -LiteralPath $apiRoutes)
Gate "inpatient web page exists" (Test-Path -LiteralPath $webPage)
Gate "grounding doc exists" (Test-Path -LiteralPath $grounding)
Gate "runbook exists" (Test-Path -LiteralPath $runbook)
Gate "prompt 88-01-IMPLEMENT.md exists" (Test-Path -LiteralPath $prompt)

Write-Host ""
# --- Section 2: API Route Integrity ---
Write-Host "--- Section 2: API Route Integrity ---" -ForegroundColor Yellow

if (Test-Path -LiteralPath $apiRoutes) {
  $src = Get-Content $apiRoutes -Raw
  Gate "has GET /vista/inpatient/wards" ($src -match '/vista/inpatient/wards')
  Gate "has GET /vista/inpatient/ward-census" ($src -match '/vista/inpatient/ward-census')
  Gate "has GET /vista/inpatient/bedboard" ($src -match '/vista/inpatient/bedboard')
  Gate "has GET /vista/inpatient/patient-movements" ($src -match '/vista/inpatient/patient-movements')
  Gate "has POST /vista/inpatient/admit" ($src -match '/vista/inpatient/admit')
  Gate "has POST /vista/inpatient/transfer" ($src -match '/vista/inpatient/transfer')
  Gate "has POST /vista/inpatient/discharge" ($src -match '/vista/inpatient/discharge')
  Gate "uses ORQPT WARDS RPC" ($src -match 'ORQPT WARDS')
  Gate "uses ORQPT WARD PATIENTS RPC" ($src -match 'ORQPT WARD PATIENTS')
  Gate "uses ORWPT16 ADMITLST RPC" ($src -match 'ORWPT16 ADMITLST')
  Gate "uses safeCallRpc" ($src -match 'safeCallRpc')
  Gate "uses requireSession" ($src -match 'requireSession')
  Gate "has pendingTargets in responses" ($src -match 'pendingTargets')
  Gate "has vistaGrounding in pending responses" ($src -match 'vistaGrounding')
  Gate "admits return integration-pending" ($src -match 'integration-pending')
  Gate "references PATIENT MOVEMENT (405)" ($src -match 'PATIENT MOVEMENT \(405\)')
  Gate "references WARD LOCATION (42)" ($src -match 'WARD LOCATION \(42\)')
  Gate "has pendingFallback helper" ($src -match 'pendingFallback')
} else {
  1..18 | ForEach-Object { Skip "route check $_" "file missing" }
}

Write-Host ""
# --- Section 3: Integration (index.ts) ---
Write-Host "--- Section 3: Integration (index.ts) ---" -ForegroundColor Yellow

$indexFile = "$root\apps\api\src\index.ts"
if (Test-Path -LiteralPath $indexFile) {
  $idx = Get-Content $indexFile -Raw
  Gate "index.ts imports inpatient routes" ($idx -match 'import\s+inpatientRoutes')
  Gate "index.ts registers inpatientRoutes" ($idx -match 'server\.register\(inpatientRoutes\)')
} else {
  Skip "index.ts import" "file missing"
  Skip "index.ts register" "file missing"
}

Write-Host ""
# --- Section 4: Web UI ---
Write-Host "--- Section 4: Web UI ---" -ForegroundColor Yellow

if (Test-Path -LiteralPath $webPage) {
  $ui = Get-Content $webPage -Raw
  Gate "has CensusTab component" ($ui -match 'function CensusTab')
  Gate "has BedboardTab component" ($ui -match 'function BedboardTab')
  Gate "has ADTWorkflowTab component" ($ui -match 'function ADTWorkflowTab')
  Gate "has MovementTimelineTab component" ($ui -match 'function MovementTimelineTab')
  Gate "fetches /vista/inpatient/wards" ($ui -match '/vista/inpatient/wards')
  Gate "fetches /vista/inpatient/ward-census" ($ui -match '/vista/inpatient/ward-census')
  Gate "fetches /vista/inpatient/bedboard" ($ui -match '/vista/inpatient/bedboard')
  Gate "fetches /vista/inpatient/patient-movements" ($ui -match '/vista/inpatient/patient-movements')
  Gate "has bed grid rendering" ($ui -match 'bedGrid|bed.*grid')
  Gate "has patient click handler" ($ui -match 'handlePatientClick|selectedPatient')
  Gate "has ward selector" ($ui -match 'selectedWard|Select Ward')
  Gate "uses credentials include" ($ui -match "credentials.*'include'")
  Gate "has integration-pending display" ($ui -match 'integration-pending|Integration Pending|Integration Status')
  Gate "has Open Chart navigation" ($ui -match '/cprs/chart/')
} else {
  1..14 | ForEach-Object { Skip "UI check $_" "file missing" }
}

Write-Host ""
# --- Section 5: Navigation ---
Write-Host "--- Section 5: Navigation ---" -ForegroundColor Yellow

if (Test-Path -LiteralPath $menuBar) {
  $menu = Get-Content $menuBar -Raw
  Gate "CPRSMenuBar has Inpatient Operations entry" ($menu -match 'Inpatient Operations')
  Gate "CPRSMenuBar routes to /cprs/inpatient" ($menu -match '/cprs/inpatient')
} else {
  Skip "menu check" "file missing"
  Skip "menu route check" "file missing"
}

Write-Host ""
# --- Section 6: No Fake Data ---
Write-Host "--- Section 6: No Fake Data ---" -ForegroundColor Yellow

if (Test-Path -LiteralPath $apiRoutes) {
  $src = Get-Content $apiRoutes -Raw
  Gate "no hardcoded eligible:true" (-not ($src -match 'eligible:\s*true'))
  Gate "no PROV123 in routes" (-not ($src -match 'PROV123'))
  Gate "no fabricated patient data" (-not ($src -match '"name":\s*"(John|Jane|Test)'))
}
if (Test-Path -LiteralPath $webPage) {
  $ui = Get-Content $webPage -Raw
  Gate "no PROV123 in UI" (-not ($ui -match 'PROV123'))
  Gate "no hardcoded patient names in UI" (-not ($ui -match '"name":\s*"(John|Jane|Test)'))
}

Write-Host ""
# --- Section 7: Documentation ---
Write-Host "--- Section 7: Documentation ---" -ForegroundColor Yellow

if (Test-Path -LiteralPath $grounding) {
  $gnd = Get-Content $grounding -Raw
  Gate "grounding has FileMan file 405" ($gnd -match 'PATIENT MOVEMENT \(405\)')
  Gate "grounding has File 42" ($gnd -match 'WARD LOCATION \(42\)')
  Gate "grounding has File 405.4" ($gnd -match 'ROOM-BED \(405\.4\)')
  Gate "grounding lists ZVE custom RPCs" ($gnd -match 'ZVE')
  Gate "grounding has migration path" ($gnd -match 'Migration|migration')
}
if (Test-Path -LiteralPath $runbook) {
  $rb = Get-Content $runbook -Raw
  Gate "runbook has troubleshooting" ($rb -match 'Troubleshooting|troubleshooting')
  Gate "runbook lists all endpoints" ($rb -match '/vista/inpatient/wards')
}

Write-Host ""
# --- Section 8: Phase 67 Not Broken ---
Write-Host "--- Section 8: Phase 67 ADT Intact ---" -ForegroundColor Yellow

$adtFile = "$root\apps\api\src\routes\adt\index.ts"
if (Test-Path -LiteralPath $adtFile) {
  $adt = Get-Content $adtFile -Raw
  Gate "Phase 67 adt/index.ts still exists" $true
  Gate "Phase 67 ORQPT WARDS still present" ($adt -match 'ORQPT WARDS')
  Gate "Phase 67 admission-list still present" ($adt -match 'admission-list')
} else {
  Skip "Phase 67 check" "adt file missing"
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor Red
Write-Host "  SKIP: $skip" -ForegroundColor Yellow
Write-Host "  TOTAL: $($pass + $fail + $skip)" -ForegroundColor White
Write-Host ""

if ($fail -eq 0) {
  Write-Host "VERDICT: PASS" -ForegroundColor Green
} else {
  Write-Host "VERDICT: FAIL" -ForegroundColor Red
}
