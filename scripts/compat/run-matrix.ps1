<#
.SYNOPSIS
    Compatibility matrix runner -- probes multiple VistA lanes and produces evidence.

.DESCRIPTION
    Phase 451 (W29-P5). Reads config/compat-lanes.json, runs lane-probe.mjs
    against each lane, aggregates results to artifacts/compat-matrix-<timestamp>.json.

.PARAMETER LanesFile
    Path to lanes config JSON. Default: config/compat-lanes.json

.PARAMETER OnlyReachable
    If set, only fail if zero lanes are reachable (useful when not all lanes are running).

.EXAMPLE
    pwsh scripts/compat/run-matrix.ps1
    pwsh scripts/compat/run-matrix.ps1 -OnlyReachable
#>

param(
    [string]$LanesFile = "",
    [switch]$OnlyReachable
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $LanesFile) { $LanesFile = Join-Path $RepoRoot "config" "compat-lanes.json" }

Write-Host "`n=== Compatibility Matrix ===" -ForegroundColor Cyan

# ── Load lanes ──────────────────────────────────────────────────────
if (-not (Test-Path -LiteralPath $LanesFile)) {
    Write-Host "ERROR: Lanes file not found: $LanesFile" -ForegroundColor Red
    exit 1
}
$lanesRaw = Get-Content $LanesFile -Raw
# Strip BOM
if ($lanesRaw[0] -eq [char]0xFEFF) { $lanesRaw = $lanesRaw.Substring(1) }
$lanes = $lanesRaw | ConvertFrom-Json

Write-Host "Lanes: $($lanes.Count)"

$probeScript = Join-Path $PSScriptRoot "lane-probe.mjs"
if (-not (Test-Path -LiteralPath $probeScript)) {
    Write-Host "ERROR: lane-probe.mjs not found at $probeScript" -ForegroundColor Red
    exit 1
}

# ── Probe each lane ─────────────────────────────────────────────────
$results = @()
$reachableCount = 0

foreach ($lane in $lanes) {
    Write-Host "`n--- $($lane.label) ($($lane.host):$($lane.port)) ---" -ForegroundColor Yellow

    try {
        $output = node $probeScript --host $lane.host --port $lane.port --id $lane.id 2>&1
        $probeResult = $output | ConvertFrom-Json
        if ($probeResult.passed) { $reachableCount++ }
        Write-Host "  TCP: $(if ($probeResult.tcpReachable) { 'OK' } else { 'FAIL' })" -ForegroundColor $(if ($probeResult.tcpReachable) { "Green" } else { "Red" })
        if ($probeResult.bannerSnippet) {
            Write-Host "  Banner: $($probeResult.bannerSnippet)" -ForegroundColor Gray
        }
        $results += $probeResult
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results += @{
            laneId = $lane.id
            host = $lane.host
            port = $lane.port
            tcpReachable = $false
            passed = $false
            error = $_.Exception.Message
        }
    }
}

# ── Write artifacts ──────────────────────────────────────────────────
$artifactsDir = Join-Path $RepoRoot "artifacts"
if (-not (Test-Path $artifactsDir)) { New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null }

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$matrixFile = Join-Path $artifactsDir "compat-matrix-$ts.json"

$matrix = @{
    generatedAt    = (Get-Date -Format "o")
    generatedBy    = "run-matrix.ps1"
    lanesTotal     = $lanes.Count
    lanesReachable = $reachableCount
    allPassed      = ($reachableCount -eq $lanes.Count)
    lanes          = $results
}

$matrixJson = $matrix | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($matrixFile, $matrixJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "`n=== Matrix Results: $reachableCount/$($lanes.Count) reachable ===" -ForegroundColor $(if ($reachableCount -gt 0) { "Green" } else { "Red" })
Write-Host "Output: $matrixFile"

if ($OnlyReachable) {
    if ($reachableCount -eq 0) { exit 1 }
    exit 0
}

if ($reachableCount -lt $lanes.Count) { exit 1 }
exit 0
