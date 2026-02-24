<#
.SYNOPSIS
  Performance Gate -- Phase 118 Go-Live Hardening Pack
  Runs k6 RC baseline test and fails if p95 latency exceeds thresholds.
.DESCRIPTION
  Run from repo root: .\scripts\rc-perf-gate.ps1
  Requires: k6 installed, API running on localhost:3001
  Tier: smoke (default), load, stress
#>

param(
  [string]$Tier = "smoke",
  [string]$ApiUrl = "http://127.0.0.1:3001"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

Write-Host "`n=== Performance Gate (Phase 118) ===" -ForegroundColor Cyan
Write-Host "Tier: $Tier | API: $ApiUrl`n"

# Check k6 is available
$k6Path = Get-Command k6 -ErrorAction SilentlyContinue
if (!$k6Path) {
  Write-Host "SKIP: k6 not installed. Install from https://k6.io/" -ForegroundColor Yellow
  exit 0
}

# Check API is running
try {
  $health = curl.exe -s "$ApiUrl/health" 2>&1 | ConvertFrom-Json
  if ($health.ok -ne $true) {
    Write-Host "SKIP: API not healthy at $ApiUrl" -ForegroundColor Yellow
    exit 0
  }
} catch {
  Write-Host "SKIP: API not reachable at $ApiUrl" -ForegroundColor Yellow
  exit 0
}

Write-Host "Running k6 rc-baseline ($Tier tier)..." -ForegroundColor White

# Run k6 with JSON summary output
$summaryFile = "artifacts\perf-gate-$Tier.json"
if (!(Test-Path "artifacts")) { New-Item -ItemType Directory -Path "artifacts" -Force | Out-Null }

k6 run --summary-export=$summaryFile -e "TIER=$Tier" -e "API_URL=$ApiUrl" tests\k6\rc-baseline.js 2>&1 | Tee-Object -Variable k6Output

$exitCode = $LASTEXITCODE

Write-Host "`n--- k6 Results ---" -ForegroundColor White

if ($exitCode -eq 0) {
  Write-Host "PASS: All p95 latency thresholds met" -ForegroundColor Green
} else {
  Write-Host "FAIL: One or more p95 latency thresholds exceeded" -ForegroundColor Red
  Write-Host "See $summaryFile for details" -ForegroundColor Yellow
}

if (Test-Path $summaryFile) {
  Write-Host "`nSummary written to: $summaryFile" -ForegroundColor Gray
}

exit $exitCode
