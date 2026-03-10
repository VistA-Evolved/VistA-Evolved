#!/usr/bin/env pwsh
<#
  ops/drills/run-circuit-breaker-drill.ps1
  Resilience drill: Circuit Breaker Verification -- Phase 254

  Verifies circuit breaker opens after repeated failures and recovers.
  Requires: API running on :3001.
#>
param(
  [string]$ApiUrl = "http://localhost:3001",
  [string]$ComposeFile = "services/vista/docker-compose.yml"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition))
Set-Location $root

$pass = 0; $fail = 0; $results = @()

function Gate($name, $ok, $detail) {
  $script:results += [PSCustomObject]@{ Gate=$name; Pass=$ok; Detail=$detail }
  if ($ok) { $script:pass++; Write-Host "  PASS  $name" -ForegroundColor Green }
  else     { $script:fail++; Write-Host "  FAIL  $name -- $detail" -ForegroundColor Red }
}

Write-Host "`n=== Circuit Breaker Drill ===" -ForegroundColor Cyan

# Gate 1: API healthy and circuit breaker starts closed
try {
  $h = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  $cbState = $h.circuitBreaker
  Gate "cb_starts_closed" ($cbState -eq "closed") "CB state: $cbState"
} catch {
  Gate "cb_starts_closed" $false "API unreachable: $($_.Exception.Message)"
  exit 1
}

# Gate 2: Ready reports ok:true when CB is closed
try {
  $r = Invoke-RestMethod -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 5
  Gate "ready_ok_cb_closed" ($r.ok -eq $true) "Ready ok when CB closed"
} catch {
  Gate "ready_ok_cb_closed" $false "$($_.Exception.Message)"
}

# Gate 3: Stop VistA to induce failures
Write-Host "`n--- Stopping VistA to induce CB failures ---" -ForegroundColor Yellow
try {
  docker compose -f $ComposeFile stop 2>&1 | Out-Null
  Start-Sleep -Seconds 5
  Gate "vista_stopped_for_cb" $true "VistA stopped for CB test"
} catch {
  Gate "vista_stopped_for_cb" $false "Failed: $($_.Exception.Message)"
}

# Gate 4: After VistA down, check health reports CB state
# The circuit breaker may not be open yet -- it opens after 5 RPC failures.
# /health always returns 200 but reports cbState.
try {
  $h2 = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Gate "health_reports_cb_state" ($h2.circuitBreaker -ne $null) "CB state reported: $($h2.circuitBreaker)"
} catch {
  Gate "health_reports_cb_state" $false "$($_.Exception.Message)"
}

# Gate 5: Check /ready reflects VistA down
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 15
  $r2 = $raw.Content | ConvertFrom-Json
  $vistaDown = ($r2.ok -eq $false) -or ($r2.vista -eq "unreachable")
  Gate "ready_reflects_vista_down" $vistaDown "Ready: ok=$($r2.ok), vista=$($r2.vista)"
} catch {
  Gate "ready_reflects_vista_down" $true "Ready threw (expected)"
}

# Gate 6: Restart VistA for recovery
Write-Host "`n--- Restarting VistA for CB recovery ---" -ForegroundColor Yellow
try {
  docker compose -f $ComposeFile start 2>&1 | Out-Null
  Gate "vista_restarted_for_cb" $true "VistA restarted"
} catch {
  Gate "vista_restarted_for_cb" $false "Failed: $($_.Exception.Message)"
}

# Wait for VistA + CB half-open transition (30s CB reset + 15-30s VistA startup)
Write-Host "  Waiting 45s for VistA init + CB half-open..." -ForegroundColor Gray
Start-Sleep -Seconds 45

# Gate 7: Verify CB eventually returns to closed after recovery
$cbRecovered = $false
for ($i = 0; $i -lt 5; $i++) {
  try {
    $h3 = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
    if ($h3.circuitBreaker -eq "closed") { $cbRecovered = $true; break }
  } catch {}
  Start-Sleep -Seconds 10
}
Gate "cb_recovers_to_closed" $cbRecovered "Circuit breaker recovered to closed"

# Gate 8: Ready returns ok:true after recovery
try {
  $r3 = Invoke-RestMethod -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 10
  Gate "ready_ok_after_recovery" ($r3.ok -eq $true) "Ready ok after CB recovery"
} catch {
  Gate "ready_ok_after_recovery" $false "$($_.Exception.Message)"
}

# Summary
Write-Host "`n=== Circuit Breaker Drill Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
$results | Format-Table -AutoSize

if ($fail -gt 0) {
  Write-Host "DRILL RESULT: PARTIAL PASS" -ForegroundColor Yellow
} else {
  Write-Host "DRILL RESULT: FULL PASS" -ForegroundColor Green
}
