<#
.SYNOPSIS
  Verify Phase 256 -- Pilot Hospital Go-Live Kit
  Structural verification of all go-live kit deliverables.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root  = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass  = 0
$fail  = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) {
    Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 256 Verify: Pilot Hospital Go-Live Kit ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── G1-G3: Core artifacts ─────────────────────────────────────────

Write-Host "--- Core go-live artifacts ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\docs\pilot-go-live-kit.md"
Gate "G01-runbook-exists" $g "docs/pilot-go-live-kit.md"

$g = Test-Path -LiteralPath "$root\ops\drills\run-go-live-gate.ps1"
Gate "G02-gate-script-exists" $g "ops/drills/run-go-live-gate.ps1"

$g = Test-Path -LiteralPath "$root\apps\api\tests\go-live-certification.test.ts"
Gate "G03-test-exists" $g "apps/api/tests/go-live-certification.test.ts"

# ── G4-G9: Runbook content ────────────────────────────────────────

Write-Host "`n--- Runbook content ---" -ForegroundColor Yellow

$rbPath = "$root\docs\pilot-go-live-kit.md"
if (Test-Path -LiteralPath $rbPath) {
  $rb = Get-Content $rbPath -Raw

  $g = $rb -match "Day-1 Checklist"
  Gate "G04-day1-checklist" $g "Day-1 Checklist section"

  $g = $rb -match "Rollback Plan"
  Gate "G05-rollback-plan" $g "Rollback Plan section"

  $g = $rb -match "Sign-Off"
  Gate "G06-signoff" $g "Sign-Off section"

  $g = $rb -match "Verification Gates Summary"
  Gate "G07-gate-summary" $g "Gate summary table"

  $g = $rb -match "wave7-entry-gate"
  Gate "G08-wave7-ref" $g "Wave 7 entry gate reference"

  $g = $rb -match "PLATFORM_RUNTIME_MODE"
  Gate "G09-runtime-mode-ref" $g "Runtime mode documented"
} else {
  for ($i = 4; $i -le 9; $i++) {
    Gate "G0$i-runbook-content" $false "Runbook not found"
  }
}

# ── G10-G12: Pilot infrastructure ────────────────────────────────

Write-Host "`n--- Pilot infrastructure ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\pilot\site-config.ts"
Gate "G10-site-config" $g "site-config.ts"

$g = Test-Path -LiteralPath "$root\apps\api\src\pilot\preflight.ts"
Gate "G11-preflight" $g "preflight.ts"

$g = Test-Path -LiteralPath "$root\apps\web\src\app\cprs\admin\pilot\page.tsx"
Gate "G12-pilot-page" $g "Pilot admin page"

# ── G13-G20: Wave 7 verifiers ────────────────────────────────────

Write-Host "`n--- Wave 7 verifier scripts ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\scripts\wave7-entry-gate.ps1"
Gate "G13-wave7-entry-gate" $g "wave7-entry-gate.ps1"

$g = Test-Path -LiteralPath "$root\scripts\verify-phase249-supply-chain.ps1"
Gate "G14-verifier-249" $g "Phase 249 verifier"

$g = Test-Path -LiteralPath "$root\scripts\verify-phase250-rpc-contracts.ps1"
Gate "G15-verifier-250" $g "Phase 250 verifier"

$g = Test-Path -LiteralPath "$root\scripts\verify-phase251-api-fhir-contracts.ps1"
Gate "G16-verifier-251" $g "Phase 251 verifier"

$g = Test-Path -LiteralPath "$root\scripts\verify-phase252-e2e-journeys.ps1"
Gate "G17-verifier-252" $g "Phase 252 verifier"

$g = Test-Path -LiteralPath "$root\scripts\verify-phase253-perf-gates.ps1"
Gate "G18-verifier-253" $g "Phase 253 verifier"

$g = Test-Path -LiteralPath "$root\scripts\verify-phase254-resilience.ps1"
Gate "G19-verifier-254" $g "Phase 254 verifier"

$g = Test-Path -LiteralPath "$root\scripts\verify-phase255-dr-certification.ps1"
Gate "G20-verifier-255" $g "Phase 255 verifier"

# ── G21-G22: Drill and CI coverage ───────────────────────────────

Write-Host "`n--- Drills and CI ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\ops\drills\run-dr-certification-drill.ps1"
Gate "G21-dr-drill" $g "DR certification drill"

$g = Test-Path -LiteralPath "$root\.github\workflows\resilience-certification.yml"
Gate "G22-resilience-ci" $g "Resilience CI workflow"

# ── Summary ──────────────────────────────────────────────────────

$total = $pass + $fail
Write-Host "`n=== Phase 256 Summary ===" -ForegroundColor Cyan
Write-Host "  PASSED: $pass / $total"
Write-Host "  FAILED: $fail / $total"

if ($fail -gt 0) {
  Write-Host "  RESULT: FAIL" -ForegroundColor Red
} else {
  Write-Host "  RESULT: PASS" -ForegroundColor Green
}

exit $fail
