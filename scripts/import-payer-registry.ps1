<#
.SYNOPSIS
  Import payer registry from PH HMO snapshot into persistent store.

.DESCRIPTION
  Phase 95 -- Payer Registry Persistence.
  Calls POST /admin/payers/import to seed the persistent registry
  from data/payers/ph-hmo-registry.json (27 HMOs + PhilHealth).

  Prerequisites:
    - API server running on localhost:3001
    - data/payers/ph-hmo-registry.json present (Phase 93)

.EXAMPLE
  .\scripts\import-payer-registry.ps1
  .\scripts\import-payer-registry.ps1 -ApiUrl http://localhost:3001
#>

param(
  [string]$ApiUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Phase 95: Payer Registry Import ===" -ForegroundColor Cyan
Write-Host "API: $ApiUrl"

# Check API is reachable
try {
  $health = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Write-Host "[OK] API reachable" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] API not reachable at $ApiUrl -- start with: npx tsx --env-file=.env.local src/index.ts" -ForegroundColor Red
  exit 1
}

# Import from snapshot
Write-Host ""
Write-Host "Importing from PH HMO registry snapshot..." -ForegroundColor Cyan

$body = @{
  actor = "cli-import"
  sourceType = "insurance_commission_snapshot"
  reason = "CLI import from ph-hmo-registry.json"
} | ConvertTo-Json

try {
  $result = Invoke-RestMethod -Uri "$ApiUrl/admin/payers/import" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body `
    -UseBasicParsing `
    -TimeoutSec 30

  if ($result.ok -or $result.imported -gt 0) {
    Write-Host "[OK] Imported: $($result.imported), Skipped: $($result.skipped)" -ForegroundColor Green
  } else {
    Write-Host "[WARN] Import returned issues:" -ForegroundColor Yellow
    if ($result.errors) {
      $result.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    }
  }
} catch {
  Write-Host "[FAIL] Import failed: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

# Verify by fetching stats
Write-Host ""
Write-Host "Verifying registry..." -ForegroundColor Cyan

try {
  $stats = Invoke-RestMethod -Uri "$ApiUrl/admin/payers/stats" -UseBasicParsing -TimeoutSec 10
  $total = $stats.stats.total
  $hasPhil = $stats.stats.hasPhilHealth
  Write-Host "[OK] Registry has $total payers, PhilHealth: $hasPhil" -ForegroundColor Green

  if ($stats.evidenceScore) {
    Write-Host "[OK] Average evidence coverage: $($stats.evidenceScore.averageCoverage)%" -ForegroundColor Green
  }
} catch {
  Write-Host "[WARN] Could not fetch stats: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Verify audit chain
Write-Host ""
Write-Host "Verifying audit chain..." -ForegroundColor Cyan

try {
  $chain = Invoke-RestMethod -Uri "$ApiUrl/admin/payers/audit/verify" -UseBasicParsing -TimeoutSec 10
  if ($chain.ok) {
    Write-Host "[OK] Audit chain valid: $($chain.message)" -ForegroundColor Green
  } else {
    Write-Host "[WARN] Audit chain issue: $($chain.message)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "[WARN] Could not verify audit chain: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Import Complete ===" -ForegroundColor Cyan
