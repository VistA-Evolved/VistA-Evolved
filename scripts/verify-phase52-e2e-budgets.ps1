# ---------------------------------------------------------------
# Phase 52 Verifier -- E2E Scenarios + No-Dead-Click + Perf Budgets
# ---------------------------------------------------------------
# Gates:
#   G52-1  E2E scenario test files exist and are structurally correct
#   G52-2  No-dead-click contract file exists with required screens
#   G52-3  Performance budget config and k6 test exist
#   G52-4  Structural integrity (no regressions)
# ---------------------------------------------------------------
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0

function Gate([string]$id, [scriptblock]$test) {
  $desc = $id
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  $id" -ForegroundColor Green; $script:pass++ }
    else         { Write-Host "  FAIL  $id" -ForegroundColor Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  $id ($_)" -ForegroundColor Red; $script:fail++
  }
}

$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Phase 52 -- E2E + No-Dead-Click + Perf" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------
# G52-1  E2E scenario test files exist
# ---------------------------------------------------------------
Write-Host "--- G52-1  E2E scenario tests ---" -ForegroundColor Yellow

$clinicalSpec = Join-Path $root "apps/web/e2e/scenario-clinical.spec.ts"
$rcmSpec      = Join-Path $root "apps/web/e2e/scenario-rcm.spec.ts"
$portalSpec   = Join-Path $root "apps/portal/e2e/scenario-portal.spec.ts"

Gate "G52-1a: scenario-clinical.spec.ts exists" {
  Test-Path -LiteralPath $clinicalSpec
}

Gate "G52-1b: scenario-clinical covers patient search" {
  $c = Get-Content $clinicalSpec -Raw
  $c -match "patient.search" -and $c -match "allerg"
}

Gate "G52-1c: scenario-rcm.spec.ts exists" {
  Test-Path -LiteralPath $rcmSpec
}

Gate "G52-1d: scenario-rcm covers payer directory" {
  $c = Get-Content $rcmSpec -Raw
  $c -match "payer" -and $c -match "claim"
}

Gate "G52-1e: scenario-portal.spec.ts exists" {
  Test-Path -LiteralPath $portalSpec
}

Gate "G52-1f: scenario-portal covers login and dashboard" {
  $c = Get-Content $portalSpec -Raw
  $c -match "login|sign.in" -and $c -match "dashboard"
}

# ---------------------------------------------------------------
# G52-2  No-dead-click contract
# ---------------------------------------------------------------
Write-Host ""
Write-Host "--- G52-2  No-dead-click contract ---" -ForegroundColor Yellow

$ndcSpec = Join-Path $root "apps/web/e2e/no-dead-clicks.spec.ts"

Gate "G52-2a: no-dead-clicks.spec.ts exists" {
  Test-Path -LiteralPath $ndcSpec
}

Gate "G52-2b: covers CPRS clinical screens (Cover Sheet, Problems, Meds, Orders, Notes, Labs, Imaging)" {
  $c = Get-Content $ndcSpec -Raw
  $c -match "Cover.Sheet" -and $c -match "Problems" -and $c -match "Meds" -and $c -match "Orders" -and $c -match "Notes" -and $c -match "Labs" -and $c -match "Imaging"
}

Gate "G52-2c: covers admin screens (Modules, RCM, Analytics)" {
  $c = Get-Content $ndcSpec -Raw
  $c -match "Admin.*Module" -and $c -match "Admin.*RCM" -and $c -match "Admin.*Analytic"
}

Gate "G52-2d: testButtonClick helper detects dead clicks" {
  $c = Get-Content $ndcSpec -Raw
  $c -match "testButtonClick" -and $c -match "dead-click"
}

Gate "G52-2e: integration-pending test exists" {
  $c = Get-Content $ndcSpec -Raw
  $c -match "integration-pending"
}

Gate "G52-2f: setupConsoleGate used for error detection" {
  $c = Get-Content $ndcSpec -Raw
  $c -match "setupConsoleGate"
}

# ---------------------------------------------------------------
# G52-3  Performance budget config + k6 test
# ---------------------------------------------------------------
Write-Host ""
Write-Host "--- G52-3  Performance budgets ---" -ForegroundColor Yellow

$perfConfig = Join-Path $root "config/performance-budgets.json"
$k6Test     = Join-Path $root "tests/k6/perf-budgets.js"

Gate "G52-3a: performance-budgets.json exists" {
  Test-Path -LiteralPath $perfConfig
}

Gate "G52-3b: performance-budgets.json has API budgets" {
  $c = Get-Content $perfConfig -Raw
  $c -match "api" -and $c -match "p95"
}

Gate "G52-3c: k6 perf-budgets.js exists" {
  Test-Path -LiteralPath $k6Test
}

Gate "G52-3d: k6 test covers smoke/load/stress tiers" {
  $c = Get-Content $k6Test -Raw
  $c -match "smoke" -and $c -match "load" -and $c -match "stress"
}

Gate "G52-3e: k6 test covers infrastructure + clinical + admin groups" {
  $c = Get-Content $k6Test -Raw
  $c -match "infrastructure" -and $c -match "clinical-reads" -and $c -match "admin-reads"
}

Gate "G52-3f: k6 test has custom rpc_latency metric" {
  $c = Get-Content $k6Test -Raw
  $c -match "rpc_latency"
}

# ---------------------------------------------------------------
# G52-4  Structural integrity
# ---------------------------------------------------------------
Write-Host ""
Write-Host "--- G52-4  Structural integrity ---" -ForegroundColor Yellow

$authHelper = Join-Path $root "apps/web/e2e/helpers/auth.ts"
$authSetup  = Join-Path $root "apps/web/e2e/auth.setup.ts"

Gate "G52-4a: auth helper exists" {
  Test-Path -LiteralPath $authHelper
}

Gate "G52-4b: auth.setup.ts exists" {
  Test-Path -LiteralPath $authSetup
}

Gate "G52-4c: No hardcoded PROV123 outside login page and auth.setup" {
  $hits = Get-ChildItem -Path (Join-Path $root "apps/web/src") -Recurse -Include "*.ts","*.tsx" |
    Where-Object { $_.Name -ne "page.tsx" } |
    Select-String -Pattern "PROV123" -SimpleMatch
  $hits.Count -eq 0
}

Gate "G52-4d: Runbook for Phase 52 exists" {
  $runbook = Join-Path $root "docs/runbooks/phase52-e2e-budgets.md"
  Test-Path -LiteralPath $runbook
}

Gate "G52-4e: web playwright.config.ts uses auth setup project" {
  $cfg = Get-Content (Join-Path $root "apps/web/playwright.config.ts") -Raw
  $cfg -match "setup" -and $cfg -match "auth"
}

Gate "G52-4f: portal playwright.config.ts exists" {
  Test-Path -LiteralPath (Join-Path $root "apps/portal/playwright.config.ts")
}

# ---------------------------------------------------------------
# API liveness (skip if --SkipDocker)
# ---------------------------------------------------------------
if (-not $SkipDocker) {
  Write-Host ""
  Write-Host "--- Runtime checks ---" -ForegroundColor Yellow

  Gate "G52-RT1: API health endpoint responds" {
    try {
      $h = curl.exe -s -o NUL -w "%{http_code}" http://localhost:3001/health
      $h -eq "200"
    } catch { $false }
  }

  Gate "G52-RT2: Web app responds" {
    try {
      $h = curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000
      $h -eq "200"
    } catch { $false }
  }
}

# ---------------------------------------------------------------
# Summary
# ---------------------------------------------------------------
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Phase 52 Results: $pass PASS / $fail FAIL / $skip SKIP" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "========================================" -ForegroundColor Cyan

exit $fail
