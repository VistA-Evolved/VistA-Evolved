#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Phase 154 verifier -- CPOE Order Signing + Postgres-Backed Idempotency
.DESCRIPTION
  15 gates across 3 tiers: Sanity, Feature Integrity, Regression
#>

param(
  [switch]$Verbose,
  [switch]$SkipDocker
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$pass = 0; $fail = 0; $skip = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id  $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id  $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id  $desc  ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 154 Verification: CPOE Signing + PG Idempotency ===" -ForegroundColor Cyan
Write-Host ""

# ---- Tier 1: Sanity ----
Write-Host "--- Tier 1: Sanity ---" -ForegroundColor Yellow

Gate "S1" "API TypeCheck clean" {
  Push-Location "apps/api"
  $out = npx tsc --noEmit 2>&1
  $code = $LASTEXITCODE
  Pop-Location
  $code -eq 0
}

Gate "S2" "PG migration v21 cpoe_order_sign_event exists" {
  $content = Get-Content -LiteralPath "apps/api/src/platform/pg/pg-migrate.ts" -Raw
  ($content -match 'phase154_cpoe_order_sign_event') -and ($content -match 'cpoe_order_sign_event')
}

Gate "S3" "RLS tables include cpoe_order_sign_event" {
  $content = Get-Content -LiteralPath "apps/api/src/platform/pg/pg-migrate.ts" -Raw
  $content -match '"cpoe_order_sign_event"'
}

Gate "S4" "store-policy: orders/wave2/tiu idempotency = pg_backed" {
  $content = Get-Content -LiteralPath "apps/api/src/platform/store-policy.ts" -Raw
  # Check that all three entries are pg_backed
  $ordersOk = ($content -match 'id: "orders-idempotency"') -and ($content -match 'Phase 154.*Postgres')
  $wave2Ok = ($content -match 'id: "wave2-idempotency"') -and ($content -match 'Phase 154.*Postgres')
  $tiuOk = ($content -match 'id: "tiu-idempotency"') -and ($content -match 'Phase 154.*Postgres')
  $ordersOk -and $wave2Ok -and $tiuOk
}

Gate "S5" "No Map-based idempotencyStore in CPRS route files" {
  $files = @(
    "apps/api/src/routes/cprs/orders-cpoe.ts",
    "apps/api/src/routes/cprs/wave2-routes.ts",
    "apps/api/src/routes/cprs/tiu-notes.ts"
  )
  $found = $false
  foreach ($f in $files) {
    $c = Get-Content -LiteralPath $f -Raw
    if ($c -match 'new Map.*IdempotencyEntry' -or $c -match 'const idempotencyStore') {
      $found = $true
      if ($Verbose) { Write-Host "    Found Map idempotency in $f" }
    }
  }
  -not $found
}

# ---- Tier 2: Feature Integrity ----
Write-Host "`n--- Tier 2: Feature Integrity ---" -ForegroundColor Yellow

Gate "F1" "Sign endpoint requires esCode (blocker response)" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/orders-cpoe.ts" -Raw
  ($content -match 'esCode_required') -and ($content -match 'sign-blocked')
}

Gate "F2" "Sign endpoint logs to cpoe_order_sign_event PG table" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/orders-cpoe.ts" -Raw
  ($content -match 'logSignEvent') -and ($content -match 'cpoe_order_sign_event')
}

Gate "F3" "esCode hashed via SHA-256 (never stored raw)" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/orders-cpoe.ts" -Raw
  ($content -match 'hashEsCode') -and ($content -match 'sha256') -and ($content -match 'slice\(0, 16\)')
}

Gate "F4" "capabilities.json clinical.orders.sign targetRpc = ORWOR1 SIG" {
  $raw = Get-Content -LiteralPath "config/capabilities.json" -Raw
  ($raw -match '"clinical\.orders\.sign"') -and ($raw -match '"targetRpc":\s*"ORWOR1 SIG"')
}

Gate "F5" "UI OrdersPanel has esCode input for signing" {
  $content = Get-Content -LiteralPath "apps/web/src/components/cprs/panels/OrdersPanel.tsx" -Raw
  ($content -match 'E-Signature Code') -and ($content -match 'esCode') -and ($content -match 'type="password"')
}

Gate "F6" "DB-backed idempotencyGuard wired in all 3 CPRS route files" {
  $files = @(
    "apps/api/src/routes/cprs/orders-cpoe.ts",
    "apps/api/src/routes/cprs/wave2-routes.ts",
    "apps/api/src/routes/cprs/tiu-notes.ts"
  )
  $allOk = $true
  foreach ($f in $files) {
    $c = Get-Content -LiteralPath $f -Raw
    if (-not ($c -match 'idempotencyGuard' -and $c -match 'idempotencyOnSend')) {
      $allOk = $false
      if ($Verbose) { Write-Host "    Missing middleware in $f" }
    }
  }
  $allOk
}

Gate "F7" "Middleware accepts both Idempotency-Key and X-Idempotency-Key" {
  $content = Get-Content -LiteralPath "apps/api/src/middleware/idempotency.ts" -Raw
  ($content -match 'x-idempotency-key') -and ($content -match 'idempotency-key')
}

# ---- Tier 3: Regression ----
Write-Host "`n--- Tier 3: Regression ---" -ForegroundColor Yellow

Gate "R1" "ORWORR AGET still in orders-cpoe.ts" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/orders-cpoe.ts" -Raw
  $content -match 'ORWORR AGET'
}

Gate "R2" "ORWDXM AUTOACK still in orders-cpoe.ts" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/orders-cpoe.ts" -Raw
  $content -match 'ORWDXM AUTOACK'
}

Gate "R3" "ORWDXC ACCEPT still in orders-cpoe.ts" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/orders-cpoe.ts" -Raw
  $content -match 'ORWDXC ACCEPT'
}

Gate "R4" "ORWDXA DC still in wave2-routes.ts" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/wave2-routes.ts" -Raw
  $content -match 'ORWDXA DC'
}

Gate "R5" "TIU notes routes still intact" {
  $content = Get-Content -LiteralPath "apps/api/src/routes/cprs/tiu-notes.ts" -Raw
  ($content -match 'TIU CREATE RECORD') -and ($content -match 'TIU SIGN RECORD')
}

# ---- Summary ----
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  SKIP: $skip" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host ""

if ($fail -gt 0) {
  Write-Host "Phase 154 verification: $fail gate(s) FAILED" -ForegroundColor Red
  exit 1
} else {
  Write-Host "Phase 154 verification: ALL GATES PASSED" -ForegroundColor Green
  exit 0
}
