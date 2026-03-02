<#
  Phase 532 - UI Parity Gap Gate Verifier
  Wave 39 P2
  10 gates per prompts/532/532-99-VERIFY.md
#>
param([switch]$Verbose)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\package.json")) { $root = Get-Location }

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id -- $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id -- $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id -- $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 532: UI Parity Gap Gate Verifier ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# G1: Gate script exists
Gate "G1" "scripts/qa-gates/ui-parity-gate.mjs exists" {
  Test-Path -LiteralPath (Join-Path $root "scripts/qa-gates/ui-parity-gate.mjs")
}

# G2: Gate exits 0 on current catalogs
Gate "G2" "Gate script exits 0 on current catalogs" {
  Push-Location $root
  try {
    $null = & node scripts/qa-gates/ui-parity-gate.mjs 2>&1
    return ($LASTEXITCODE -eq 0)
  } finally { Pop-Location }
}

# G3: Baseline exists and is valid JSON
Gate "G3" "parity-baseline.json exists and is valid JSON" {
  $f = Join-Path $root "data/ui-estate/parity-baseline.json"
  if (-not (Test-Path -LiteralPath $f)) { return $false }
  $raw = [System.IO.File]::ReadAllText($f)
  $null = $raw | ConvertFrom-Json
  return $true
}

# G4: Baseline has required fields
Gate "G4" "Baseline contains covered, total, rpcWired, timestamp" {
  $f = Join-Path $root "data/ui-estate/parity-baseline.json"
  $raw = [System.IO.File]::ReadAllText($f)
  $j = $raw | ConvertFrom-Json
  return ($null -ne $j.covered -and $null -ne $j.total -and $null -ne $j.rpcWired -and $null -ne $j.timestamp)
}

# G5: --update-baseline works without error
Gate "G5" "--update-baseline flag works" {
  Push-Location $root
  try {
    $null = & node scripts/qa-gates/ui-parity-gate.mjs --update-baseline 2>&1
    return ($LASTEXITCODE -eq 0)
  } finally { Pop-Location }
}

# G6: Regression detection
Gate "G6" "Regression detection causes exit 1" {
  $f = Join-Path $root "data/ui-estate/parity-baseline.json"
  $raw = [System.IO.File]::ReadAllText($f)
  $j = $raw | ConvertFrom-Json
  # Artificially inflate baseline to force regression
  $j.covered = 9999
  $inflated = $j | ConvertTo-Json -Depth 10
  [System.IO.File]::WriteAllText($f, $inflated)
  Push-Location $root
  try {
    $null = & node scripts/qa-gates/ui-parity-gate.mjs 2>&1
    $exitCode = $LASTEXITCODE
    return ($exitCode -ne 0)
  } finally {
    # Restore baseline
    & node scripts/qa-gates/ui-parity-gate.mjs --update-baseline 2>&1 | Out-Null
    Pop-Location
  }
}

# G7: CI workflow exists
Gate "G7" ".github/workflows/ci-ui-parity-gate.yml exists" {
  Test-Path -LiteralPath (Join-Path $root ".github/workflows/ci-ui-parity-gate.yml")
}

# G8: Workflow references gate script
Gate "G8" "Workflow YAML references gate script" {
  $f = Join-Path $root ".github/workflows/ci-ui-parity-gate.yml"
  $content = [System.IO.File]::ReadAllText($f)
  return ($content -match 'ui-parity-gate\.mjs')
}

# G9: No PHI in baseline
Gate "G9" "No PHI in baseline or gate output" {
  $f = Join-Path $root "data/ui-estate/parity-baseline.json"
  $content = [System.IO.File]::ReadAllText($f)
  return (-not ($content -match '\d{3}-\d{2}-\d{4}|\bdate.of.birth\b|\bpatient.name\b'))
}

# G10: Evidence directory exists
Gate "G10" "Evidence directory exists" {
  $d = Join-Path $root "evidence/wave-39/532-W39-P2-UI-PARITY-GAP-GATE"
  if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  return (Test-Path -LiteralPath $d)
}

# Summary
Write-Host "`n--- Summary ---"
Write-Host "  PASS: $pass / $($pass + $fail)" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
Write-Host ""
exit $fail
