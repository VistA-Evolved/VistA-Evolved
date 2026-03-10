<#
.SYNOPSIS
  Phase 308 verifier -- Departmental Certification Runner (W12-P10)
.DESCRIPTION
  10 gates validating certification runner, routes, exports, contract tests,
  check coverage, and safety/PHI guards.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$pass = 0; $fail = 0
function Gate([string]$name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
    else         { Write-Host "  FAIL  $name" -ForegroundColor Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  $name ($_)" -ForegroundColor Red; $script:fail++
  }
}

$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n=== Phase 308: Departmental Certification Runner (W12-P10) ===`n"

# Gate 1: certification-runner.ts exists with key exports
Gate "G1: certification-runner.ts key exports" {
  $f = Join-Path $root "apps/api/src/writeback/certification-runner.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "runCertification" -Quiet) -and
    (Select-String -Path $f -Pattern "getCertificationSummary" -Quiet)
}

# Gate 2: 17 checks present -- static IDs + dynamic domain generation
Gate "G2: 17 certification checks" {
  $f = Join-Path $root "apps/api/src/writeback/certification-runner.ts"
  $content = Get-Content $f -Raw
  # Static IDs (11)
  $staticIds = @(
    "infra.command-bus", "infra.gates", "infra.audit", "infra.store-policy",
    "telehealth.encounter-link", "telehealth.consent", "telehealth.session-hardening",
    "safety.dry-run", "safety.kill-switch", "safety.intent-mapping", "safety.phi-guard"
  )
  $found = 0
  foreach ($id in $staticIds) {
    if ($content -match [regex]::Escape($id)) { $found++ }
  }
  # Dynamic domain IDs generated via ALL_DOMAINS.map(checkDomainExecutor) -- 6 domains
  $hasDomainMap = $content -match "ALL_DOMAINS\.map\(checkDomainExecutor\)"
  $hasDomainIdTemplate = $content -match 'domain\.\$\{domain\.toLowerCase\(\)\}'
  $hasAllDomains = $content -match '"TIU".*"ORDERS".*"PHARM".*"LAB".*"ADT".*"IMG"'
  ($found -eq 11) -and $hasDomainMap -and $hasDomainIdTemplate -and $hasAllDomains
}

# Gate 3: writeback-routes.ts has /writeback/certification endpoint
Gate "G3: certification endpoint in routes" {
  $f = Join-Path $root "apps/api/src/writeback/writeback-routes.ts"
  (Select-String -Path $f -Pattern "/writeback/certification" -Quiet) -and
    (Select-String -Path $f -Pattern "runCertification" -Quiet)
}

# Gate 4: writeback-routes.ts has /writeback/certification/summary endpoint
Gate "G4: certification/summary endpoint" {
  $f = Join-Path $root "apps/api/src/writeback/writeback-routes.ts"
  (Select-String -Path $f -Pattern "/writeback/certification/summary" -Quiet) -and
    (Select-String -Path $f -Pattern "getCertificationSummary" -Quiet)
}

# Gate 5: index.ts exports certification functions
Gate "G5: barrel exports certification" {
  $f = Join-Path $root "apps/api/src/writeback/index.ts"
  (Select-String -Path $f -Pattern "runCertification" -Quiet) -and
    (Select-String -Path $f -Pattern "getCertificationSummary" -Quiet) -and
    (Select-String -Path $f -Pattern "CertificationReport" -Quiet)
}

# Gate 6: Contract tests exist with describe block
Gate "G6: contract tests exist" {
  $f = Join-Path $root "apps/api/src/writeback/__tests__/certification-contract.test.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern 'describe\("certification-runner"' -Quiet) -and
    ((Select-String -Path $f -Pattern "it\(" | Measure-Object).Count -ge 14)
}

# Gate 7: CertificationReport type fields present
Gate "G7: CertificationReport type coverage" {
  $f = Join-Path $root "apps/api/src/writeback/certification-runner.ts"
  (Select-String -Path $f -Pattern "overallStatus" -Quiet) -and
    (Select-String -Path $f -Pattern "summary" -Quiet) -and
    (Select-String -Path $f -Pattern "checks" -Quiet) -and
    (Select-String -Path $f -Pattern "gateConfig" -Quiet) -and
    (Select-String -Path $f -Pattern "environment" -Quiet)
}

# Gate 8: All 6 domains validated via checkDomainExecutor
Gate "G8: all 6 domain checks" {
  $f = Join-Path $root "apps/api/src/writeback/certification-runner.ts"
  (Select-String -Path $f -Pattern "checkDomainExecutor" -Quiet) -and
    (Select-String -Path $f -Pattern "ALL_DOMAINS.map" -Quiet) -and
    (Select-String -Path $f -Pattern "dryRun" -Quiet)
}

# Gate 9: Safety checks present
Gate "G9: safety checks (dry-run, kill-switch, intent-mapping, phi-guard)" {
  $f = Join-Path $root "apps/api/src/writeback/certification-runner.ts"
  (Select-String -Path $f -Pattern "checkDryRunDefault" -Quiet) -and
    (Select-String -Path $f -Pattern "checkGlobalKillSwitch" -Quiet) -and
    (Select-String -Path $f -Pattern "checkIntentDomainMapping" -Quiet) -and
    (Select-String -Path $f -Pattern "checkNoPhiInTypes" -Quiet)
}

# Gate 10: No PHI in certification runner (SSN/cred patterns)
Gate "G10: no PHI in certification runner" {
  $f = Join-Path $root "apps/api/src/writeback/certification-runner.ts"
  $phiFound = $false
  if (Select-String -Path $f -Pattern "\b\d{3}-\d{2}-\d{4}\b" -Quiet) { $phiFound = $true }
  if (Select-String -Path $f -Pattern "PROV123|PHARM123|NURSE123" -Quiet) { $phiFound = $true }
  if (Select-String -Path $f -Pattern "patientName\s*[:=]" -Quiet) { $phiFound = $true }
  -not $phiFound
}

Write-Host "`n--- Results: $pass passed, $fail failed out of $($pass + $fail) ---"
if ($fail -gt 0) { exit 1 } else { Write-Host "ALL GATES PASSED" -ForegroundColor Green }
