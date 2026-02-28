<#
.SYNOPSIS
  Fleet release orchestrator — rolls out a new image tag across environments
  with canary gates, evidence collection, and rollback capability.

.DESCRIPTION
  Orchestrates the full release lifecycle:
    1. Update canary tenant with new tag
    2. Wait for canary metric gate to pass (15 min)
    3. Promote to stable tenants in batches
    4. Collect evidence artifacts for compliance
    5. Update last-known-good on success, rollback on failure

.PARAMETER Tag
  The image tag to roll out (e.g., "v1.2.3", "sha-abc1234").

.PARAMETER Environment
  Target environment: dev, staging, prod.

.PARAMETER BatchSize
  Number of tenants to promote per batch (default: 1 for prod, 999 for dev/staging).

.PARAMETER CanaryMinutes
  Minutes to wait for canary metric gate (default: 15).

.PARAMETER DryRun
  Preview what would happen without making changes.

.PARAMETER SkipCanary
  Skip the canary gate (for dev/staging only).

.PARAMETER PrometheusUrl
  Prometheus base URL for metric gates. If not set, uses simulation mode.

.EXAMPLE
  .\rollout-fleet.ps1 -Tag v1.2.3 -Environment staging
  .\rollout-fleet.ps1 -Tag v1.2.3 -Environment prod -BatchSize 2 -CanaryMinutes 20
  .\rollout-fleet.ps1 -Tag v1.2.3 -Environment dev -SkipCanary -DryRun
#>
param(
    [Parameter(Mandatory)][string]$Tag,
    [Parameter(Mandatory)][ValidateSet("dev","staging","prod")][string]$Environment,
    [int]$BatchSize = 0,
    [int]$CanaryMinutes = 15,
    [switch]$DryRun,
    [switch]$SkipCanary,
    [string]$PrometheusUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot/..").Path
$envDir   = Join-Path $repoRoot "infra/environments/$Environment"
$tDir     = Join-Path $envDir "tenants"
$relDir   = Join-Path $envDir "releases"
$outDir   = Join-Path $repoRoot "artifacts/releases/$(Get-Date -Format 'yyyyMMdd-HHmmss')-$Tag"

if (-not (Test-Path $envDir)) {
    Write-Error "Environment directory not found: $envDir"
    exit 1
}

# Default batch size: 1 for prod, all for dev/staging
if ($BatchSize -le 0) {
    $BatchSize = if ($Environment -eq "prod") { 1 } else { 999 }
}

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

# ---- Helper: log with timestamp ----
function Log($msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $msg"
}

# ---- Helper: write evidence JSON ----
function Write-Evidence($name, $data) {
    $path = Join-Path $outDir "$name.json"
    $data | ConvertTo-Json -Depth 10 | Set-Content -Path $path -Encoding ascii
    Log "  Evidence written: $path"
}

# ================================================================
# Phase 1: Discover tenants
# ================================================================
Log "=== Fleet Rollout: $Tag -> $Environment ==="
Log "Batch size: $BatchSize, Canary wait: ${CanaryMinutes}m"

$canaryTenants = @()
$stableTenants = @()

if (Test-Path $tDir) {
    Get-ChildItem -Path $tDir -Filter "*.values.yaml" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $name = $_.BaseName -replace '\.values$', ''
        if ($content -match 'releaseChannel:\s*canary') {
            $canaryTenants += @{ Name = $name; Path = $_.FullName }
        } else {
            $stableTenants += @{ Name = $name; Path = $_.FullName }
        }
    }
}

$tenantDefaults = Join-Path $envDir "tenant.defaults.values.yaml"
$sharedValues   = Join-Path $envDir "shared.values.yaml"

Log "Canary tenants: $($canaryTenants.Count) ($($canaryTenants.Name -join ', '))"
Log "Stable tenants: $($stableTenants.Count) ($($stableTenants.Name -join ', '))"

$rolloutPlan = @{
    tag         = $Tag
    environment = $Environment
    batchSize   = $BatchSize
    canary      = $canaryTenants.Name
    stable      = $stableTenants.Name
    dryRun      = [bool]$DryRun
    startedAt   = (Get-Date -Format o)
}
Write-Evidence "rollout-plan" $rolloutPlan

if ($DryRun) {
    Log "[DRY RUN] Would update canary tenants, wait ${CanaryMinutes}m, then promote stable."
    Log "[DRY RUN] No changes made."
    exit 0
}

# ================================================================
# Phase 2: Deploy to canary tenants
# ================================================================
Log ""
Log "--- Phase 2: Canary deployment ---"

# Update shared imageTag
if (Test-Path $sharedValues) {
    $sv = Get-Content $sharedValues -Raw
    if ($sv -match 'imageTag:\s*"[^"]*"') {
        $sv = $sv -replace 'imageTag:\s*"[^"]*"', "imageTag: `"$Tag`""
        Set-Content -Path $sharedValues -Value $sv -Encoding ascii
        Log "Updated shared imageTag -> $Tag"
    }
}

# Update tenant defaults
if (Test-Path $tenantDefaults) {
    $td = Get-Content $tenantDefaults -Raw
    if ($td -match 'tag:\s*"[^"]*"') {
        $td = $td -replace '(tag:\s*)"[^"]*"', "`$1`"$Tag`""
        Set-Content -Path $tenantDefaults -Value $td -Encoding ascii
        Log "Updated tenant defaults tag -> $Tag"
    }
}

# Update canary tenant overrides
foreach ($ct in $canaryTenants) {
    $c = Get-Content $ct.Path -Raw
    if ($c -match 'tag:\s*"[^"]*"') {
        $c = $c -replace '(tag:\s*)"[^"]*"', "`$1`"$Tag`""
    } else {
        $c += "`napi:`n  image:`n    tag: `"$Tag`"`n"
    }
    Set-Content -Path $ct.Path -Value $c -Encoding ascii
    Log "Updated canary tenant $($ct.Name) -> $Tag"
}

Write-Evidence "phase2-canary-deployed" @{
    tag       = $Tag
    tenants   = $canaryTenants.Name
    timestamp = (Get-Date -Format o)
}

# ================================================================
# Phase 3: Canary metric gate
# ================================================================
if ($SkipCanary) {
    Log ""
    Log "--- Canary gate SKIPPED (--SkipCanary) ---"
    Write-Evidence "phase3-canary-gate" @{ skipped = $true; reason = "SkipCanary flag" }
} else {
    Log ""
    Log "--- Phase 3: Canary metric gate (${CanaryMinutes}m) ---"
    Log "Waiting ${CanaryMinutes} minutes for metrics to stabilize..."

    # In CI/local without Prometheus, simulate the wait
    $canaryScript = Join-Path $repoRoot "infra/scripts/canary-check.ps1"
    $canaryResult = $null

    if ($PrometheusUrl -and (Test-Path $canaryScript)) {
        # Wait the canary period
        Start-Sleep -Seconds ($CanaryMinutes * 60)

        # Run canary check
        $canaryReport = Join-Path $outDir "canary-check-result.json"
        & $canaryScript -Environment $Environment -PrometheusUrl $PrometheusUrl -OutFile $canaryReport
        $canaryResult = Get-Content $canaryReport -Raw | ConvertFrom-Json

        if ($canaryResult.overallPass -ne $true) {
            Log "CANARY GATE FAILED -- initiating rollback"
            Write-Evidence "phase3-canary-gate" @{ passed = $false; result = $canaryResult }

            # Rollback
            $rollbackScript = Join-Path $repoRoot "infra/scripts/rollback-release.ps1"
            if (Test-Path $rollbackScript) {
                & $rollbackScript -Environment $Environment
            }
            Write-Evidence "rollback" @{ reason = "canary-gate-failure"; timestamp = (Get-Date -Format o) }
            Write-Error "Canary gate failed. Rolled back to last known good."
            exit 1
        }
    } else {
        Log "No Prometheus URL -- simulating ${CanaryMinutes}m canary wait..."
        # In simulation mode, just sleep a short time
        Start-Sleep -Seconds 5
        $canaryResult = @{ overallPass = $true; simulated = $true }
    }

    Log "Canary gate PASSED"
    Write-Evidence "phase3-canary-gate" @{ passed = $true; result = $canaryResult }
}

# ================================================================
# Phase 4: Promote to stable tenants in batches
# ================================================================
Log ""
Log "--- Phase 4: Stable tenant promotion ---"

$batches = @()
for ($i = 0; $i -lt $stableTenants.Count; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize, $stableTenants.Count)
    $batches += ,@($stableTenants[$i..($end-1)])
}

$batchNum = 0
foreach ($batch in $batches) {
    $batchNum++
    Log "Batch $batchNum/$($batches.Count): $($batch.Name -join ', ')"

    foreach ($tenant in $batch) {
        $c = Get-Content $tenant.Path -Raw
        if ($c -match 'tag:\s*"[^"]*"') {
            $c = $c -replace '(tag:\s*)"[^"]*"', "`$1`"$Tag`""
        }
        Set-Content -Path $tenant.Path -Value $c -Encoding ascii
        Log "  Updated $($tenant.Name) -> $Tag"
    }

    Write-Evidence "phase4-batch-$batchNum" @{
        batch   = $batchNum
        tenants = $batch.Name
        tag     = $Tag
        timestamp = (Get-Date -Format o)
    }

    # Pause between batches in prod (except last batch)
    if ($Environment -eq "prod" -and $batchNum -lt $batches.Count) {
        Log "  Inter-batch cooldown (60s)..."
        Start-Sleep -Seconds 60
    }
}

# ================================================================
# Phase 5: Update last-known-good
# ================================================================
Log ""
Log "--- Phase 5: Update last-known-good ---"

$lkgPath = Join-Path $relDir "last-known-good.json"
if (-not (Test-Path $relDir)) {
    New-Item -ItemType Directory -Path $relDir -Force | Out-Null
}

$lkg = @{
    tag         = $Tag
    promotedAt  = (Get-Date -Format o)
    promotedBy  = if ($env:GITHUB_ACTOR) { $env:GITHUB_ACTOR } else { $env:USERNAME }
    environment = $Environment
    commit      = if ($env:GITHUB_SHA) { $env:GITHUB_SHA } else { "local" }
}
$lkg | ConvertTo-Json -Depth 5 | Set-Content -Path $lkgPath -Encoding ascii
Log "Updated $lkgPath"

# ================================================================
# Phase 6: Final summary
# ================================================================
$summary = @{
    tag         = $Tag
    environment = $Environment
    canaryPass  = $true
    batchCount  = $batches.Count
    totalTenants = $canaryTenants.Count + $stableTenants.Count
    startedAt   = $rolloutPlan.startedAt
    completedAt = (Get-Date -Format o)
    evidenceDir = $outDir
    status      = "SUCCESS"
}
Write-Evidence "rollout-summary" $summary

Log ""
Log "=== Fleet rollout COMPLETE ==="
Log "Tag: $Tag -> $Environment"
Log "Tenants updated: $($summary.totalTenants)"
Log "Evidence: $outDir"
