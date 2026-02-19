<# ──────────────────────────────────────────────
   run-smoke.ps1 -- k6 smoke-test wrapper
   Phase 36 -- Production Observability
   Usage:
     .\tests\k6\run-smoke.ps1                  # runs all 3
     .\tests\k6\run-smoke.ps1 -Suite login     # just login
     .\tests\k6\run-smoke.ps1 -Suite reads
     .\tests\k6\run-smoke.ps1 -Suite write
   ────────────────────────────────────────────── #>
param(
  [ValidateSet("all","login","reads","write")]
  [string]$Suite = "all",
  [string]$ApiUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Check k6 is installed
$k6 = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6) {
  Write-Host "[ERROR] k6 is not installed. Install from https://k6.io/docs/get-started/installation/" -ForegroundColor Red
  exit 1
}

# Check API is reachable
try {
  $health = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  if ($health.StatusCode -ne 200) { throw "bad status" }
  Write-Host "[OK] API is reachable at $ApiUrl" -ForegroundColor Green
} catch {
  Write-Host "[ERROR] API is not reachable at $ApiUrl -- start it first." -ForegroundColor Red
  exit 1
}

$suites = @()
if ($Suite -eq "all" -or $Suite -eq "login") { $suites += "smoke-login.js" }
if ($Suite -eq "all" -or $Suite -eq "reads") { $suites += "smoke-reads.js" }
if ($Suite -eq "all" -or $Suite -eq "write") { $suites += "smoke-write.js" }

$allPassed = $true
foreach ($s in $suites) {
  $script = Join-Path $dir $s
  Write-Host "`n========================================" -ForegroundColor Cyan
  Write-Host "  Running: $s" -ForegroundColor Cyan
  Write-Host "========================================" -ForegroundColor Cyan
  & k6 run --env API_URL=$ApiUrl $script
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] $s exited with code $LASTEXITCODE" -ForegroundColor Red
    $allPassed = $false
  } else {
    Write-Host "[PASS] $s" -ForegroundColor Green
  }
}

Write-Host ""
if ($allPassed) {
  Write-Host "All smoke tests passed." -ForegroundColor Green
  exit 0
} else {
  Write-Host "Some smoke tests failed. Review output above." -ForegroundColor Yellow
  exit 1
}
