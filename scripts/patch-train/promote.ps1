<#
.SYNOPSIS
    Patch train promotion script -- promotes VistA builds through candidate/staging/production.

.DESCRIPTION
    Phase 450 (W29-P4). Implements the 3-stage promotion pipeline from ADR-W29-VISTA-PATCH-TRAIN.
    Runs the appropriate gate checks before promoting, then updates the release manifest.

.PARAMETER From
    Source stage: candidate, staging

.PARAMETER To
    Target stage: staging, production

.PARAMETER TrainId
    Patch train identifier (e.g., "2025-03"). Auto-generates from current month if not provided.

.PARAMETER DryRun
    If set, runs gates but does not promote.

.PARAMETER SkipGates
    If set, skips gate checks (DANGER -- for emergency hot-patches only).

.EXAMPLE
    pwsh scripts/patch-train/promote.ps1 -From candidate -To staging
    pwsh scripts/patch-train/promote.ps1 -From staging -To production -TrainId 2025-03
#>

param(
    [Parameter(Mandatory)]
    [ValidateSet("candidate", "staging")]
    [string]$From,

    [Parameter(Mandatory)]
    [ValidateSet("staging", "production")]
    [string]$To,

    [string]$TrainId = (Get-Date -Format "yyyy-MM"),

    [switch]$DryRun,
    [switch]$SkipGates
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$artifactsDir = Join-Path $RepoRoot "artifacts" "patch-train" $TrainId

Write-Host "`n=== VistA Patch Train ===" -ForegroundColor Cyan
Write-Host "Train:     $TrainId"
Write-Host "Promote:   $From --> $To"
Write-Host "Dry-run:   $DryRun"
Write-Host ""

# ── Validate transition ─────────────────────────────────────────────
$validTransitions = @{
    "candidate->staging"    = $true
    "staging->production"   = $true
}
$transition = "$From->$To"
if (-not $validTransitions.ContainsKey($transition)) {
    Write-Host "ERROR: Invalid transition '$transition'. Valid: candidate->staging, staging->production" -ForegroundColor Red
    exit 1
}

# ── Ensure artifacts dir exists ──────────────────────────────────────
if (-not (Test-Path $artifactsDir)) { New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null }

# ── Run gate checks ─────────────────────────────────────────────────
$gateResults = @()
$allPassed = $true

if (-not $SkipGates) {
    $gateScript = Join-Path $PSScriptRoot "$From-gates.ps1"
    if (-not (Test-Path -LiteralPath $gateScript)) {
        Write-Host "ERROR: Gate script not found: $gateScript" -ForegroundColor Red
        exit 1
    }

    Write-Host "Running $From gates..." -ForegroundColor Yellow
    $gatesOutput = & $gateScript -TrainId $TrainId -RepoRoot $RepoRoot

    # Parse structured gate results (each gate returns a hashtable)
    foreach ($gate in $gatesOutput) {
        if ($gate -is [hashtable]) {
            $gateResults += $gate
            if (-not $gate.passed) { $allPassed = $false }
        }
    }

    # Save gate results
    $gateFile = Join-Path $artifactsDir "$From-gates-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $gateJson = @{
        trainId    = $TrainId
        stage      = $From
        runAt      = (Get-Date -Format "o")
        gates      = $gateResults
        allPassed  = $allPassed
    } | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($gateFile, $gateJson, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Gate results: $gateFile" -ForegroundColor Gray

    if (-not $allPassed) {
        Write-Host "`nGATE FAILURES -- promotion blocked." -ForegroundColor Red
        foreach ($g in ($gateResults | Where-Object { -not $_.passed })) {
            Write-Host "  FAIL: $($g.name) -- $($g.reason)" -ForegroundColor Red
        }
        exit 1
    }
    Write-Host "All gates passed." -ForegroundColor Green
} else {
    Write-Host "WARN: Gates skipped (--SkipGates)" -ForegroundColor Yellow
}

# ── Promote ──────────────────────────────────────────────────────────
if ($DryRun) {
    Write-Host "`n[DRY-RUN] Would promote $TrainId from $From to $To" -ForegroundColor Cyan
    exit 0
}

# Record promotion event
$promotionRecord = @{
    trainId     = $TrainId
    from        = $From
    to          = $To
    promotedAt  = (Get-Date -Format "o")
    promotedBy  = $env:USERNAME
    gatesPassed = $allPassed
    gatesSkipped = [bool]$SkipGates
}

$promFile = Join-Path $artifactsDir "promotion-$From-to-$To-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$promJson = $promotionRecord | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($promFile, $promJson, [System.Text.UTF8Encoding]::new($false))

Write-Host "`nPromotion recorded: $promFile" -ForegroundColor Green
Write-Host "=== $From --> $To COMPLETE ===" -ForegroundColor Cyan
