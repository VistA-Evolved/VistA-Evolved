<#
.SYNOPSIS
  Wave 24 -- Pilot Go-Lives + Stabilization verification script.
.DESCRIPTION
  Validates all W24 phases (409-417): manifest, environments, intake,
  certification, migration, UAT, cutover, SRE, and go/no-go gate.
#>
param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$name, [scriptblock]$check) {
  $script:total++
  try {
    $result = & $check
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name ($_)" -ForegroundColor Red
    $script:fail++
  }
}

$root = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== WAVE 24 CERTIFICATION ===" -ForegroundColor Cyan

# --- Section 1: Manifest + Reservation ---
Write-Host "`n--- Section 1: Manifest + Reservation ---"
Gate "WAVE_24_MANIFEST.md exists" { Test-Path -LiteralPath "$root/prompts/WAVE_24_MANIFEST.md" }
Gate "Range reservation includes wave 24" {
  $json = Get-Content "$root/docs/qa/prompt-phase-range-reservations.json" -Raw
  $json -match '"wave":\s*"24"'
}
Gate "Reservation start=409 end=417" {
  $reservations = Get-Content "$root/docs/qa/prompt-phase-range-reservations.json" -Raw | ConvertFrom-Json
  $w24 = $reservations | Where-Object { $_.wave -eq "24" }
  $w24.start -eq 409 -and $w24.end -eq 417
}
Gate "No range overlaps" {
  $reservations = Get-Content "$root/docs/qa/prompt-phase-range-reservations.json" -Raw | ConvertFrom-Json
  $sorted = $reservations | Sort-Object { $_.start }
  $ok = $true
  for ($i = 1; $i -lt $sorted.Count; $i++) {
    if ($sorted[$i].start -le $sorted[$i-1].end) { $ok = $false }
  }
  $ok
}

# --- Section 2: Prompt Folders ---
Write-Host "`n--- Section 2: Prompt Folders ---"
$promptFolders = @(
  "409-W24-P1-MANIFEST-ARCHETYPES",
  "410-W24-P2-REFERENCE-ENVIRONMENTS",
  "411-W24-P3-INTEGRATION-INTAKE",
  "412-W24-P4-CERTIFICATION-RUNS",
  "413-W24-P5-MIGRATION-REHEARSAL",
  "414-W24-P6-UAT-HARNESS",
  "415-W24-P7-CUTOVER-ROLLBACK",
  "416-W24-P8-SRE-MONITORING",
  "417-W24-P9-GO-NOGO-GATE"
)
foreach ($pf in $promptFolders) {
  Gate "Prompt folder: $pf" { Test-Path -LiteralPath "$root/prompts/$pf" }
}

# --- Section 3: Prompt Files (IMPLEMENT + VERIFY + NOTES) ---
Write-Host "`n--- Section 3: Prompt Files ---"
foreach ($pf in $promptFolders) {
  Gate "IMPLEMENT.md in $pf" { Test-Path -LiteralPath "$root/prompts/$pf/IMPLEMENT.md" }
  Gate "VERIFY.md in $pf" { Test-Path -LiteralPath "$root/prompts/$pf/VERIFY.md" }
  Gate "NOTES.md in $pf" { Test-Path -LiteralPath "$root/prompts/$pf/NOTES.md" }
}

# --- Section 4: Pilot Docs ---
Write-Host "`n--- Section 4: Pilot Docs ---"
Gate "PILOT_ARCHETYPES.md" { Test-Path -LiteralPath "$root/docs/pilots/PILOT_ARCHETYPES.md" }
Gate "PILOT_READINESS_GATES.md" { Test-Path -LiteralPath "$root/docs/pilots/PILOT_READINESS_GATES.md" }
Gate "Archetypes has Archetype A" {
  (Get-Content "$root/docs/pilots/PILOT_ARCHETYPES.md" -Raw) -match "Archetype A"
}
Gate "Archetypes has Archetype B" {
  (Get-Content "$root/docs/pilots/PILOT_ARCHETYPES.md" -Raw) -match "Archetype B"
}
Gate "Readiness gates has G1-G10" {
  $content = Get-Content "$root/docs/pilots/PILOT_READINESS_GATES.md" -Raw
  ($content -match "G1 --") -and ($content -match "G10 --")
}

# --- Section 5: Reference Environments ---
Write-Host "`n--- Section 5: Reference Environments ---"
Gate "infra/environments/pilot.yaml" { Test-Path -LiteralPath "$root/infra/environments/pilot.yaml" }
Gate "infra/environments/dr-validate.yaml" { Test-Path -LiteralPath "$root/infra/environments/dr-validate.yaml" }
Gate "verify-env-parity.ps1 exists" { Test-Path -LiteralPath "$root/scripts/verify-env-parity.ps1" }

# --- Section 6: Integration Intake ---
Write-Host "`n--- Section 6: Integration Intake ---"
Gate "intake types.ts exists" { Test-Path -LiteralPath "$root/apps/api/src/pilots/intake/types.ts" }
Gate "intake store exists" { Test-Path -LiteralPath "$root/apps/api/src/pilots/intake/intake-store.ts" }
Gate "intake routes exist" { Test-Path -LiteralPath "$root/apps/api/src/pilots/intake/intake-routes.ts" }
Gate "intake config generator exists" { Test-Path -LiteralPath "$root/apps/api/src/pilots/intake/config-generator.ts" }

# --- Section 7: Certification Runner ---
Write-Host "`n--- Section 7: Certification Runner ---"
Gate "certify-pilot-customer.ps1 exists" { Test-Path -LiteralPath "$root/scripts/certify-pilot-customer.ps1" }

# --- Section 8: Migration Rehearsal ---
Write-Host "`n--- Section 8: Migration Rehearsal ---"
Gate "migrate-rehearsal.ps1 exists" { Test-Path -LiteralPath "$root/scripts/migrate-rehearsal.ps1" }

# --- Section 9: UAT Harness ---
Write-Host "`n--- Section 9: UAT Harness ---"
Gate "clinic-uat.md exists" { Test-Path -LiteralPath "$root/docs/pilots/uat/clinic-uat.md" }
Gate "hospital-uat.md exists" { Test-Path -LiteralPath "$root/docs/pilots/uat/hospital-uat.md" }

# --- Section 10: Cutover + Rollback ---
Write-Host "`n--- Section 10: Cutover + Rollback ---"
Gate "CUTOVER_TEMPLATE.md" { Test-Path -LiteralPath "$root/docs/pilots/cutover/CUTOVER_TEMPLATE.md" }
Gate "ROLLBACK_TEMPLATE.md" { Test-Path -LiteralPath "$root/docs/pilots/cutover/ROLLBACK_TEMPLATE.md" }

# --- Section 11: SRE ---
Write-Host "`n--- Section 11: SRE ---"
Gate "SLOS.md" { Test-Path -LiteralPath "$root/docs/sre/SLOS.md" }
Gate "ERROR_BUDGET_POLICY.md" { Test-Path -LiteralPath "$root/docs/sre/ERROR_BUDGET_POLICY.md" }
Gate "incident-automation types" { Test-Path -LiteralPath "$root/apps/api/src/pilots/sre/types.ts" }

# --- Section 12: Go/No-Go Gate ---
Write-Host "`n--- Section 12: Go/No-Go Gate ---"
Gate "pilot-go-no-go.ps1 exists" { Test-Path -LiteralPath "$root/scripts/pilot-go-no-go.ps1" }
Gate "DAY1.md" { Test-Path -LiteralPath "$root/docs/pilots/ops/DAY1.md" }
Gate "WEEK1.md" { Test-Path -LiteralPath "$root/docs/pilots/ops/WEEK1.md" }
Gate "MONTH1.md" { Test-Path -LiteralPath "$root/docs/pilots/ops/MONTH1.md" }

# --- Section 13: Evidence Dirs ---
Write-Host "`n--- Section 13: Evidence Directories ---"
$evidenceDirs = @("409-manifest","410-environments","411-intake","412-cert-runs","413-migration","414-uat","415-cutover","416-sre","417-go-nogo")
foreach ($ed in $evidenceDirs) {
  Gate "evidence/wave-24/$ed" { Test-Path -LiteralPath "$root/evidence/wave-24/$ed" }
}

# --- Section 14: TypeScript Build ---
Write-Host "`n--- Section 14: TypeScript Build ---"
Gate "tsc --noEmit clean" {
  Push-Location "$root/apps/api"
  $null = pnpm exec tsc --noEmit 2>&1
  Pop-Location
  $LASTEXITCODE -eq 0
}

# --- Section 15: PHI Denylist ---
Write-Host "`n--- Section 15: PHI Denylist ---"
Gate "No PHI in evidence" {
  $files = Get-ChildItem "$root/evidence/wave-24" -Recurse -File -ErrorAction SilentlyContinue
  $found = $false
  foreach ($f in $files) {
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match '\b\d{3}-\d{2}-\d{4}\b') { $found = $true; break }
    if ($content -match 'PATIENT,\w+') { $found = $true; break }
  }
  -not $found
}

# --- Summary ---
Write-Host "`n=== CERTIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Total gates: $total"
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host ""
if ($fail -eq 0) {
  Write-Host "  WAVE 24 CERTIFICATION: ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "  WAVE 24 CERTIFICATION: $fail GATE(S) FAILED" -ForegroundColor Red
}

exit $fail
