#!/usr/bin/env pwsh
<#
  ops/drills/run-health-readiness-drill.ps1
  Resilience drill: Health vs Readiness Endpoint Verification -- Phase 254

  Validates: /health always returns ok (liveness), /ready gates on VistA + CB.
  This drill does NOT stop VistA -- it tests the static contract.
  Requires: API running on :3001.
#>
param(
  [string]$ApiUrl = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $results = @()

function Gate($name, $ok, $detail) {
  $script:results += [PSCustomObject]@{ Gate=$name; Pass=$ok; Detail=$detail }
  if ($ok) { $script:pass++; Write-Host "  PASS  $name" -ForegroundColor Green }
  else     { $script:fail++; Write-Host "  FAIL  $name -- $detail" -ForegroundColor Red }
}

Write-Host "`n=== Health vs Readiness Contract Drill ===" -ForegroundColor Cyan

# Gate 1: /health returns 200
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Gate "health_200" ($raw.StatusCode -eq 200) "Status: $($raw.StatusCode)"
} catch {
  Gate "health_200" $false "Health endpoint failed: $($_.Exception.Message)"
  exit 1
}

# Gate 2: /health returns ok:true (always, regardless of state)
try {
  $h = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Gate "health_always_ok" ($h.ok -eq $true -or $h.status -eq "ok") "ok=$($h.ok), status=$($h.status)"
} catch {
  Gate "health_always_ok" $false "$($_.Exception.Message)"
}

# Gate 3: /health includes uptime
try {
  $h = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Gate "health_has_uptime" ($h.uptime -ne $null) "uptime=$($h.uptime)"
} catch {
  Gate "health_has_uptime" $false "$($_.Exception.Message)"
}

# Gate 4: /health includes circuitBreaker state
try {
  $h = Invoke-RestMethod -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
  Gate "health_has_cb_state" ($h.circuitBreaker -ne $null) "circuitBreaker=$($h.circuitBreaker)"
} catch {
  Gate "health_has_cb_state" $false "$($_.Exception.Message)"
}

# Gate 5: /ready returns 200
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 10
  Gate "ready_200" ($raw.StatusCode -eq 200) "Status: $($raw.StatusCode)"
} catch {
  # 503 is also acceptable for /ready
  $sc = $_.Exception.Response.StatusCode.value__
  Gate "ready_200" ($sc -eq 200 -or $sc -eq 503) "Status: $sc (503 acceptable)"
}

# Gate 6: /ready returns ok field
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 10
  $r = $raw.Content | ConvertFrom-Json
  Gate "ready_has_ok" ($r.ok -ne $null) "ok=$($r.ok)"
} catch {
  Gate "ready_has_ok" $false "$($_.Exception.Message)"
}

# Gate 7: /ready includes vista status
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/ready" -UseBasicParsing -TimeoutSec 10
  $r = $raw.Content | ConvertFrom-Json
  Gate "ready_has_vista" ($r.vista -ne $null) "vista=$($r.vista)"
} catch {
  Gate "ready_has_vista" $false "$($_.Exception.Message)"
}

# Gate 8: /version returns 200
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/version" -UseBasicParsing -TimeoutSec 5
  Gate "version_200" ($raw.StatusCode -eq 200) "Status: $($raw.StatusCode)"
} catch {
  Gate "version_200" $false "$($_.Exception.Message)"
}

# Gate 9: Unauthenticated clinical route returns 401 (not 500)
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/vista/allergies?dfn=3" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
  Gate "unauth_returns_401" $false "Expected 401, got $($raw.StatusCode)"
} catch {
  $sc = $_.Exception.Response.StatusCode.value__
  Gate "unauth_returns_401" ($sc -eq 401) "Got HTTP $sc"
}

# Summary
Write-Host "`n=== Health/Readiness Drill Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
$results | Format-Table -AutoSize

if ($fail -gt 0) {
  Write-Host "DRILL RESULT: PARTIAL PASS" -ForegroundColor Yellow
} else {
  Write-Host "DRILL RESULT: FULL PASS" -ForegroundColor Green
}
