<#
.SYNOPSIS
    Wave 29 verifier -- confirms all 9 W29 phases (447-455) are committed.

.DESCRIPTION
    Phase 455 (W29-P9). Checks that each W29 phase has prompt files and
    key deliverables present.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host "`n=== Wave 29 Verifier ===" -ForegroundColor Cyan

$phases = @(
    @{ id = 447; slug = "RESERVATION-ADRS"; key = "docs/adrs/ADR-W29-VISTA-UPSTREAM-SOURCE.md" }
    @{ id = 448; slug = "UPSTREAM-MIRROR"; key = "scripts/upstream/worldvista-sync.ps1" }
    @{ id = 449; slug = "RELEASE-MANIFEST"; key = "docs/vista/VISTA_RELEASE_MANIFEST.schema.json" }
    @{ id = 450; slug = "PATCH-TRAIN"; key = "scripts/patch-train/promote.ps1" }
    @{ id = 451; slug = "COMPAT-MATRIX"; key = "scripts/compat/run-matrix.ps1" }
    @{ id = 452; slug = "HARVEST-ADRS"; key = "docs/vista/component-inventory.json" }
    @{ id = 453; slug = "DASHBOARD-INTEGRATION"; key = "apps/api/src/adapters/dashboard/interface.ts" }
    @{ id = 454; slug = "SBOM-LICENSE"; key = "scripts/sbom/generate-sbom.mjs" }
    @{ id = 455; slug = "UPGRADE-GONOGO"; key = "scripts/patch-train/go-nogo-checklist.ps1" }
)

$pass = 0
$fail = 0

foreach ($p in $phases) {
    $promptDir = Join-Path (Join-Path $RepoRoot "prompts") "$($p.id)-PHASE-$($p.id)-$($p.slug)"
    $implFile = Join-Path $promptDir "$($p.id)-01-IMPLEMENT.md"
    $verifyFile = Join-Path $promptDir "$($p.id)-99-VERIFY.md"
    $keyFile = Join-Path $RepoRoot $p.key

    $promptOk = (Test-Path -LiteralPath $implFile) -and (Test-Path -LiteralPath $verifyFile)
    $keyOk = Test-Path -LiteralPath $keyFile

    $ok = $promptOk -and $keyOk
    if ($ok) { $pass++ } else { $fail++ }

    $icon = if ($ok) { "PASS" } else { "FAIL" }
    $color = if ($ok) { "Green" } else { "Red" }
    $detail = ""
    if (-not $promptOk) { $detail += " [missing prompt]" }
    if (-not $keyOk) { $detail += " [missing $($p.key)]" }
    Write-Host "  [$icon] Phase $($p.id) ($($p.slug))$detail" -ForegroundColor $color
}

Write-Host "`n=== Wave 29: $pass/$($phases.Count) phases verified ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

if ($fail -gt 0) { exit 1 }
exit 0
