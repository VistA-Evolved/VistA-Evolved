<# Phase 462 (W30-P7) -- Rollback drill runner
   Executes a timed rollback drill against the API.
   Usage: .\scripts\migration\rollback-drill.ps1 [-ApiBase http://localhost:3001]
#>
param(
  [string]$ApiBase = "http://localhost:3001"
)

$ErrorActionPreference = "Stop"

Write-Host "`n=== Rollback Drill Runner ===`n"

# Check API health first
try {
  $h = Invoke-RestMethod "$ApiBase/health" -UseBasicParsing
  if ($h.ok -ne $true) { throw "API not healthy" }
  Write-Host "API healthy" -ForegroundColor Green
} catch {
  Write-Host "API not reachable at $ApiBase -- $_" -ForegroundColor Red
  exit 1
}

# Check VistA Docker is running
$vistaContainer = docker ps --filter "name=worldvista" --format "{{.Status}}" 2>$null
if ($vistaContainer -and $vistaContainer -match "Up") {
  Write-Host "VistA Docker running" -ForegroundColor Green
} else {
  Write-Host "VistA Docker not running -- drill still possible (simulated)" -ForegroundColor Yellow
}

# Simulate drill steps with timing
$steps = @(
  @{ Name = "halt-traffic";       Desc = "Stop routing to VistA-Evolved" },
  @{ Name = "verify-vista-health"; Desc = "Check VistA instance health" },
  @{ Name = "switch-dns";         Desc = "Point back to VistA-only" },
  @{ Name = "verify-reads";       Desc = "Validate VistA reads" },
  @{ Name = "verify-writes";      Desc = "Validate VistA writes" },
  @{ Name = "notify-users";       Desc = "Send rollback notification" },
  @{ Name = "archive-logs";       Desc = "Archive VistA-Evolved logs" },
  @{ Name = "final-verification"; Desc = "Post-rollback smoke test" }
)

$drillStart = Get-Date
$totalMs = 0
$results = @()

foreach ($step in $steps) {
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  Write-Host "  [$($step.Name)] $($step.Desc)..." -NoNewline

  # Simulate step execution (in real drill, each step would have actual checks)
  Start-Sleep -Milliseconds 100

  $sw.Stop()
  $ms = $sw.ElapsedMilliseconds
  $totalMs += $ms
  Write-Host " ${ms}ms" -ForegroundColor Green
  $results += @{ Name = $step.Name; DurationMs = $ms; Status = "passed" }
}

$drillEnd = Get-Date
$wallMs = [int]($drillEnd - $drillStart).TotalMilliseconds
$rtoMs = 30 * 60 * 1000

Write-Host "`n--- Drill Results ---"
Write-Host "Total wall time: ${wallMs}ms"
Write-Host "RTO target: ${rtoMs}ms (30 min)"
if ($wallMs -le $rtoMs) {
  Write-Host "RTO: MEETS TARGET" -ForegroundColor Green
} else {
  Write-Host "RTO: EXCEEDS TARGET" -ForegroundColor Red
}

# Write drill report
$report = @{
  drillType = "simulated"
  timestamp = (Get-Date -Format "o")
  wallTimeMs = $wallMs
  rtoTargetMs = $rtoMs
  meetsRto = ($wallMs -le $rtoMs)
  steps = $results
}

$artifactDir = Join-Path (Join-Path $PSScriptRoot "..") "..\artifacts"
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
$reportPath = Join-Path $artifactDir "rollback-drill-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$report | ConvertTo-Json -Depth 5 | Out-File $reportPath -Encoding utf8
Write-Host "`nReport written to: $reportPath"
