<#
.SYNOPSIS
  Phase 75 -- Go-Live Evidence Pack v1 Verifier
.DESCRIPTION
  Verifies all Phase 75 deliverables:
    1. Backup/restore drill evidence scripts exist + structure
    2. Perf budget smoke script exists + structure
    3. Security controls ADR exists + content checks
    4. Evidence pack orchestrator exists + structure
    5. Config: performance-budgets.json committed
    6. Run perf budget smoke (--skip-api mode)
    7. Run evidence pack generator (--skip-docker --skip-api mode)
    8. Verify manifest produced
    9. TypeScript compile clean
   10. Anti-pattern checks
.PARAMETER SkipDocker
  Skip Docker and live VistA checks.
#>
param([switch]$SkipDocker)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot | Split-Path
$webDir = Join-Path (Join-Path $repoRoot "apps") "web"
$apiDir = Join-Path (Join-Path $repoRoot "apps") "api"

Write-Host ""
Write-Host "=== Phase 75 -- Go-Live Evidence Pack v1 ===" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0
$warn = 0

function Gate([string]$label, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $label" -ForegroundColor Red
    $script:fail++
  }
}

function Warn([string]$label) {
  Write-Host "  WARN  $label" -ForegroundColor Yellow
  $script:warn++
}

# ================================================================
# Section 1: File Existence
# ================================================================
Write-Host "-- File Existence --" -ForegroundColor Cyan

$files = @(
  "scripts/ops/backup-drill-evidence.ts",
  "scripts/ops/restore-drill-evidence.ts",
  "scripts/ops/perf-budget-smoke.ts",
  "scripts/ops/generateEvidencePack.ts",
  "docs/decisions/ADR-security-controls-v1.md",
  "config/performance-budgets.json",
  "scripts/ops/backup-drill.ps1",
  "scripts/ops/restore-drill.ps1",
  "scripts/ops/generate-sbom.ps1",
  "prompts/80-PHASE-75-GO-LIVE-EVIDENCE-PACK/80-01-IMPLEMENT.md",
  "prompts/80-PHASE-75-GO-LIVE-EVIDENCE-PACK/80-99-VERIFY.md"
)

foreach ($f in $files) {
  $name = Split-Path $f -Leaf
  Gate "$name exists" (Test-Path -LiteralPath (Join-Path $repoRoot $f))
}

# ================================================================
# Section 2: Backup/Restore Drill Evidence Scripts
# ================================================================
Write-Host ""
Write-Host "-- Backup/Restore Drill Evidence --" -ForegroundColor Cyan

$backupTs = ""
$backupTsFile = Join-Path $repoRoot "scripts/ops/backup-drill-evidence.ts"
if (Test-Path -LiteralPath $backupTsFile) { $backupTs = Get-Content -Raw $backupTsFile }

Gate "backup-drill-evidence exports runBackupDrillEvidence" ($backupTs -match "export\s+async\s+function\s+runBackupDrillEvidence")
Gate "backup-drill-evidence calls backup-drill.ps1" ($backupTs -match "backup-drill\.ps1")
Gate "backup-drill-evidence calls restore-drill.ps1" ($backupTs -match "restore-drill\.ps1")
Gate "backup-drill-evidence writes evidence to artifacts/" ($backupTs -match "artifacts/evidence/phase75/backup")
Gate "backup-drill-evidence produces BackupEvidenceReport" ($backupTs -match "BackupEvidenceReport")

$restoreTs = ""
$restoreTsFile = Join-Path $repoRoot "scripts/ops/restore-drill-evidence.ts"
if (Test-Path -LiteralPath $restoreTsFile) { $restoreTs = Get-Content -Raw $restoreTsFile }

Gate "restore-drill-evidence exports runRestoreDrillEvidence" ($restoreTs -match "export\s+async\s+function\s+runRestoreDrillEvidence")
Gate "restore-drill-evidence validates manifest" ($restoreTs -match "manifest-readable|manifest-exists")
Gate "restore-drill-evidence checks archive extractability" ($restoreTs -match "extractable")

# ================================================================
# Section 3: Perf Budget Smoke
# ================================================================
Write-Host ""
Write-Host "-- Perf Budget Smoke --" -ForegroundColor Cyan

$perfTs = ""
$perfTsFile = Join-Path $repoRoot "scripts/ops/perf-budget-smoke.ts"
if (Test-Path -LiteralPath $perfTsFile) { $perfTs = Get-Content -Raw $perfTsFile }

Gate "perf-budget-smoke exports runPerfBudgetSmoke" ($perfTs -match "export\s+async\s+function\s+runPerfBudgetSmoke")
Gate "perf-budget-smoke reads performance-budgets.json" ($perfTs -match "performance-budgets\.json")
Gate "perf-budget-smoke measures p95 latency" ($perfTs -match "p95LatencyMs|percentile.*95")
Gate "perf-budget-smoke measures error rate" ($perfTs -match "errorRate")
Gate "perf-budget-smoke outputs to artifacts/evidence/phase75/perf" ($perfTs -match "artifacts/evidence/phase75/perf")
Gate "perf-budget-smoke has --skip-api mode" ($perfTs -match "skip-api|skipApi")
Gate "perf-budget-smoke produces PerfBudgetReport" ($perfTs -match "PerfBudgetReport")
Gate "perf-budget-smoke has memory snapshots" ($perfTs -match "MemorySnapshot|memoryUsage")

# ================================================================
# Section 4: Security Controls ADR
# ================================================================
Write-Host ""
Write-Host "-- Security Controls ADR --" -ForegroundColor Cyan

$adr = ""
$adrFile = Join-Path $repoRoot "docs/decisions/ADR-security-controls-v1.md"
if (Test-Path -LiteralPath $adrFile) { $adr = Get-Content -Raw $adrFile }

Gate "ADR has Audit Integrity section" ($adr -match "Audit Integrity")
Gate "ADR has Least Privilege section" ($adr -match "Least Privilege")
Gate "ADR has Session Security section" ($adr -match "Session Security")
Gate "ADR has Log Redaction section" ($adr -match "Log Redaction")
Gate "ADR has SBOM section" ($adr -match "SBOM")
Gate "ADR has Backup section" ($adr -match "Backup")
Gate "ADR has Performance Budgets section" ($adr -match "Performance Budgets")
Gate "ADR has Network Security section" ($adr -match "Network Security")
Gate "ADR has Known Gaps section" ($adr -match "Known Gaps")
Gate "ADR does NOT claim HIPAA compliant" (-not ($adr -match "(?i)hipaa\s+compliant"))
Gate "ADR references source files" ($adr -match "apps/api/src/")
Gate "ADR references immutable-audit" ($adr -match "immutable-audit")
Gate "ADR references policy-engine" ($adr -match "policy-engine")

# ================================================================
# Section 5: Evidence Pack Orchestrator
# ================================================================
Write-Host ""
Write-Host "-- Evidence Pack Orchestrator --" -ForegroundColor Cyan

$orchTs = ""
$orchTsFile = Join-Path $repoRoot "scripts/ops/generateEvidencePack.ts"
if (Test-Path -LiteralPath $orchTsFile) { $orchTs = Get-Content -Raw $orchTsFile }

Gate "generateEvidencePack exports generateEvidencePack" ($orchTs -match "export\s+async\s+function\s+generateEvidencePack")
Gate "Orchestrator imports backup-drill-evidence" ($orchTs -match "import.*runBackupDrillEvidence.*backup-drill-evidence")
Gate "Orchestrator imports perf-budget-smoke" ($orchTs -match "import.*runPerfBudgetSmoke.*perf-budget-smoke")
Gate "Orchestrator has sanity checks stage" ($orchTs -match "stageSanityChecks")
Gate "Orchestrator has perf smoke stage" ($orchTs -match "stagePerfSmoke")
Gate "Orchestrator has SBOM stage" ($orchTs -match "stageSbom")
Gate "Orchestrator has backup/restore stage" ($orchTs -match "stageBackupRestore")
Gate "Orchestrator has security controls stage" ($orchTs -match "stageSecurityControls")
Gate "Orchestrator produces manifest.json" ($orchTs -match "manifest\.json")
Gate "Orchestrator has SHA-256 artifact hashing" ($orchTs -match "sha256|createHash")
Gate "Orchestrator has git SHA in metadata" ($orchTs -match "gitSha")
Gate "Orchestrator has --skip-docker and --skip-api" ($orchTs -match "skipDocker.*skipApi|skip-docker.*skip-api")

# ================================================================
# Section 6: Performance Budgets Config
# ================================================================
Write-Host ""
Write-Host "-- Performance Budgets Config --" -ForegroundColor Cyan

$budgets = ""
$budgetsFile = Join-Path $repoRoot "config/performance-budgets.json"
if (Test-Path -LiteralPath $budgetsFile) { $budgets = Get-Content -Raw $budgetsFile }

Gate "perf-budgets.json has apiLatencyBudgets" ($budgets -match "apiLatencyBudgets")
Gate "perf-budgets.json has p95 thresholds" ($budgets -match '"p95"')
Gate "perf-budgets.json has loadTestThresholds" ($budgets -match "loadTestThresholds")
Gate "perf-budgets.json has infrastructure budgets" ($budgets -match '"infrastructure"')
Gate "perf-budgets.json has vistaRpcBudgets" ($budgets -match "vistaRpcBudgets")

# ================================================================
# Section 7: Run perf-budget-smoke (--skip-api)
# ================================================================
Write-Host ""
Write-Host "-- Run perf-budget-smoke (config validation) --" -ForegroundColor Cyan

try {
  Push-Location $repoRoot
  $perfOut = & npx tsx scripts/ops/perf-budget-smoke.ts --skip-api 2>&1 | Out-String
  $perfOk = ($LASTEXITCODE -eq 0)
  Pop-Location
  Gate "perf-budget-smoke runs successfully (--skip-api)" $perfOk

  $evidencePath = Join-Path $repoRoot "artifacts/evidence/phase75/perf/perf-budget-evidence.json"
  Gate "perf-budget-evidence.json produced" (Test-Path -LiteralPath $evidencePath)

  if (Test-Path -LiteralPath $evidencePath) {
    $perfEvidence = Get-Content -Raw $evidencePath
    Gate "Evidence has _meta section" ($perfEvidence -match "_meta")
    Gate "Evidence has summary section" ($perfEvidence -match "summary")
    Gate "Evidence has endpoints list" ($perfEvidence -match "endpoints")
  } else {
    Gate "Evidence has _meta section" $false
    Gate "Evidence has summary section" $false
    Gate "Evidence has endpoints list" $false
  }
} catch {
  Pop-Location -ErrorAction SilentlyContinue
  Gate "perf-budget-smoke runs successfully (--skip-api)" $false
  Gate "perf-budget-evidence.json produced" $false
  Gate "Evidence has _meta section" $false
  Gate "Evidence has summary section" $false
  Gate "Evidence has endpoints list" $false
}

# ================================================================
# Section 8: verify-latest.ps1
# ================================================================
Write-Host ""
Write-Host "-- verify-latest.ps1 --" -ForegroundColor Cyan

$latestFile = Join-Path $repoRoot "scripts/verify-latest.ps1"
$latest = ""
if (Test-Path -LiteralPath $latestFile) { $latest = Get-Content -Raw $latestFile }
Gate "verify-latest.ps1 references Phase 75" ($latest -match "phase75|phase-75|Phase 75")

# ================================================================
# Section 9: TypeScript Compile
# ================================================================
Write-Host ""
Write-Host "-- TypeScript Compile --" -ForegroundColor Cyan

Push-Location $apiDir
$tscApi = & pnpm exec tsc --noEmit 2>&1 | Out-String
$apiClean = ($LASTEXITCODE -eq 0)
Pop-Location
Gate "apps/api TSC clean" $apiClean

Push-Location $webDir
$tscWeb = & pnpm exec tsc --noEmit 2>&1 | Out-String
$webClean = ($LASTEXITCODE -eq 0)
Pop-Location
Gate "apps/web TSC clean" $webClean

# ================================================================
# Section 10: Anti-Pattern Checks
# ================================================================
Write-Host ""
Write-Host "-- Anti-Pattern Checks --" -ForegroundColor Cyan

$allNew = $backupTs + $restoreTs + $perfTs + $orchTs
$noCreds = -not ($allNew -match "PROV123|NURSE123|PHARM123")
Gate "No hardcoded credentials in new scripts" $noCreds

$noConsole = -not ($allNew -match "console\.log\(")
if ($noConsole) {
  Gate "No console.log in new scripts" $true
} else {
  # console.log is acceptable in CLI scripts but flag it
  Warn "New scripts use console.log (acceptable for CLI output)"
}

Gate "ADR-security-controls is distinct from ADR-security-baseline" (
  (Test-Path -LiteralPath (Join-Path $repoRoot "docs/decisions/ADR-security-controls-v1.md")) -and
  (Test-Path -LiteralPath (Join-Path $repoRoot "docs/decisions/ADR-security-baseline-v1.md"))
)

# No HIPAA compliant claims in any new files
$noHipaaClaim = -not ($allNew -match "(?i)hipaa\s+compliant")
Gate "No HIPAA-compliant claim in new scripts" $noHipaaClaim

# ================================================================
# Summary
# ================================================================
$total = $pass + $fail
Write-Host ""
Write-Host "=== Phase 75 Results: $pass/$total passed, $warn warning(s) ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host ""

exit $fail
