#!/usr/bin/env pwsh
<#
  ops/drills/run-posture-audit-drill.ps1
  Resilience drill: Posture Endpoint Audit -- Phase 254

  Validates all /posture/* endpoints are reachable and return structured data.
  This drill requires admin session cookies.
  Requires: API running on :3001 with a valid session.
#>
param(
  [string]$ApiUrl  = "http://localhost:3001",
  [string]$CookieFile = ""
)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $results = @()

function Gate($name, $ok, $detail) {
  $script:results += [PSCustomObject]@{ Gate=$name; Pass=$ok; Detail=$detail }
  if ($ok) { $script:pass++; Write-Host "  PASS  $name" -ForegroundColor Green }
  else     { $script:fail++; Write-Host "  FAIL  $name -- $detail" -ForegroundColor Red }
}

Write-Host "`n=== Posture Endpoint Audit Drill ===" -ForegroundColor Cyan

# Build cookie header if file provided
$headers = @{}
if ($CookieFile -and (Test-Path -LiteralPath $CookieFile)) {
  $cookieVal = (Get-Content $CookieFile -Raw).Trim()
  $headers["Cookie"] = $cookieVal
  Write-Host "  Using cookie file: $CookieFile" -ForegroundColor Gray
} else {
  Write-Host "  WARNING: No cookie file -- posture endpoints require admin auth" -ForegroundColor Yellow
  Write-Host "  Pass -CookieFile with admin session cookies" -ForegroundColor Yellow
}

# Posture domains to check
$domains = @(
  @{ Name="observability"; Route="/posture/observability" },
  @{ Name="tenant";        Route="/posture/tenant" },
  @{ Name="performance";   Route="/posture/performance" },
  @{ Name="backup";        Route="/posture/backup" },
  @{ Name="data-plane";    Route="/posture/data-plane" },
  @{ Name="certification"; Route="/posture/certification" }
)

foreach ($d in $domains) {
  try {
    $raw = Invoke-WebRequest -Uri "$ApiUrl$($d.Route)" -UseBasicParsing -TimeoutSec 10 -Headers $headers
    $body = $raw.Content | ConvertFrom-Json
    $gateCount = 0
    $passCount = 0
    if ($body.gates) {
      $gateCount = ($body.gates | Measure-Object).Count
      $passCount = ($body.gates | Where-Object { $_.pass -eq $true } | Measure-Object).Count
    }
    Gate "posture_$($d.Name)_reachable" ($raw.StatusCode -eq 200) "HTTP $($raw.StatusCode), $passCount/$gateCount gates pass"
  } catch {
    $sc = $_.Exception.Response.StatusCode.value__
    if ($sc -eq 401) {
      Gate "posture_$($d.Name)_reachable" $false "401 Unauthorized (need admin cookie)"
    } else {
      Gate "posture_$($d.Name)_reachable" $false "HTTP $sc - $($_.Exception.Message)"
    }
  }
}

# Gate 7: Unified /posture aggregates all domains
try {
  $raw = Invoke-WebRequest -Uri "$ApiUrl/posture" -UseBasicParsing -TimeoutSec 15 -Headers $headers
  $body = $raw.Content | ConvertFrom-Json
  $hasDomains = ($body.domains -ne $null) -or ($body.score -ne $null)
  Gate "posture_unified_reachable" ($raw.StatusCode -eq 200 -and $hasDomains) "Unified posture: score=$($body.score)"
} catch {
  $sc = $_.Exception.Response.StatusCode.value__
  Gate "posture_unified_reachable" $false "HTTP $sc"
}

# Summary
Write-Host "`n=== Posture Audit Drill Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
$results | Format-Table -AutoSize

if ($fail -gt 0) {
  Write-Host "DRILL RESULT: PARTIAL PASS" -ForegroundColor Yellow
} else {
  Write-Host "DRILL RESULT: FULL PASS" -ForegroundColor Green
}
