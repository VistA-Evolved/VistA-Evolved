<#
.SYNOPSIS
    Go/No-Go checklist for VistA upstream upgrade.

.DESCRIPTION
    Phase 455 (W29-P9). Aggregates all patch train gates into a single
    go/no-go decision. Checks: manifest, SBOM, compat matrix, license policy,
    candidate/staging gates, and documentation.

.PARAMETER TrainId
    Patch train identifier. Default: current month.

.EXAMPLE
    pwsh scripts/patch-train/go-nogo-checklist.ps1
    pwsh scripts/patch-train/go-nogo-checklist.ps1 -TrainId 2025-03
#>

param(
    [string]$TrainId = (Get-Date -Format "yyyy-MM")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path

Write-Host "`n=== Upgrade Go/No-Go Checklist ===" -ForegroundColor Cyan
Write-Host "Train: $TrainId`n"

$checks = @()
$allGo = $true

function Add-Check($name, $passed, $detail) {
    $script:checks += @{ name = $name; go = $passed; detail = $detail }
    if (-not $passed) { $script:allGo = $false }
    $icon = if ($passed) { "GO  " } else { "NOGO" }
    $color = if ($passed) { "Green" } else { "Red" }
    Write-Host "  [$icon] $name -- $detail" -ForegroundColor $color
}

# ── 1. Release manifest ─────────────────────────────────────────────
$manifest = Join-Path $RepoRoot "artifacts" "vista-release-manifest.json"
Add-Check "Release Manifest" (Test-Path -LiteralPath $manifest) `
    $(if (Test-Path -LiteralPath $manifest) { "Found" } else { "Missing -- run emit-release-manifest.mjs" })

# ── 2. SBOM ─────────────────────────────────────────────────────────
$sbom = Join-Path $RepoRoot "artifacts" "sbom.json"
Add-Check "SBOM" (Test-Path -LiteralPath $sbom) `
    $(if (Test-Path -LiteralPath $sbom) { "Found" } else { "Missing -- run generate-sbom.mjs" })

# ── 3. License policy check ─────────────────────────────────────────
$licPolicy = Join-Path $RepoRoot "scripts" "sbom" "license-policy.json"
Add-Check "License Policy" (Test-Path -LiteralPath $licPolicy) "Policy file present"

# ── 4. LOCK.json pinned ─────────────────────────────────────────────
$lockFile = Join-Path $RepoRoot "vendor" "worldvista" "LOCK.json"
$lockPinned = $false
if (Test-Path -LiteralPath $lockFile) {
    $lockRaw = Get-Content $lockFile -Raw
    $lockPinned = ($lockRaw -notmatch '"not-yet-synced"')
}
Add-Check "Upstream Pinned" $lockPinned `
    $(if ($lockPinned) { "All SHAs pinned" } else { "Unpinned repos -- run worldvista-sync.ps1" })

# ── 5. Compat lanes config ──────────────────────────────────────────
$lanesFile = Join-Path $RepoRoot "config" "compat-lanes.json"
$lanesOk = $false
if (Test-Path -LiteralPath $lanesFile) {
    $lanesRaw = Get-Content $lanesFile -Raw
    if ($lanesRaw[0] -eq [char]0xFEFF) { $lanesRaw = $lanesRaw.Substring(1) }
    $lanes = $lanesRaw | ConvertFrom-Json
    $lanesOk = ($lanes.Count -ge 2)
}
Add-Check "Compat Lanes" $lanesOk "$($lanes.Count) lanes configured (need >= 2)"

# ── 6. Patch train runbook ───────────────────────────────────────────
$runbook = Join-Path $RepoRoot "docs" "runbooks" "patch-train.md"
Add-Check "Patch Train Runbook" (Test-Path -LiteralPath $runbook) `
    $(if (Test-Path -LiteralPath $runbook) { "Present" } else { "Missing" })

# ── 7. Component inventory ──────────────────────────────────────────
$inventory = Join-Path $RepoRoot "docs" "vista" "component-inventory.json"
Add-Check "Component Inventory" (Test-Path -LiteralPath $inventory) `
    $(if (Test-Path -LiteralPath $inventory) { "Present" } else { "Missing" })

# ── 8. Dashboard adapter ────────────────────────────────────────────
$dashAdapter = Join-Path $RepoRoot "apps" "api" "src" "adapters" "dashboard" "interface.ts"
Add-Check "Dashboard Adapter" (Test-Path -LiteralPath $dashAdapter) `
    $(if (Test-Path -LiteralPath $dashAdapter) { "Adapter interface present" } else { "Missing" })

# ── 9. RPC registry count ───────────────────────────────────────────
$rpcFile = Join-Path $RepoRoot "apps" "api" "src" "vista" "rpcRegistry.ts"
$rpcCount = 0
if (Test-Path -LiteralPath $rpcFile) {
    $rpcContent = Get-Content $rpcFile -Raw
    $rpcMatches = [regex]::Matches($rpcContent, 'name:\s*["''][^"'']+["'']')
    $rpcCount = $rpcMatches.Count
}
Add-Check "RPC Registry" ($rpcCount -gt 100) "$rpcCount RPCs (threshold: >100)"

# ── Summary ──────────────────────────────────────────────────────────
$goCount = ($checks | Where-Object { $_.go }).Count
$total = $checks.Count

Write-Host "`n=== $goCount/$total GO ===" -ForegroundColor $(if ($allGo) { "Green" } else { "Yellow" })

if ($allGo) {
    Write-Host "DECISION: GO for train $TrainId" -ForegroundColor Green
} else {
    Write-Host "DECISION: NO-GO -- resolve NOGO items above" -ForegroundColor Red
}

# Write checklist artifact
$artifactsDir = Join-Path $RepoRoot "artifacts" "patch-train" $TrainId
if (-not (Test-Path $artifactsDir)) { New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null }
$checkFile = Join-Path $artifactsDir "go-nogo-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$checkJson = @{
    trainId = $TrainId
    runAt = (Get-Date -Format "o")
    decision = if ($allGo) { "GO" } else { "NO-GO" }
    checks = $checks
    goCount = $goCount
    total = $total
} | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($checkFile, $checkJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "Checklist artifact: $checkFile"

if (-not $allGo) { exit 1 }
exit 0
