#!/usr/bin/env pwsh
<#
  scripts/verify-phase254-resilience.ps1
  Phase 254 -- Resilience Certification verifier (Wave 7 P7)

  Validates:
  - Resilience drill infrastructure exists
  - Circuit breaker pattern is implemented
  - Graceful shutdown is implemented
  - Health vs readiness split is implemented
  - Posture endpoints exist
  - Backup/recovery scripts exist
  - CI workflow exists
  - Vitest certification suite exists
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

function Warn([string]$Name, [string]$Detail = "") {
  $script:warn++
  Write-Host "  WARN  $Name  $Detail" -ForegroundColor Yellow
}

Write-Host "`n===== Phase 254 -- Resilience Certification Verifier =====" -ForegroundColor Cyan

# --- Drill Infrastructure ---
Write-Host "`n--- Drill Infrastructure ---" -ForegroundColor White

$g = Test-Path -LiteralPath "ops/drills/resilience-drills.ts"
Gate "drill_config_exists" $g "ops/drills/resilience-drills.ts"

$g = Test-Path -LiteralPath "ops/drills/run-vista-down-drill.ps1"
Gate "drill_vista_down" $g "ops/drills/run-vista-down-drill.ps1"

$g = Test-Path -LiteralPath "ops/drills/run-circuit-breaker-drill.ps1"
Gate "drill_circuit_breaker" $g "ops/drills/run-circuit-breaker-drill.ps1"

$g = Test-Path -LiteralPath "ops/drills/run-health-readiness-drill.ps1"
Gate "drill_health_readiness" $g "ops/drills/run-health-readiness-drill.ps1"

$g = Test-Path -LiteralPath "ops/drills/run-posture-audit-drill.ps1"
Gate "drill_posture_audit" $g "ops/drills/run-posture-audit-drill.ps1"

# Check drill config defines 5+ drills
$drillSrc = Get-Content "ops/drills/resilience-drills.ts" -Raw
$drillCount = ([regex]::Matches($drillSrc, "ResilienceDrill\s*=\s*\{")).Count
$g = $drillCount -ge 5
Gate "drill_defines_5_scenarios" $g "Found $drillCount drill definitions"

# --- Circuit Breaker ---
Write-Host "`n--- Circuit Breaker Pattern ---" -ForegroundColor White
$cbFile = "apps/api/src/lib/rpc-resilience.ts"
$g = Test-Path -LiteralPath $cbFile
Gate "circuit_breaker_module" $g $cbFile
if (Test-Path -LiteralPath $cbFile) {
  $cbSrc = Get-Content $cbFile -Raw
  $g = $cbSrc -match "safeCallRpc"
  Gate "cb_safe_call_rpc" $g "exports safeCallRpc"
  $g = $cbSrc -match "open|closed|half"
  Gate "cb_state_machine" $g "open/closed/half-open states"
  $g = $cbSrc -match "getCircuitBreakerStats|circuitBreakerStats"
  Gate "cb_stats_export" $g "stats observable"
}

# --- Graceful Shutdown ---
Write-Host "`n--- Graceful Shutdown ---" -ForegroundColor White
$secFile = "apps/api/src/middleware/security.ts"
$g = Test-Path -LiteralPath $secFile
Gate "security_module" $g $secFile
if (Test-Path -LiteralPath $secFile) {
  $secSrc = Get-Content $secFile -Raw
  $g = $secSrc -match "SIGTERM"
  Gate "shutdown_sigterm" $g "handles SIGTERM"
  $g = $secSrc -match "SIGINT"
  Gate "shutdown_sigint" $g "handles SIGINT"
  $g = $secSrc -match "DRAIN_TIMEOUT|SHUTDOWN_DRAIN_TIMEOUT"
  Gate "shutdown_drain_timeout" $g "configurable drain"
  $g = $secSrc -match "disconnectRpcBroker"
  Gate "shutdown_rpc_disconnect" $g "disconnects RPC broker"
}

# --- Health vs Readiness ---
Write-Host "`n--- Health vs Readiness ---" -ForegroundColor White
$healthFiles = @("apps/api/src/server/inline-routes.ts", "apps/api/src/index.ts")
$foundHealth = $false
$foundReady = $false
foreach ($hf in $healthFiles) {
  if (Test-Path -LiteralPath $hf) {
    $hsrc = Get-Content $hf -Raw
    if ($hsrc -match "\/health") { $foundHealth = $true }
    if ($hsrc -match "\/ready") { $foundReady = $true }
  }
}
Gate "health_endpoint_exists" $foundHealth "/health endpoint"
Gate "ready_endpoint_exists" $foundReady "/ready endpoint"

# --- Posture Endpoints ---
Write-Host "`n--- Posture Endpoints ---" -ForegroundColor White
$g = Test-Path -LiteralPath "apps/api/src/posture"
Gate "posture_dir" $g "posture directory"
$postureFiles = @(
  "apps/api/src/posture/observability-posture.ts",
  "apps/api/src/posture/perf-posture.ts",
  "apps/api/src/posture/backup-posture.ts",
  "apps/api/src/posture/tenant-posture.ts",
  "apps/api/src/posture/data-plane-posture.ts"
)
$postureCount = ($postureFiles | Where-Object { Test-Path -LiteralPath $_ }).Count
$g = $postureCount -ge 5
Gate "posture_files_5plus" $g "Found $postureCount posture files"

# --- Backup and Recovery ---
Write-Host "`n--- Backup and Recovery ---" -ForegroundColor White
$g = Test-Path -LiteralPath "scripts/backup-restore.mjs"
Gate "backup_script" $g "scripts/backup-restore.mjs"
$g = Test-Path -LiteralPath ".github/workflows/dr-nightly.yml"
Gate "dr_nightly_workflow" $g ".github/workflows/dr-nightly.yml"

# --- CI Workflow ---
Write-Host "`n--- CI Workflow ---" -ForegroundColor White
$g = Test-Path -LiteralPath ".github/workflows/resilience-certification.yml"
Gate "resilience_ci_workflow" $g "CI workflow"

# --- Vitest Suite ---
Write-Host "`n--- Vitest Suite ---" -ForegroundColor White
$testFile = "apps/api/tests/resilience-certification.test.ts"
$g = Test-Path -LiteralPath $testFile
Gate "vitest_suite_exists" $g $testFile
if (Test-Path -LiteralPath $testFile) {
  $testSrc = Get-Content $testFile -Raw
  $describeCount = ([regex]::Matches($testSrc, "describe\(")).Count
  $g = $describeCount -ge 8
  Gate "vitest_8plus_suites" $g "Found $describeCount describe blocks"
}

# --- Prompt Files ---
Write-Host "`n--- Prompt Files ---" -ForegroundColor White
$promptDir = "prompts/251-PHASE-254-RESILIENCE-CERTIFICATION"
$g = Test-Path -LiteralPath "$promptDir/254-01-IMPLEMENT.md"
Gate "prompt_implement" $g "IMPLEMENT prompt"
$g = Test-Path -LiteralPath "$promptDir/254-99-VERIFY.md"
Gate "prompt_verify" $g "VERIFY prompt"
$g = Test-Path -LiteralPath "$promptDir/254-NOTES.md"
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
