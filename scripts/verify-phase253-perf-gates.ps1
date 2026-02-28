<# Phase 253 - Performance Acceptance Gates Verifier (Wave 7 P6) #>
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

Write-Host "`n=== Phase 253: Performance Acceptance Gates ===" -ForegroundColor Cyan

# --- G1: perf-acceptance-config.ts exists ---
$configFile = Join-Path $root "tests\k6\perf-acceptance-config.ts"
Gate "G01 config file" (Test-Path -LiteralPath $configFile) "missing"

# --- G2: config defines smoke scenarios ---
if (Test-Path -LiteralPath $configFile) {
  $cfg = Get-Content $configFile -Raw
  Gate "G02 smoke scenarios" ($cfg -match 'SMOKE_SCENARIOS') "missing SMOKE_SCENARIOS"
} else {
  Gate "G02 smoke scenarios" $false "config not found"
}

# --- G3: config defines load scenarios ---
if (Test-Path -LiteralPath $configFile) {
  Gate "G03 load scenarios" ($cfg -match 'LOAD_SCENARIOS') "missing LOAD_SCENARIOS"
} else {
  Gate "G03 load scenarios" $false "config not found"
}

# --- G4: >= 5 total scenarios ---
if (Test-Path -LiteralPath $configFile) {
  $scenarioCount = ([regex]::Matches($cfg, "id:\s*['""]")).Count
  Gate "G04 >= 5 scenarios" ($scenarioCount -ge 5) "found $scenarioCount"
} else {
  Gate "G04 >= 5 scenarios" $false "config not found"
}

# --- G5: thresholds defined for each scenario ---
if (Test-Path -LiteralPath $configFile) {
  $thresholdCount = ([regex]::Matches($cfg, "metric:\s*['""]")).Count
  Gate "G05 thresholds defined" ($thresholdCount -ge 5) "found $thresholdCount"
} else {
  Gate "G05 thresholds defined" $false "config not found"
}

# --- G6: CI workflow exists ---
$ciFile = Join-Path $root ".github\workflows\perf-acceptance-gate.yml"
Gate "G06 CI workflow" (Test-Path -LiteralPath $ciFile) "missing"

# --- G7: CI has smoke job ---
if (Test-Path -LiteralPath $ciFile) {
  $ci = Get-Content $ciFile -Raw
  Gate "G07 smoke CI job" ($ci -match 'perf-smoke') "missing"
} else {
  Gate "G07 smoke CI job" $false "workflow not found"
}

# --- G8: CI has load job ---
if (Test-Path -LiteralPath $ciFile) {
  Gate "G08 load CI job" ($ci -match 'perf-load') "missing"
} else {
  Gate "G08 load CI job" $false "workflow not found"
}

# --- G9: CI uploads artifacts ---
if (Test-Path -LiteralPath $ciFile) {
  Gate "G09 artifact upload" ($ci -match 'upload-artifact') "missing"
} else {
  Gate "G09 artifact upload" $false "workflow not found"
}

# --- G10: local runner exists ---
$runner = Join-Path $root "tests\k6\run-acceptance-gate.ps1"
Gate "G10 local runner" (Test-Path -LiteralPath $runner) "missing"

# --- G11: local runner checks k6 installed ---
if (Test-Path -LiteralPath $runner) {
  $runnerContent = Get-Content $runner -Raw
  Gate "G11 k6 install check" ($runnerContent -match 'Get-Command k6') "missing"
} else {
  Gate "G11 k6 install check" $false "runner not found"
}

# --- G12: local runner checks API health ---
if (Test-Path -LiteralPath $runner) {
  Gate "G12 health check" ($runnerContent -match '/health') "missing"
} else {
  Gate "G12 health check" $false "runner not found"
}

# --- G13: existing k6 scripts intact ---
$existingScripts = @("smoke-login.js","smoke-reads.js","smoke-fhir.js","load-mixed.js")
$allExist = $true
foreach ($s in $existingScripts) {
  if (-not (Test-Path -LiteralPath (Join-Path $root "tests\k6\$s"))) { $allExist = $false; break }
}
Gate "G13 existing k6 scripts" $allExist "missing script"

# --- G14: prompt folder ---
$promptDir = Join-Path $root "prompts\250-PHASE-253-PERF-ACCEPTANCE-GATES"
Gate "G14 prompt folder" (Test-Path -LiteralPath $promptDir) "missing"

# --- G15: IMPLEMENT prompt ---
$implFile = Join-Path $promptDir "253-01-IMPLEMENT.md"
Gate "G15 IMPLEMENT prompt" (Test-Path -LiteralPath $implFile) "missing"

# --- G16: VERIFY prompt ---
$verFile = Join-Path $promptDir "253-99-VERIFY.md"
Gate "G16 VERIFY prompt" (Test-Path -LiteralPath $verFile) "missing"

# --- G17: evidence dir ---
$evidDir = Join-Path $root "evidence\wave-7\P6"
Gate "G17 evidence dir" (Test-Path -LiteralPath $evidDir) "missing"

# --- Summary ---
Write-Host "`n--- Phase 253 Results ---" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn"
if ($fail -gt 0) { Write-Host "  VERDICT: FAIL" -ForegroundColor Red; exit 1 }
else { Write-Host "  VERDICT: PASS" -ForegroundColor Green; exit 0 }
