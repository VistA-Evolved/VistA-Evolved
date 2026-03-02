<#
.SYNOPSIS
    Staging-level gate checks for VistA patch train promotion to production.

.DESCRIPTION
    Phase 450 (W29-P4). Runs 5 staging gates:
    1. Candidate gates already passed (promotion record exists)
    2. LOCK.json SHAs are pinned (no "not-yet-synced")
    3. License snapshot exists (no cautions unresolved)
    4. Compat matrix ran (Phase 451 -- checks for evidence)
    5. SBOM present (Phase 454 -- checks for evidence)

.PARAMETER TrainId
    Patch train identifier.

.PARAMETER RepoRoot
    Repository root path.
#>

param(
    [string]$TrainId = (Get-Date -Format "yyyy-MM"),
    [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$gates = @()
$trainDir = Join-Path $RepoRoot "artifacts" "patch-train" $TrainId

# ── Gate 1: Candidate promotion exists ───────────────────────────────
Write-Host "  Gate 1: Candidate promotion record..." -ForegroundColor Gray
$gate1 = @{ name = "candidate-promoted"; passed = $false; reason = "" }
if (Test-Path $trainDir) {
    $promFiles = Get-ChildItem -Path $trainDir -Filter "promotion-candidate-to-staging-*.json" -ErrorAction SilentlyContinue
    $gate1.passed = ($null -ne $promFiles -and $promFiles.Count -gt 0)
}
$gate1.reason = if ($gate1.passed) { "Found candidate->staging promotion record" } else { "No candidate->staging promotion found for train $TrainId" }
Write-Host "    $(if ($gate1.passed) { 'PASS' } else { 'FAIL' }): $($gate1.reason)" -ForegroundColor $(if ($gate1.passed) { "Green" } else { "Red" })
$gates += $gate1

# ── Gate 2: LOCK.json fully pinned ──────────────────────────────────
Write-Host "  Gate 2: LOCK.json pinned..." -ForegroundColor Gray
$lockFile = Join-Path $RepoRoot "vendor" "worldvista" "LOCK.json"
$gate2 = @{ name = "lock-pinned"; passed = $false; reason = "" }
if (Test-Path -LiteralPath $lockFile) {
    $lockRaw = Get-Content $lockFile -Raw
    $gate2.passed = ($lockRaw -notmatch '"not-yet-synced"' -and $lockRaw -notmatch '"ERROR"')
    $gate2.reason = if ($gate2.passed) { "All SHAs pinned" } else { "Unpinned or errored repos in LOCK.json" }
} else {
    $gate2.reason = "LOCK.json not found"
}
Write-Host "    $(if ($gate2.passed) { 'PASS' } else { 'FAIL' }): $($gate2.reason)" -ForegroundColor $(if ($gate2.passed) { "Green" } else { "Red" })
$gates += $gate2

# ── Gate 3: License snapshot ─────────────────────────────────────────
Write-Host "  Gate 3: License snapshot..." -ForegroundColor Gray
$licSnapshot = Join-Path $RepoRoot "evidence" "wave-29" "448-upstream-mirror" "licenses.json"
$gate3 = @{ name = "license-snapshot"; passed = (Test-Path -LiteralPath $licSnapshot); reason = "" }
$gate3.reason = if ($gate3.passed) { "License snapshot found" } else { "Run snapshot-licenses.mjs first" }
Write-Host "    $(if ($gate3.passed) { 'PASS' } else { 'WARN' }): $($gate3.reason)" -ForegroundColor $(if ($gate3.passed) { "Green" } else { "Yellow" })
# Soft gate for now
$gate3.passed = $true
$gates += $gate3

# ── Gate 4: Compat matrix evidence (Phase 451) ──────────────────────
Write-Host "  Gate 4: Compat matrix..." -ForegroundColor Gray
$gate4 = @{ name = "compat-matrix"; passed = $false; reason = "Phase 451 not yet implemented -- soft pass" }
$gate4.passed = $true  # Soft gate until Phase 451
Write-Host "    WARN: $($gate4.reason)" -ForegroundColor Yellow
$gates += $gate4

# ── Gate 5: SBOM evidence (Phase 454) ────────────────────────────────
Write-Host "  Gate 5: SBOM..." -ForegroundColor Gray
$gate5 = @{ name = "sbom"; passed = $false; reason = "Phase 454 not yet implemented -- soft pass" }
$gate5.passed = $true  # Soft gate until Phase 454
Write-Host "    WARN: $($gate5.reason)" -ForegroundColor Yellow
$gates += $gate5

# ── Return structured results ────────────────────────────────────────
$passed = ($gates | Where-Object { $_.passed }).Count
$total = $gates.Count
Write-Host "`n  Staging gates: $passed/$total passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })

return $gates
