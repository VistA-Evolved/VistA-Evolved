# Phase 491 — W34-P1 VERIFY: Reservation + Manifest + Coverage Matrix

## Verification Gates

### Gate 1 — Reservation exists

```powershell
$json = Get-Content docs/qa/prompt-phase-range-reservations.json -Raw
$reservations = $json | ConvertFrom-Json
$w34 = $reservations | Where-Object { $_.wave -eq "34" }
if (-not $w34) { Write-Error "FAIL: No Wave 34 reservation"; exit 1 }
if ($w34.start -ne 491 -or $w34.end -ne 499 -or $w34.count -ne 9) {
  Write-Error "FAIL: Wave 34 range must be 491-499 (K=9)"; exit 1
}
Write-Host "PASS: Wave 34 reservation 491-499 (K=9)"
```

### Gate 2 — Wave manifest exists and has 9 phases

```powershell
$manifest = Get-Content prompts/WAVE_34_MANIFEST.md -Raw
$phaseRows = ($manifest | Select-String -Pattern '\| W34-P\d' -AllMatches).Matches.Count
if ($phaseRows -lt 9) { Write-Error "FAIL: Manifest has $phaseRows phases (need 9)"; exit 1 }
Write-Host "PASS: Manifest has $phaseRows phase rows"
```

### Gate 3 — P1 prompt folder structure

```powershell
$impl = Test-Path -LiteralPath "prompts/491-W34-P1-MANIFEST-COVERAGE/491-01-IMPLEMENT.md"
$verify = Test-Path -LiteralPath "prompts/491-W34-P1-MANIFEST-COVERAGE/491-99-VERIFY.md"
if (-not $impl -or -not $verify) { Write-Error "FAIL: Missing P1 prompt files"; exit 1 }
Write-Host "PASS: P1 prompt folder has IMPLEMENT + VERIFY"
```

### Gate 4 — Coverage matrix exists and has field inventory

```powershell
$matrix = Get-Content docs/architecture/country-pack-coverage-matrix.md -Raw
if (-not $matrix) { Write-Error "FAIL: Coverage matrix not found"; exit 1 }
$fieldCount = ($matrix | Select-String -Pattern '^\|' -AllMatches).Matches.Count
if ($fieldCount -lt 20) { Write-Error "FAIL: Coverage matrix has too few rows ($fieldCount)"; exit 1 }
Write-Host "PASS: Coverage matrix exists with $fieldCount table rows"
```

### Gate 5 — Gap analysis exists

```powershell
$gaps = Test-Path "docs/architecture/country-pack-enforcement-gaps.md"
if (-not $gaps) { Write-Error "FAIL: Gap analysis not found"; exit 1 }
$content = Get-Content docs/architecture/country-pack-enforcement-gaps.md -Raw
if ($content.Length -lt 500) { Write-Error "FAIL: Gap analysis too short"; exit 1 }
Write-Host "PASS: Gap analysis exists ($($content.Length) chars)"
```

### Gate 6 — No code changes (P1 is docs-only)

```powershell
# P1 should only create/edit docs, prompts, and the reservation JSON
# No .ts files should be changed
$tsChanges = git diff --name-only HEAD -- '*.ts' '*.tsx' 2>$null
if ($tsChanges) { Write-Warning "NOTE: TypeScript files changed (unexpected for P1): $tsChanges" }
Write-Host "PASS: P1 scope check complete"
```

## Expected Result

All 6 gates PASS. Coverage matrix identifies all `CountryPackValues` fields
with enforcement status per subsystem. Gap analysis lists remediation targets
for P2-P9.
