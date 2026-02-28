<#
.SYNOPSIS
  Phase 307 verifier -- Telehealth Provider Hardening (W12-P9)
.DESCRIPTION
  10 gates validating encounter linkage, consent posture, session hardening,
  audit actions, store-policy entries, no-PHI, and configuration.
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

Write-Host "`n=== Phase 307: Telehealth Provider Hardening (W12-P9) ===`n"

# Gate 1: encounter-link.ts exists with key exports
Gate "G1: encounter-link.ts key exports" {
  $f = Join-Path $root "apps/api/src/telehealth/encounter-link.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "createEncounterLink" -Quiet) -and
    (Select-String -Path $f -Pattern "updateLinkStatus" -Quiet) -and
    (Select-String -Path $f -Pattern "hashPatientRef" -Quiet)
}

# Gate 2: consent-posture.ts exists with key exports
Gate "G2: consent-posture.ts key exports" {
  $f = Join-Path $root "apps/api/src/telehealth/consent-posture.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "recordConsent" -Quiet) -and
    (Select-String -Path $f -Pattern "evaluateConsentPosture" -Quiet) -and
    (Select-String -Path $f -Pattern "withdrawConsent" -Quiet)
}

# Gate 3: session-hardening.ts exists with key exports
Gate "G3: session-hardening.ts key exports" {
  $f = Join-Path $root "apps/api/src/telehealth/session-hardening.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "recordHeartbeat" -Quiet) -and
    (Select-String -Path $f -Pattern "sweepStaleSessions" -Quiet) -and
    (Select-String -Path $f -Pattern "getSessionMetrics" -Quiet)
}

# Gate 4: Contract tests exist with all 3 describe blocks
Gate "G4: contract tests cover all 3 modules" {
  $f = Join-Path $root "apps/api/src/writeback/__tests__/telehealth-hardening-contract.test.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern 'describe\("encounter-link"' -Quiet) -and
    (Select-String -Path $f -Pattern 'describe\("consent-posture"' -Quiet) -and
    (Select-String -Path $f -Pattern 'describe\("session-hardening"' -Quiet)
}

# Gate 5: immutable-audit.ts has telehealth audit actions
Gate "G5: immutable-audit telehealth actions" {
  $f = Join-Path $root "apps/api/src/lib/immutable-audit.ts"
  (Select-String -Path $f -Pattern "telehealth.encounter_link" -Quiet) -and
    (Select-String -Path $f -Pattern "telehealth.consent_recorded" -Quiet) -and
    (Select-String -Path $f -Pattern "telehealth.consent_withdrawn" -Quiet) -and
    (Select-String -Path $f -Pattern "telehealth.session_auto_ended" -Quiet)
}

# Gate 6: store-policy.ts has 3 telehealth store entries
Gate "G6: store-policy telehealth stores" {
  $f = Join-Path $root "apps/api/src/platform/store-policy.ts"
  (Select-String -Path $f -Pattern "telehealth-encounter-links" -Quiet) -and
    (Select-String -Path $f -Pattern "telehealth-consent-records" -Quiet) -and
    (Select-String -Path $f -Pattern "telehealth-heartbeats" -Quiet)
}

# Gate 7: No PHI in new files (scan for SSN/DOB/patientName patterns)
Gate "G7: no PHI in new files" {
  $files = @(
    (Join-Path $root "apps/api/src/telehealth/encounter-link.ts"),
    (Join-Path $root "apps/api/src/telehealth/consent-posture.ts"),
    (Join-Path $root "apps/api/src/telehealth/session-hardening.ts")
  )
  $phiFound = $false
  foreach ($f in $files) {
    if (Select-String -Path $f -Pattern "\b\d{3}-\d{2}-\d{4}\b" -Quiet) { $phiFound = $true }
    if (Select-String -Path $f -Pattern "patientName\s*[:=]" -Quiet) { $phiFound = $true }
    if (Select-String -Path $f -Pattern "PROV123|PHARM123|NURSE123" -Quiet) { $phiFound = $true }
  }
  -not $phiFound
}

# Gate 8: encounter-link has vistaGrounding metadata
Gate "G8: encounter-link vistaGrounding" {
  $f = Join-Path $root "apps/api/src/telehealth/encounter-link.ts"
  (Select-String -Path $f -Pattern "vistaGrounding" -Quiet) -and
    (Select-String -Path $f -Pattern "ORWPCE SAVE" -Quiet) -and
    (Select-String -Path $f -Pattern "integration_pending" -Quiet)
}

# Gate 9: consent-posture defaults recording OFF
Gate "G9: consent recording OFF by default" {
  $f = Join-Path $root "apps/api/src/telehealth/consent-posture.ts"
  (Select-String -Path $f -Pattern 'defaultDecision.*"denied"' -Quiet) -and
    (Select-String -Path $f -Pattern "telehealth_recording" -Quiet) -and
    (Select-String -Path $f -Pattern "Recording OFF by default" -Quiet)
}

# Gate 10: session-hardening has configurable env vars
Gate "G10: session-hardening env var config" {
  $f = Join-Path $root "apps/api/src/telehealth/session-hardening.ts"
  (Select-String -Path $f -Pattern "TELEHEALTH_HEARTBEAT_INTERVAL_MS" -Quiet) -and
    (Select-String -Path $f -Pattern "TELEHEALTH_RECONNECTION_WINDOW_MS" -Quiet) -and
    (Select-String -Path $f -Pattern "TELEHEALTH_AUTO_END_TIMEOUT_MS" -Quiet)
}

Write-Host "`n--- Results: $pass passed, $fail failed out of $($pass + $fail) ---"
if ($fail -gt 0) { exit 1 } else { Write-Host "ALL GATES PASSED" -ForegroundColor Green }
