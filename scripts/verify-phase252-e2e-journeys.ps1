<# Phase 252 - E2E Clinical Journeys Verifier (Wave 7 P5) #>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)

function Gate($name, $ok, $detail) {
  if ($ok) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
  else     { Write-Host "  FAIL  $name -- $detail" -ForegroundColor Red; $script:fail++ }
}
function Warn($name, $detail) {
  Write-Host "  WARN  $name -- $detail" -ForegroundColor Yellow; $script:warn++
}

Write-Host "`n=== Phase 252: E2E Clinical Journeys ===" -ForegroundColor Cyan

# --- G1: journey config exists ---
$journeyConfig = Join-Path $root "apps\web\e2e\helpers\journey-config.ts"
Gate "G01 journey-config.ts" (Test-Path -LiteralPath $journeyConfig) "missing"

# --- G2: evidence spec exists ---
$evidSpec = Join-Path $root "apps\web\e2e\clinical-journey-evidence.spec.ts"
Gate "G02 evidence spec" (Test-Path -LiteralPath $evidSpec) "missing"

# --- G3: journey config defines 3+ journeys ---
if (Test-Path -LiteralPath $journeyConfig) {
  $jContent = Get-Content $journeyConfig -Raw
  $journeyCount = ([regex]::Matches($jContent, "id:\s*['""]")).Count
  Gate "G03 >= 3 journeys" ($journeyCount -ge 3) "found $journeyCount"
} else {
  Gate "G03 >= 3 journeys" $false "config not found"
}

# --- G4: chart-review journey defined ---
if (Test-Path -LiteralPath $journeyConfig) {
  Gate "G04 chart-review journey" ($jContent -match 'chart-review') "missing"
} else {
  Gate "G04 chart-review journey" $false "config not found"
}

# --- G5: admin-posture journey defined ---
if (Test-Path -LiteralPath $journeyConfig) {
  Gate "G05 admin-posture journey" ($jContent -match 'admin-posture') "missing"
} else {
  Gate "G05 admin-posture journey" $false "config not found"
}

# --- G6: fhir-smoke journey defined ---
if (Test-Path -LiteralPath $journeyConfig) {
  Gate "G06 fhir-smoke journey" ($jContent -match 'fhir-smoke') "missing"
} else {
  Gate "G06 fhir-smoke journey" $false "config not found"
}

# --- G7: evidence spec imports journey config ---
if (Test-Path -LiteralPath $evidSpec) {
  $specContent = Get-Content $evidSpec -Raw
  Gate "G07 imports journey config" ($specContent -match 'journey-config') "no import"
} else {
  Gate "G07 imports journey config" $false "spec not found"
}

# --- G8: evidence spec imports NetworkEvidence ---
if (Test-Path -LiteralPath $evidSpec) {
  Gate "G08 imports NetworkEvidence" ($specContent -match 'NetworkEvidence') "no import"
} else {
  Gate "G08 imports NetworkEvidence" $false "spec not found"
}

# --- G9: evidence spec captures screenshots ---
if (Test-Path -LiteralPath $evidSpec) {
  Gate "G09 screenshots captured" ($specContent -match 'screenshot') "no screenshot"
} else {
  Gate "G09 screenshots captured" $false "spec not found"
}

# --- G10: evidence spec has console error gate ---
if (Test-Path -LiteralPath $evidSpec) {
  Gate "G10 console error gate" ($specContent -match 'setupConsoleGate') "no console gate"
} else {
  Gate "G10 console error gate" $false "spec not found"
}

# --- G11: FHIR smoke checks CapabilityStatement ---
if (Test-Path -LiteralPath $evidSpec) {
  Gate "G11 FHIR CapabilityStatement" ($specContent -match 'CapabilityStatement') "missing"
} else {
  Gate "G11 FHIR CapabilityStatement" $false "spec not found"
}

# --- G12: FHIR smoke checks 401 for unauth ---
if (Test-Path -LiteralPath $evidSpec) {
  Gate "G12 unauth 401 check" ($specContent -match '401') "missing 401 check"
} else {
  Gate "G12 unauth 401 check" $false "spec not found"
}

# --- G13: existing auth helper still intact ---
$authHelper = Join-Path $root "apps\web\e2e\helpers\auth.ts"
Gate "G13 auth helper intact" (Test-Path -LiteralPath $authHelper) "missing"

# --- G14: existing network-evidence helper intact ---
$netHelper = Join-Path $root "apps\web\e2e\helpers\network-evidence.ts"
Gate "G14 network-evidence helper" (Test-Path -LiteralPath $netHelper) "missing"

# --- G15: playwright.config.ts intact ---
$pwConfig = Join-Path $root "apps\web\playwright.config.ts"
Gate "G15 playwright config" (Test-Path -LiteralPath $pwConfig) "missing"

# --- G16: prompt folder ---
$promptDir = Join-Path $root "prompts\249-PHASE-252-E2E-CLINICAL-JOURNEYS"
Gate "G16 prompt folder" (Test-Path -LiteralPath $promptDir) "missing"

# --- G17: IMPLEMENT prompt ---
$implFile = Join-Path $promptDir "252-01-IMPLEMENT.md"
Gate "G17 IMPLEMENT prompt" (Test-Path -LiteralPath $implFile) "missing"

# --- G18: VERIFY prompt ---
$verFile = Join-Path $promptDir "252-99-VERIFY.md"
Gate "G18 VERIFY prompt" (Test-Path -LiteralPath $verFile) "missing"

# --- G19: evidence dir ---
$evidDir = Join-Path $root "evidence\wave-7\P5"
Gate "G19 evidence dir" (Test-Path -LiteralPath $evidDir) "missing"

# --- Summary ---
Write-Host "`n--- Phase 252 Results ---" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn"
if ($fail -gt 0) { Write-Host "  VERDICT: FAIL" -ForegroundColor Red; exit 1 }
else { Write-Host "  VERDICT: PASS" -ForegroundColor Green; exit 0 }
