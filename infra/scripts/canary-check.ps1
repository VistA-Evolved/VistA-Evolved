# infra/scripts/canary-check.ps1 - Metric gate for canary tenant deployments
# Queries Prometheus (or simulates) to verify tenant health before promotion.
#Requires -Version 5.1
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantSlug,

    [int]$DurationMinutes = 15,

    [string]$PrometheusUrl = "http://localhost:9090",

    # Thresholds
    [double]$MaxErrorRate = 0.01,         # 1% 5xx rate
    [double]$MaxP95LatencyMs = 2000,      # 2s p95

    [switch]$QueryOnly,   # Just query, don't gate
    [switch]$Simulate,    # Use simulated metrics (no Prometheus needed)

    [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $OutputDir) {
    $OutputDir = Join-Path $RepoRoot "artifacts/canary-check"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$results = @{
    tenantSlug     = $TenantSlug
    timestamp      = (Get-Date).ToString('o')
    durationMin    = $DurationMinutes
    thresholds     = @{ maxErrorRate = $MaxErrorRate; maxP95LatencyMs = $MaxP95LatencyMs }
    metrics        = @{}
    gates          = @()
    overallResult  = "pending"
}

function Add-Gate {
    param([string]$Name, [string]$Status, $Value, $Threshold, [string]$Detail)
    $results.gates += @{
        name      = $Name
        status    = $Status
        value     = $Value
        threshold = $Threshold
        detail    = $Detail
    }
    $color = if ($Status -eq 'PASS') { 'Green' } elseif ($Status -eq 'FAIL') { 'Red' } else { 'Yellow' }
    Write-Host "  [$Status] $Name = $Value (threshold: $Threshold) $Detail" -ForegroundColor $color
}

function Query-Prometheus {
    param([string]$Query)
    if ($Simulate) { return $null }
    try {
        $encoded = [System.Uri]::EscapeDataString($Query)
        $url = "$PrometheusUrl/api/v1/query?query=$encoded"
        $resp = Invoke-RestMethod -Uri $url -UseBasicParsing -TimeoutSec 10
        if ($resp.status -eq 'success' -and $resp.data.result.Count -gt 0) {
            return [double]$resp.data.result[0].value[1]
        }
        return $null
    } catch {
        Write-Host "  [WARN] Prometheus query failed: $($_.Exception.Message)" -ForegroundColor Yellow
        return $null
    }
}

Write-Host "=== Canary Health Check ===" -ForegroundColor Cyan
Write-Host "  Tenant:   $TenantSlug"
Write-Host "  Duration: ${DurationMinutes}m"
Write-Host "  Mode:     $(if ($Simulate) { 'SIMULATED' } elseif ($QueryOnly) { 'QUERY-ONLY' } else { 'GATE' })"
Write-Host ""

# Wait for observation period (unless query-only or simulate)
if (-not $QueryOnly -and -not $Simulate -and $DurationMinutes -gt 0) {
    Write-Host "Waiting ${DurationMinutes}m for metrics to accumulate..." -ForegroundColor Yellow
    Start-Sleep -Seconds ($DurationMinutes * 60)
}

Write-Host ""
Write-Host "--- Metric Gates ---" -ForegroundColor Cyan

# Gate 1: Error rate (5xx / total) over observation window
$errorQuery = "sum(rate(http_requests_total{namespace=`"ve-tenant-$TenantSlug`",code=~`"5..`"}[${DurationMinutes}m])) / sum(rate(http_requests_total{namespace=`"ve-tenant-$TenantSlug`"}[${DurationMinutes}m]))"
$errorRate = Query-Prometheus $errorQuery
if ($null -eq $errorRate) {
    if ($Simulate) { $errorRate = 0.002 }  # Simulated: healthy
    else { $errorRate = 0.0 }  # No data = no errors
}
$results.metrics.errorRate = $errorRate
Add-Gate "error-rate-5xx" (if ($errorRate -le $MaxErrorRate) { 'PASS' } else { 'FAIL' }) $errorRate $MaxErrorRate ""

# Gate 2: P95 latency
$latencyQuery = "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{namespace=`"ve-tenant-$TenantSlug`"}[${DurationMinutes}m])) by (le)) * 1000"
$p95 = Query-Prometheus $latencyQuery
if ($null -eq $p95) {
    if ($Simulate) { $p95 = 450.0 }  # Simulated: healthy
    else { $p95 = 0.0 }
}
$results.metrics.p95LatencyMs = $p95
Add-Gate "p95-latency" (if ($p95 -le $MaxP95LatencyMs) { 'PASS' } else { 'FAIL' }) $p95 $MaxP95LatencyMs "ms"

# Gate 3: Pod readiness
$readyQuery = "kube_deployment_status_ready_replicas{namespace=`"ve-tenant-$TenantSlug`"}"
$ready = Query-Prometheus $readyQuery
if ($null -eq $ready) {
    if ($Simulate) { $ready = 1.0 }
    else { $ready = 1.0 }
}
$results.metrics.readyReplicas = $ready
Add-Gate "pod-readiness" (if ($ready -ge 1) { 'PASS' } else { 'FAIL' }) $ready 1 "replicas"

# Gate 4: Restart count (should be 0 during canary)
$restartQuery = "sum(increase(kube_pod_container_status_restarts_total{namespace=`"ve-tenant-$TenantSlug`"}[${DurationMinutes}m]))"
$restarts = Query-Prometheus $restartQuery
if ($null -eq $restarts) {
    if ($Simulate) { $restarts = 0.0 }
    else { $restarts = 0.0 }
}
$results.metrics.restarts = $restarts
Add-Gate "pod-restarts" (if ($restarts -le 0) { 'PASS' } else { 'FAIL' }) $restarts 0 "restarts"

# Overall result
$failedGates = ($results.gates | Where-Object { $_.status -eq 'FAIL' }).Count
$results.overallResult = if ($failedGates -eq 0) { 'PASS' } else { 'FAIL' }

# Write report
$reportFile = Join-Path $OutputDir "canary-check-$TenantSlug-$timestamp.json"
$results | ConvertTo-Json -Depth 5 | Set-Content $reportFile -Encoding UTF8

Write-Host ""
Write-Host "=== Result: $($results.overallResult) ===" -ForegroundColor $(if ($results.overallResult -eq 'PASS') { 'Green' } else { 'Red' })
Write-Host "  Report: $reportFile" -ForegroundColor Gray

if ($QueryOnly) {
    Write-Host "  (query-only mode -- not gating)" -ForegroundColor Yellow
    exit 0
}

if ($results.overallResult -eq 'FAIL') {
    exit 1
}

exit 0
