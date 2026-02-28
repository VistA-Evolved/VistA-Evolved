# tests/k6/run-campaign.ps1 - Run the full load test campaign
#
# Phase 289: Orchestrates sustained + spike + soak tests in sequence.
#
# Usage:
#   .\tests\k6\run-campaign.ps1                          # all 3 scenarios
#   .\tests\k6\run-campaign.ps1 -Scenario sustained      # single scenario
#   .\tests\k6\run-campaign.ps1 -ApiUrl http://staging:3001
#   .\tests\k6\run-campaign.ps1 -SkipSoak                # skip the long soak test
#
# Prerequisites:
#   - k6 installed (choco install k6)
#   - API + VistA Docker running

#Requires -Version 5.1
param(
    [string]$ApiUrl = "http://localhost:3001",
    [ValidateSet("all", "sustained", "spike", "soak")]
    [string]$Scenario = "all",
    [switch]$SkipSoak,
    [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $OutputDir) {
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $OutputDir = Join-Path $PSScriptRoot "results/$timestamp"
}

Write-Host "=== VistA-Evolved Load Test Campaign ===" -ForegroundColor Cyan
Write-Host "  API:       $ApiUrl"
Write-Host "  Scenario:  $Scenario"
Write-Host "  Output:    $OutputDir"
Write-Host ""

# Pre-flight
if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: k6 not found. Install: choco install k6" -ForegroundColor Red
    exit 1
}

# Check API is reachable
try {
    $health = Invoke-WebRequest -Uri "$ApiUrl/health" -UseBasicParsing -TimeoutSec 5
    if ($health.StatusCode -ne 200) {
        Write-Host "WARNING: API /health returned $($health.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: API not reachable at $ApiUrl/health -- tests may fail" -ForegroundColor Yellow
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$results = @()

function RunScenario($name, $script) {
    Write-Host ""
    Write-Host "--- Running: $name ---" -ForegroundColor Green
    $jsonOut = Join-Path $OutputDir "$name.json"
    $summaryOut = Join-Path $OutputDir "$name-summary.json"

    $startTime = Get-Date
    k6 run `
        -e "API_URL=$ApiUrl" `
        --out "json=$jsonOut" `
        --summary-export "$summaryOut" `
        $script

    $exitCode = $LASTEXITCODE
    $duration = (Get-Date) - $startTime

    $status = if ($exitCode -eq 0) { "PASS" } else { "FAIL" }
    $color = if ($exitCode -eq 0) { "Green" } else { "Red" }

    Write-Host "  $name`: $status (exit $exitCode, duration $($duration.ToString('mm\:ss')))" -ForegroundColor $color

    $script:results += @{
        name = $name
        status = $status
        exitCode = $exitCode
        durationSec = [math]::Round($duration.TotalSeconds)
        summaryFile = $summaryOut
    }
}

$testsDir = $PSScriptRoot

if ($Scenario -eq "all" -or $Scenario -eq "sustained") {
    RunScenario "sustained" (Join-Path $testsDir "prod-sustained.js")
}

if ($Scenario -eq "all" -or $Scenario -eq "spike") {
    RunScenario "spike" (Join-Path $testsDir "prod-spike.js")
}

if (($Scenario -eq "all" -or $Scenario -eq "soak") -and -not $SkipSoak) {
    RunScenario "soak" (Join-Path $testsDir "prod-soak.js")
}

# Summary
Write-Host ""
Write-Host "=== Campaign Summary ===" -ForegroundColor Cyan
$totalPass = ($results | Where-Object { $_.status -eq "PASS" }).Count
$totalFail = ($results | Where-Object { $_.status -eq "FAIL" }).Count
$totalRun = $results.Count

foreach ($r in $results) {
    $color = if ($r.status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "  $($r.name): $($r.status) ($($r.durationSec)s)" -ForegroundColor $color
}

Write-Host ""
Write-Host "Results: $totalPass/$totalRun passed" -ForegroundColor $(if ($totalFail -eq 0) { 'Green' } else { 'Red' })
Write-Host "Output:  $OutputDir" -ForegroundColor Gray

# Write campaign summary JSON
$campaignSummary = @{
    timestamp = (Get-Date -Format "o")
    apiUrl = $ApiUrl
    scenario = $Scenario
    results = $results
    totalPass = $totalPass
    totalFail = $totalFail
} | ConvertTo-Json -Depth 5

$campaignSummary | Set-Content (Join-Path $OutputDir "campaign-summary.json") -Encoding UTF8

exit $totalFail
