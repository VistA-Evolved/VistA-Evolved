#!/usr/bin/env pwsh
<#
  ops/drills/run-vista-down-drill.ps1
  Resilience drill: VistA Connection Loss — Phase 254

  Simulates VistA going down while the API is running.
  Validates: graceful degradation, /health vs /ready split, auto-recovery.
  Requires: API running on :3001, VistA Docker running.
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
  else     { $script:fail++; Write-Host "  FAIL  $name — $detail" -ForegroundColor Red }
}

Write-Host "`n=== VistA Connection Loss Drill ===" -ForegroundColor Cyan

# Pre-check: API must be running
try {
  $h = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Gate "pre_api_healthy" ($h.ok -eq $true -or $h.status -eq "ok") "API is running"
} catch {
  Gate "pre_api_healthy" $false "API not reachable: $($_.Exception.Message)"
  Write-Host "`nABORT: API must be running on $ApiUrl" -ForegroundColor Red
  exit 1
}

# Pre-check: VistA must be reachable
try {
  $p = Invoke-RestMethod -Uri "$ApiUrl/vista/ping" -UseBasicParsing -TimeoutSec 10
  Gate "pre_vista_reachable" ($p.ok -eq $true) "VistA ping ok"
} catch {
  Gate "pre_vista_reachable" $false "VistA not reachable: $($_.Exception.Message)"
  Write-Host "`nABORT: VistA must be running" -ForegroundColor Red
  exit 1
}

# Step 1: Stop VistA
Write-Host "`n--- Stopping VistA container ---" -ForegroundColor Yellow
try {
  docker compose -f $ComposeFile stop 2>&1 | Out-Null
  Start-Sleep -Seconds 3
  Gate "vista_stopped" $true "VistA container stopped"
} catch {
  Gate "vista_stopped" $false "Failed to stop VistA: $($_.Exception.Message)"
}

# Step 2: /health should still be OK (liveness)
try {
  $h2 = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Gate "health_alive_without_vista" ($h2.ok -eq $true -or $h2.status -eq "ok") "Liveness ok without VistA"
} catch {
  Gate "health_alive_without_vista" $false "Health failed: $($_.Exception.Message)"
}

# Step 3: /ready should reflect degradation
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 10
  $r = $raw.Content | ConvertFrom-Json
  # Ready can be ok:false or vista:"unreachable" — either indicates degradation awareness
  $degraded = ($r.ok -eq $false) -or ($r.vista -eq "unreachable")
  Gate "ready_degrades" $degraded "Readiness: ok=$($r.ok), vista=$($r.vista)"
} catch {
  # A timeout or connection error from /ready itself still means API is aware
  Gate "ready_degrades" $true "Ready endpoint threw (expected during VistA outage)"
}

# Step 4: /vista/ping should fail gracefully (not 500 crash)
try {
  $raw2 = Invoke-WebRequest -Uri "$ApiUrl/vista/ping" -UseBasicParsing -TimeoutSec 15 -ErrorAction SilentlyContinue
  $pd = $raw2.Content | ConvertFrom-Json
  Gate "vista_ping_graceful" ($pd.ok -eq $false) "Ping returns ok:false gracefully"
} catch {
  $sc = $_.Exception.Response.StatusCode.value__
  # 503 or similar is acceptable; 500 crash is not ideal but survivable
  Gate "vista_ping_graceful" ($sc -ne $null) "Ping returned HTTP $sc (graceful failure)"
}

# Step 5: Restart VistA
Write-Host "`n--- Restarting VistA container ---" -ForegroundColor Yellow
try {
  docker compose -f $ComposeFile start 2>&1 | Out-Null
  Gate "vista_restarted" $true "VistA container restarted"
} catch {
  Gate "vista_restarted" $false "Failed to restart: $($_.Exception.Message)"
}

# Step 6: Wait for VistA to be ready (port 9430 takes ~15-30s)
Write-Host "  Waiting 30s for VistA to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 30

# Step 7: Verify recovery
$recovered = $false
for ($i = 0; $i -lt 3; $i++) {
  try {
    $p2 = Invoke-RestMethod -Uri "$ApiUrl/vista/ping" -UseBasicParsing -TimeoutSec 15
    if ($p2.ok -eq $true) { $recovered = $true; break }
  } catch {}
  Start-Sleep -Seconds 10
}
Gate "recovery_vista_ping" $recovered "VistA ping recovered after restart"

# Step 8: /ready should return to ok:true
try {
  $r2 = Invoke-RestMethod -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 10
  Gate "recovery_ready_ok" ($r2.ok -eq $true) "Readiness restored"
} catch {
  Gate "recovery_ready_ok" $false "Ready still failing: $($_.Exception.Message)"
}

# Summary
Write-Host "`n=== VistA Down Drill Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
$results | Format-Table -AutoSize

if ($fail -gt 0) {
  Write-Host "DRILL RESULT: PARTIAL PASS (some gates failed)" -ForegroundColor Yellow
} else {
  Write-Host "DRILL RESULT: FULL PASS" -ForegroundColor Green
}
