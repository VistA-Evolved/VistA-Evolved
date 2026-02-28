<# Phase 253 - Performance Acceptance Gate Runner (Wave 7 P6)
   Runs k6 smoke-tier tests locally and checks pass/fail thresholds.
   Usage: .\tests\k6\run-acceptance-gate.ps1 [-Tier smoke|load]
#>
param(
  [string]$Tier = "smoke",
  [string]$ApiUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0

Write-Host "`n=== Performance Acceptance Gate (Tier: $Tier) ===" -ForegroundColor Cyan

# Check k6 is installed
$k6Path = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $k6Path) {
  Write-Host "  SKIP  k6 not installed -- install from https://k6.io/docs/get-started/installation/" -ForegroundColor Yellow
  exit 0
}

# Check API is running
try {
  $health = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  if ($health.StatusCode -ne 200) {
    Write-Host "  SKIP  API not healthy at $ApiUrl" -ForegroundColor Yellow
    exit 0
  }
} catch {
  Write-Host "  SKIP  API not reachable at $ApiUrl" -ForegroundColor Yellow
  exit 0
}

Write-Host "  API healthy at $ApiUrl" -ForegroundColor Green

# Define scenarios per tier
$scenarios = @()
if ($Tier -eq "smoke") {
  $scenarios = @(
    @{ Name = "auth-smoke";  Script = "tests/k6/smoke-login.js"; VUs = 2; Duration = "10s" },
    @{ Name = "reads-smoke"; Script = "tests/k6/smoke-reads.js"; VUs = 3; Duration = "15s" },
    @{ Name = "fhir-smoke";  Script = "tests/k6/smoke-fhir.js";  VUs = 2; Duration = "10s" }
  )
} elseif ($Tier -eq "load") {
  $scenarios = @(
    @{ Name = "mixed-load"; Script = "tests/k6/load-mixed.js"; VUs = 10; Duration = "2m" },
    @{ Name = "db-load";    Script = "tests/k6/db-load.js";    VUs = 5;  Duration = "1m" }
  )
}

foreach ($s in $scenarios) {
  Write-Host "`n  Running: $($s.Name) ($($s.VUs) VUs, $($s.Duration))..." -ForegroundColor Gray
  $env:API_URL = $ApiUrl
  $result = & k6 run --vus $s.VUs --duration $s.Duration --quiet $s.Script 2>&1
  $exitCode = $LASTEXITCODE

  if ($exitCode -eq 0) {
    Write-Host "  PASS  $($s.Name)" -ForegroundColor Green
    $pass++
  } else {
    Write-Host "  FAIL  $($s.Name) (exit code: $exitCode)" -ForegroundColor Red
    $fail++
  }
}

Write-Host "`n--- Acceptance Gate Results ---" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail"
if ($fail -gt 0) { Write-Host "  VERDICT: FAIL" -ForegroundColor Red; exit 1 }
else { Write-Host "  VERDICT: PASS" -ForegroundColor Green; exit 0 }
