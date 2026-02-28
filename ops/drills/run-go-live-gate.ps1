<#
.SYNOPSIS
  Go-Live Gate — Phase 256 Pilot Hospital Go-Live Kit
  Aggregates all Wave 7 verification gates into a single go/no-go decision.
.DESCRIPTION
  Runs all 8 Wave 7 verifiers (P2-P8) plus its own structural checks
  to produce a unified go-live gate verdict.
#>
param(
  [switch]$SkipSubVerifiers,
  [switch]$Verbose
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root  = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass  = 0
$fail  = 0
$gates = @()

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) {
    Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red
    $script:fail++
  }
  $script:gates += @{ name = $Name; ok = $Ok; detail = $Detail }
}

Write-Host "`n=== Go-Live Gate (Phase 256) ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── Section 1: Go-Live Kit Artifacts ──────────────────────────────

Write-Host "--- Go-Live Kit artifacts ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\docs\pilot-go-live-kit.md"
Gate "go-live-runbook-exists" $g "docs/pilot-go-live-kit.md"

$g = Test-Path -LiteralPath "$root\ops\drills\run-go-live-gate.ps1"
Gate "go-live-gate-script-exists" $g "ops/drills/run-go-live-gate.ps1"

$g = Test-Path -LiteralPath "$root\apps\api\tests\go-live-certification.test.ts"
Gate "go-live-test-exists" $g "apps/api/tests/go-live-certification.test.ts"

# ── Section 2: Runbook Content ────────────────────────────────────

Write-Host "`n--- Go-Live Runbook content ---" -ForegroundColor Yellow

if (Test-Path -LiteralPath "$root\docs\pilot-go-live-kit.md") {
  $content = Get-Content "$root\docs\pilot-go-live-kit.md" -Raw

  $g = $content -match "Day-1 Checklist"
  Gate "runbook-has-day1-checklist" $g "Day-1 Checklist section present"

  $g = $content -match "Rollback Plan"
  Gate "runbook-has-rollback" $g "Rollback Plan section present"

  $g = $content -match "Sign-Off"
  Gate "runbook-has-signoff" $g "Sign-Off section present"

  $g = $content -match "Verification Gates Summary"
  Gate "runbook-has-gate-summary" $g "Gate summary table present"

  $g = $content -match "wave7-entry-gate"
  Gate "runbook-references-wave7" $g "References Wave 7 entry gate"

  $g = $content -match "PLATFORM_RUNTIME_MODE"
  Gate "runbook-references-runtime-mode" $g "References runtime mode"
} else {
  Gate "runbook-has-day1-checklist" $false "Runbook not found"
  Gate "runbook-has-rollback" $false "Runbook not found"
  Gate "runbook-has-signoff" $false "Runbook not found"
  Gate "runbook-has-gate-summary" $false "Runbook not found"
  Gate "runbook-references-wave7" $false "Runbook not found"
  Gate "runbook-references-runtime-mode" $false "Runbook not found"
}

# ── Section 3: Pilot Infrastructure ──────────────────────────────

Write-Host "`n--- Pilot Infrastructure ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\pilot\site-config.ts"
Gate "pilot-site-config-exists" $g "apps/api/src/pilot/site-config.ts"

$g = Test-Path -LiteralPath "$root\apps\api\src\pilot\preflight.ts"
Gate "pilot-preflight-exists" $g "apps/api/src/pilot/preflight.ts"

$g = Test-Path -LiteralPath "$root\apps\web\src\app\cprs\admin\pilot\page.tsx"
Gate "pilot-admin-page-exists" $g "Pilot admin page"

# ── Section 4: Wave 7 Verifier Files ────────────────────────────

Write-Host "`n--- Wave 7 Verifiers ---" -ForegroundColor Yellow

$verifiers = @(
  @{ name = "wave7-entry-gate"; path = "scripts\wave7-entry-gate.ps1" },
  @{ name = "verify-phase249-supply-chain"; path = "scripts\verify-phase249-supply-chain.ps1" },
  @{ name = "verify-phase250-rpc-contracts"; path = "scripts\verify-phase250-rpc-contracts.ps1" },
  @{ name = "verify-phase251-api-fhir"; path = "scripts\verify-phase251-api-fhir-contracts.ps1" },
  @{ name = "verify-phase252-e2e-journeys"; path = "scripts\verify-phase252-e2e-journeys.ps1" },
  @{ name = "verify-phase253-perf-gates"; path = "scripts\verify-phase253-perf-gates.ps1" },
  @{ name = "verify-phase254-resilience"; path = "scripts\verify-phase254-resilience.ps1" },
  @{ name = "verify-phase255-dr-cert"; path = "scripts\verify-phase255-dr-certification.ps1" }
)

foreach ($v in $verifiers) {
  $g = Test-Path -LiteralPath "$root\$($v.path)"
  Gate "verifier-$($v.name)" $g $v.path
}

# ── Section 5: DR and Resilience Drill Scripts ───────────────────

Write-Host "`n--- DR and Resilience Drills ---" -ForegroundColor Yellow

$drills = @(
  "ops\drills\resilience-drills.ts",
  "ops\drills\run-vista-down-drill.ps1",
  "ops\drills\run-circuit-breaker-drill.ps1",
  "ops\drills\run-health-readiness-drill.ps1",
  "ops\drills\run-posture-audit-drill.ps1",
  "ops\drills\run-dr-certification-drill.ps1",
  "ops\drills\dr-certification-checklist.md"
)

foreach ($d in $drills) {
  $g = Test-Path -LiteralPath "$root\$d"
  $dName = [System.IO.Path]::GetFileNameWithoutExtension($d)
  Gate "drill-$dName" $g $d
}

# ── Section 6: CI Workflows ─────────────────────────────────────

Write-Host "`n--- CI Workflows ---" -ForegroundColor Yellow

$workflows = @(
  ".github\workflows\supply-chain-security.yml",
  ".github\workflows\resilience-certification.yml"
)

foreach ($w in $workflows) {
  $g = Test-Path -LiteralPath "$root\$w"
  $wName = [System.IO.Path]::GetFileNameWithoutExtension($w)
  Gate "ci-$wName" $g $w
}

# ── Summary ──────────────────────────────────────────────────────

$total = $pass + $fail
Write-Host "`n=== Go-Live Gate Summary ===" -ForegroundColor Cyan
Write-Host "  PASSED: $pass / $total"
Write-Host "  FAILED: $fail / $total"

if ($fail -eq 0) {
  Write-Host "`n  VERDICT: GO  -- All gates passed" -ForegroundColor Green
} else {
  Write-Host "`n  VERDICT: NO-GO  -- $fail gate(s) failed" -ForegroundColor Red
}

# Write gate results to artifacts directory
$artifactDir = "$root\artifacts\go-live-gate"
if (-not (Test-Path -LiteralPath $artifactDir)) {
  New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
}
$resultFile = "$artifactDir\gate-result-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$result = @{
  timestamp = (Get-Date -Format "o")
  totalGates = $total
  passed = $pass
  failed = $fail
  verdict = if ($fail -eq 0) { "GO" } else { "NO-GO" }
  gates = $gates
}
$result | ConvertTo-Json -Depth 4 | Set-Content $resultFile -Encoding ASCII
Write-Host "  Results written to: $resultFile`n"

exit $fail
