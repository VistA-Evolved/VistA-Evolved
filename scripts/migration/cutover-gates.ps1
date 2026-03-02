<# Phase 461 (W30-P6) -- Cutover gate checks
   Pre-cutover and post-cutover validation gates.
   Usage: .\scripts\migration\cutover-gates.ps1 -Phase pre|post [-ApiBase http://localhost:3001]
#>
param(
  [Parameter(Mandatory)][ValidateSet("pre","post")][string]$Phase,
  [string]$ApiBase = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$Name, [scriptblock]$Check) {
  $script:total++
  try {
    $result = & $Check
    if ($result) {
      Write-Host "  PASS  $Name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $Name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $Name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Cutover Gates: $Phase ===`n"

if ($Phase -eq "pre") {
  Gate "API reachable" {
    $r = Invoke-RestMethod "$ApiBase/health" -UseBasicParsing -ErrorAction Stop
    $r.ok -eq $true
  }

  Gate "Migration health ready" {
    $r = Invoke-RestMethod "$ApiBase/migration/health" -UseBasicParsing -ErrorAction Stop
    $r.ok -eq $true -and $r.status -eq "ready"
  }

  Gate "Dual-run mode set" {
    $r = Invoke-RestMethod "$ApiBase/migration/dual-run/status" -UseBasicParsing -ErrorAction Stop
    $r.mode -ne "off"
  }

  Gate "Recon stats available" {
    $r = Invoke-RestMethod "$ApiBase/migration/recon/stats" -UseBasicParsing -ErrorAction Stop
    $r.ok -eq $true
  }

  Gate "VistA Docker healthy" {
    $c = docker ps --filter "name=worldvista" --format "{{.Status}}" 2>$null
    $c -and $c -match "Up"
  }
}

if ($Phase -eq "post") {
  Gate "API reachable" {
    $r = Invoke-RestMethod "$ApiBase/health" -UseBasicParsing -ErrorAction Stop
    $r.ok -eq $true
  }

  Gate "Migration health ready" {
    $r = Invoke-RestMethod "$ApiBase/migration/health" -UseBasicParsing -ErrorAction Stop
    $r.ok -eq $true
  }

  Gate "Patient list accessible" {
    $r = Invoke-RestMethod "$ApiBase/vista/default-patient-list" -UseBasicParsing -ErrorAction Stop
    $r.ok -eq $true
  }

  Gate "No open critical discrepancies" {
    $r = Invoke-RestMethod "$ApiBase/migration/recon/stats" -UseBasicParsing -ErrorAction Stop
    $r.openDiscrepancies -eq 0
  }
}

Write-Host "`n--- Results: $pass/$total passed ---"
if ($fail -gt 0) {
  Write-Host "CUTOVER GATE CHECK FAILED" -ForegroundColor Red
  exit 1
} else {
  Write-Host "ALL CUTOVER GATES PASSED" -ForegroundColor Green
}
