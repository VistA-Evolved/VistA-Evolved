#!/usr/bin/env pwsh
<#
  Phase 108 -- Phase Audit Harness Verifier
  15 gates covering all Phase 108 deliverables.
#>
param([switch]$SkipDocker)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
    $script:total++
    if ($Ok) { $script:pass++; Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green }
    else     { $script:fail++; Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red }
}

Write-Host "`n=== Phase 108 Verifier: Phase Audit Harness (15 gates) ===`n"

# 1. build-phase-index.mjs exists
Gate "build-phase-index.mjs exists" (Test-Path -LiteralPath "scripts/build-phase-index.mjs") "scripts/build-phase-index.mjs"

# 2. generate-phase-qa.mjs exists
Gate "generate-phase-qa.mjs exists" (Test-Path -LiteralPath "scripts/generate-phase-qa.mjs") "scripts/generate-phase-qa.mjs"

# 3. phase-qa-runner.mjs exists
Gate "phase-qa-runner.mjs exists" (Test-Path -LiteralPath "scripts/phase-qa-runner.mjs") "scripts/phase-qa-runner.mjs"

# 4. phase-index-gate.mjs exists
Gate "phase-index-gate.mjs exists" (Test-Path -LiteralPath "scripts/qa-gates/phase-index-gate.mjs") "scripts/qa-gates/phase-index-gate.mjs"

# 5. phase-index.json exists
Gate "phase-index.json exists" (Test-Path -LiteralPath "docs/qa/phase-index.json") "docs/qa/phase-index.json"

# 6. phase-index.json has >= 115 phases
$phaseCount = 0
if (Test-Path -LiteralPath "docs/qa/phase-index.json") {
    $raw = Get-Content "docs/qa/phase-index.json" -Raw -Encoding UTF8
    if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
    $idx = $raw | ConvertFrom-Json
    $phaseCount = $idx.phaseCount
}
Gate "phase count >= 115" ($phaseCount -ge 115) "phaseCount: $phaseCount"

# 7. E2E spec files exist (>= 7)
$e2eCount = 0
if (Test-Path -LiteralPath "apps/web/e2e/phases") {
    $e2eCount = @(Get-ChildItem "apps/web/e2e/phases/*.spec.ts").Count
}
Gate "E2E spec files >= 7" ($e2eCount -ge 7) "count: $e2eCount"

# 8. API spec files exist (>= 2)
$apiCount = 0
if (Test-Path -LiteralPath "apps/api/tests/phases") {
    $apiCount = @(Get-ChildItem "apps/api/tests/phases/*.test.ts").Count
}
Gate "API spec files >= 2" ($apiCount -ge 2) "count: $apiCount"

# 9. package.json has qa:phase script
$pkgJson = Get-Content "package.json" -Raw
Gate "package.json has qa:phase" ($pkgJson -match '"qa:phase"') "qa:phase script registered"

# 10. package.json has qa:range script
Gate "package.json has qa:range" ($pkgJson -match '"qa:range"') "qa:range script registered"

# 11. package.json has qa:phase-index script
Gate "package.json has qa:phase-index" ($pkgJson -match '"qa:phase-index"') "qa:phase-index script registered"

# 12. package.json has qa:phase-audit script
Gate "package.json has qa:phase-audit" ($pkgJson -match '"qa:phase-audit"') "qa:phase-audit script registered"

# 13. qa-gauntlet.yml has phase-index-gate
$ciYml = Get-Content ".github/workflows/qa-gauntlet.yml" -Raw
Gate "CI has phase-index gate" ($ciYml -match "phase-index-gate") "in PR job"

# 14. qa-gauntlet.yml has phase-audit in nightly
Gate "CI has phase-audit nightly" ($ciYml -match "phase-audit") "in nightly job"

# 15. phase-index gate passes
$gateExit = 0
try {
    $null = node scripts/qa-gates/phase-index-gate.mjs 2>&1
    $gateExit = $LASTEXITCODE
} catch { $gateExit = 1 }
Gate "phase-index gate passes" ($gateExit -eq 0) "exit code: $gateExit"

# ---- Summary ----
Write-Host "`n=== Phase 108 Verifier: $total checks, $pass pass, $fail fail ===`n"
if ($fail -gt 0) {
    Write-Host "RESULT: FAIL ($fail gates failed)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "RESULT: ALL GATES PASSED" -ForegroundColor Green
    exit 0
}
