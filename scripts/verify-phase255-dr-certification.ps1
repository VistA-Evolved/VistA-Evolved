#!/usr/bin/env pwsh
<#
  scripts/verify-phase255-dr-certification.ps1
  Phase 255 -- DR Certification Drill verifier (Wave 7 P8)
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
Set-Location $root

$pass = 0; $fail = 0; $warn = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail = "") {
  if ($Ok) {
    $script:pass++
    Write-Host "  PASS  $Name" -ForegroundColor Green
  } else {
    $script:fail++
    Write-Host "  FAIL  $Name  $Detail" -ForegroundColor Red
  }
}

Write-Host "`n===== Phase 255 -- DR Certification Drill Verifier =====" -ForegroundColor Cyan

# --- DR Scripts ---
Write-Host "`n--- DR Scripts ---" -ForegroundColor White
$g = Test-Path -LiteralPath "scripts/dr/backup.mjs"
Gate "dr_backup_script" $g "scripts/dr/backup.mjs"
$g = Test-Path -LiteralPath "scripts/dr/restore-verify.mjs"
Gate "dr_restore_verify" $g "scripts/dr/restore-verify.mjs"
$g = Test-Path -LiteralPath "scripts/backup-restore.mjs"
Gate "legacy_backup" $g "scripts/backup-restore.mjs"

# --- Backup Integrity ---
Write-Host "`n--- Backup Script Integrity ---" -ForegroundColor White
if (Test-Path -LiteralPath "scripts/dr/backup.mjs") {
  $bkSrc = Get-Content "scripts/dr/backup.mjs" -Raw
  $g = $bkSrc -match "pg_dump"
  Gate "backup_pg_dump" $g "uses pg_dump"
  $g = $bkSrc -match "sha256|createHash"
  Gate "backup_sha256" $g "SHA-256 checksums"
  $g = $bkSrc -match "manifest"
  Gate "backup_manifest" $g "creates manifest"
}

# --- Restore Verification ---
Write-Host "`n--- Restore Verification ---" -ForegroundColor White
if (Test-Path -LiteralPath "scripts/dr/restore-verify.mjs") {
  $rvSrc = Get-Content "scripts/dr/restore-verify.mjs" -Raw
  $g = $rvSrc -match "schema"
  Gate "restore_schema" $g "schema probes"
  $g = $rvSrc -match "synthetic|INSERT"
  Gate "restore_synthetic" $g "synthetic data probes"
  $g = $rvSrc -match "rls|RLS"
  Gate "restore_rls" $g "RLS verification"
  $g = $rvSrc -match "drift"
  Gate "restore_drift" $g "drift detection"
  $g = $rvSrc -match "checksum|sha256"
  Gate "restore_checksum" $g "checksum verification"
}

# --- CI Workflow ---
Write-Host "`n--- CI Workflow ---" -ForegroundColor White
$g = Test-Path -LiteralPath ".github/workflows/dr-nightly.yml"
Gate "dr_nightly_ci" $g "DR nightly CI"
if (Test-Path -LiteralPath ".github/workflows/dr-nightly.yml") {
  $ciSrc = Get-Content ".github/workflows/dr-nightly.yml" -Raw
  $g = $ciSrc -match "postgres"
  Gate "ci_pg_service" $g "PG service container"
  $g = $ciSrc -match "upload-artifact"
  Gate "ci_uploads_artifacts" $g "uploads artifacts"
}

# --- Runbooks ---
Write-Host "`n--- Runbooks ---" -ForegroundColor White
$g = Test-Path -LiteralPath "docs/runbooks/disaster-recovery.md"
Gate "runbook_dr" $g "disaster-recovery.md"
$g = Test-Path -LiteralPath "docs/runbooks/pg-backup-pitr.md"
Gate "runbook_pitr" $g "pg-backup-pitr.md"
$g = Test-Path -LiteralPath "docs/runbooks/incident-pg-outage.md"
Gate "runbook_pg_outage" $g "incident-pg-outage.md"

# --- Gauntlet G16 ---
Write-Host "`n--- Gauntlet G16 ---" -ForegroundColor White
$g = Test-Path -LiteralPath "qa/gauntlet/gates/g16-dr-chaos.mjs"
Gate "gauntlet_g16" $g "G16 DR gate"

# --- Drill Infrastructure ---
Write-Host "`n--- Drill Infrastructure ---" -ForegroundColor White
$g = Test-Path -LiteralPath "ops/drills/run-dr-certification-drill.ps1"
Gate "dr_drill_script" $g "DR drill script"
$g = Test-Path -LiteralPath "ops/drills/dr-certification-checklist.md"
Gate "dr_checklist" $g "DR checklist"

# --- Vitest ---
Write-Host "`n--- Vitest Suite ---" -ForegroundColor White
$testFile = "apps/api/tests/dr-certification.test.ts"
$g = Test-Path -LiteralPath $testFile
Gate "vitest_dr_suite" $g $testFile
if (Test-Path -LiteralPath $testFile) {
  $tSrc = Get-Content $testFile -Raw
  $dc = ([regex]::Matches($tSrc, "describe\(")).Count
  $g = $dc -ge 8
  Gate "vitest_8plus_suites" $g "Found $dc describe blocks"
}

# --- Prod Compose ---
Write-Host "`n--- Production Compose ---" -ForegroundColor White
$g = Test-Path -LiteralPath "docker-compose.prod.yml"
Gate "prod_compose" $g "docker-compose.prod.yml"
if (Test-Path -LiteralPath "docker-compose.prod.yml") {
  $pcSrc = Get-Content "docker-compose.prod.yml" -Raw
  $g = $pcSrc -match "postgres|platform-db"
  Gate "prod_compose_pg" $g "PG in prod compose"
}

# --- Prompt Files ---
Write-Host "`n--- Prompt Files ---" -ForegroundColor White
$pd = "prompts/252-PHASE-255-DR-CERTIFICATION-DRILL"
$g = Test-Path -LiteralPath "$pd/255-01-IMPLEMENT.md"
Gate "prompt_implement" $g "IMPLEMENT prompt"
$g = Test-Path -LiteralPath "$pd/255-99-VERIFY.md"
Gate "prompt_verify" $g "VERIFY prompt"
$g = Test-Path -LiteralPath "$pd/255-NOTES.md"
Gate "prompt_notes" $g "NOTES"

# --- Summary ---
$total = $pass + $fail
Write-Host "`n===== RESULTS =====" -ForegroundColor Cyan
if ($fail -eq 0) {
  Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn  TOTAL: $total" -ForegroundColor Green
  Write-Host "  VERDICT: PASS" -ForegroundColor Green
  exit 0
} else {
  Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn  TOTAL: $total" -ForegroundColor Red
  Write-Host "  VERDICT: FAIL" -ForegroundColor Red
  exit 1
}
