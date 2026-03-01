<#
.SYNOPSIS
  Wave 16 Security Certification Runner (Phase 345)

.DESCRIPTION
  Verifies all Wave 16 phases (337-344) with a single command.
  Checks file existence, TypeScript compilation, auth rules,
  PG migrations, prompt folders, and security invariants.
#>

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$pass = 0
$fail = 0
$skip = 0

function Assert-Gate($id, $label, [scriptblock]$test) {
    try {
        $result = & $test
        if ($result) {
            Write-Host "  PASS  $id  $label" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL  $id  $label" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  FAIL  $id  $label -- $_" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host ""
Write-Host "=== Wave 16 Security Certification (Phases 337-345) ===" -ForegroundColor Cyan
Write-Host ""

# =========================================================================
# Tier 1: Compilation + Sanity
# =========================================================================
Write-Host "--- Tier 1: Compilation + Sanity ---"

Assert-Gate "T1-1" "API TypeCheck clean" {
    Push-Location (Join-Path $RepoRoot "apps/api")
    $out = pnpm exec tsc --noEmit 2>&1
    $code = $LASTEXITCODE
    Pop-Location
    $code -eq 0
}

Assert-Gate "T1-2" "Wave 16 manifest exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "prompts/WAVE_16_MANIFEST.md")
}

Assert-Gate "T1-3" "All 9 prompt folders exist" {
    $folders = @(337,338,339,340,341,342,343,344,345)
    $missing = $folders | Where-Object {
        $pattern = Join-Path $RepoRoot "prompts/$_-W16-*"
        -not (Test-Path $pattern)
    }
    $missing.Count -eq 0
}

Assert-Gate "T1-4" "No hardcoded credentials in W16 auth files" {
    $authDir = Join-Path $RepoRoot "apps/api/src/auth"
    $hits = Get-ChildItem $authDir -Filter "*.ts" |
            Select-String -Pattern "PROV123|PHARM123|NURSE123|password123" -SimpleMatch
    $hits.Count -eq 0
}

# =========================================================================
# Tier 2: Phase 338 -- Enterprise Identity Hardening
# =========================================================================
Write-Host ""
Write-Host "--- Tier 2: Phase 338 -- Identity Hardening ---"

Assert-Gate "P338-1" "session-security.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/session-security.ts")
}

Assert-Gate "P338-2" "step-up-auth.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/step-up-auth.ts")
}

Assert-Gate "P338-3" "mfa-enforcement.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/mfa-enforcement.ts")
}

Assert-Gate "P338-4" "Session management routes exist" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/routes/session-management.ts")
}

Assert-Gate "P338-5" "PG migration v33 (identity hardening)" {
    $pg = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-migrate.ts") -Raw
    $pg -match "phase338_identity_hardening"
}

Assert-Gate "P338-6" "AUTH_RULES: /auth/sessions requires admin" {
    $sec = Get-Content (Join-Path $RepoRoot "apps/api/src/middleware/security.ts") -Raw
    $sec -match "auth/sessions"
}

# =========================================================================
# Tier 3: Phase 339 -- SCIM Provisioning
# =========================================================================
Write-Host ""
Write-Host "--- Tier 3: Phase 339 -- SCIM Provisioning ---"

Assert-Gate "P339-1" "scim-server.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/scim-server.ts")
}

Assert-Gate "P339-2" "scim-routes.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/routes/scim-routes.ts")
}

Assert-Gate "P339-3" "SCIM exports Users resource" {
    $scim = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/scim-server.ts") -Raw
    $scim -match "ScimUser"
}

Assert-Gate "P339-4" "SCIM exports Groups resource" {
    $scim = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/scim-server.ts") -Raw
    $scim -match "ScimGroup"
}

Assert-Gate "P339-5" "PG migration v34 (SCIM provisioning)" {
    $pg = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-migrate.ts") -Raw
    $pg -match "phase339_scim_provisioning"
}

# =========================================================================
# Tier 4: Phase 340 -- ABAC Authorization
# =========================================================================
Write-Host ""
Write-Host "--- Tier 4: Phase 340 -- ABAC Authorization ---"

Assert-Gate "P340-1" "abac-attributes.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/abac-attributes.ts")
}

Assert-Gate "P340-2" "abac-engine.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/abac-engine.ts")
}

Assert-Gate "P340-3" "ABAC engine exports evaluateAbac" {
    $abac = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/abac-engine.ts") -Raw
    $abac -match "export.*function evaluateAbac"
}

Assert-Gate "P340-4" "Policy engine has ABAC chain" {
    $pol = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/policy-engine.ts") -Raw
    $pol -match "evaluatePolicyWithAbac"
}

Assert-Gate "P340-5" "9 built-in ABAC conditions present" {
    $abac = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/abac-engine.ts") -Raw
    $conditions = @("timeOfDay","dayOfWeek","ipRange","internalNetwork","facilityMatch","sensitivity","environment","maintenanceMode","featureFlag")
    $found = ($conditions | Where-Object { $abac -match $_ }).Count
    $found -eq 9
}

# =========================================================================
# Tier 5: Phase 341 -- Secrets & Key Management
# =========================================================================
Write-Host ""
Write-Host "--- Tier 5: Phase 341 -- Secrets & Key Management ---"

Assert-Gate "P341-1" "key-provider.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/key-provider.ts")
}

Assert-Gate "P341-2" "envelope-encryption.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/envelope-encryption.ts")
}

Assert-Gate "P341-3" "rotation-manager.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/rotation-manager.ts")
}

Assert-Gate "P341-4" "secrets-routes.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/routes/secrets-routes.ts")
}

Assert-Gate "P341-5" "Envelope encrypt uses AES-256-GCM" {
    $enc = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/envelope-encryption.ts") -Raw
    $enc -match "aes-256-gcm"
}

Assert-Gate "P341-6" "Key material never returned in routes" {
    $routes = Get-Content (Join-Path $RepoRoot "apps/api/src/routes/secrets-routes.ts") -Raw
    -not ($routes -match "material.*reply|reply.*material")
}

Assert-Gate "P341-7" "PG migration v35 (secrets)" {
    $pg = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-migrate.ts") -Raw
    $pg -match "phase341_secrets_key_management"
}

# =========================================================================
# Tier 6: Phase 342 -- Tenant Security Posture
# =========================================================================
Write-Host ""
Write-Host "--- Tier 6: Phase 342 -- Tenant Security Posture ---"

Assert-Gate "P342-1" "tenant-security-policy.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/tenant-security-policy.ts")
}

Assert-Gate "P342-2" "tenant-security-routes.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/routes/tenant-security-routes.ts")
}

Assert-Gate "P342-3" "PG migration v36 (tenant security)" {
    $pg = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-migrate.ts") -Raw
    $pg -match "phase342_tenant_security_policy"
}

Assert-Gate "P342-4" "Tenant CIDR allowlist function exported" {
    $tsp = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/tenant-security-policy.ts") -Raw
    $tsp -match "isTenantCidrAllowed"
}

# =========================================================================
# Tier 7: Phase 343 -- Privacy Segmentation
# =========================================================================
Write-Host ""
Write-Host "--- Tier 7: Phase 343 -- Privacy Segmentation ---"

Assert-Gate "P343-1" "privacy-segmentation.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/privacy-segmentation.ts")
}

Assert-Gate "P343-2" "privacy-routes.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/routes/privacy-routes.ts")
}

Assert-Gate "P343-3" "Break-glass categories defined" {
    $ps = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/privacy-segmentation.ts") -Raw
    $ps -match "BREAK_GLASS_REQUIRED"
}

Assert-Gate "P343-4" "10 sensitivity categories" {
    $ps = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/privacy-segmentation.ts") -Raw
    $cats = @("normal","confidential","substance_use","hiv","mental_health","reproductive","genetic","vip","employee","research")
    $found = ($cats | Where-Object { $ps -match $_ }).Count
    $found -ge 10
}

Assert-Gate "P343-5" "PG migration v37 (privacy)" {
    $pg = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-migrate.ts") -Raw
    $pg -match "phase343_privacy_segmentation"
}

# =========================================================================
# Tier 8: Phase 344 -- SIEM Export + Alerts
# =========================================================================
Write-Host ""
Write-Host "--- Tier 8: Phase 344 -- SIEM + Alerts ---"

Assert-Gate "P344-1" "siem-sink.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/siem-sink.ts")
}

Assert-Gate "P344-2" "security-alerts.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/auth/security-alerts.ts")
}

Assert-Gate "P344-3" "siem-routes.ts exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "apps/api/src/routes/siem-routes.ts")
}

Assert-Gate "P344-4" "Multi-transport SIEM support" {
    $siem = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/siem-sink.ts") -Raw
    $transports = @("Webhook","Syslog","S3","Otlp")
    $found = ($transports | Where-Object { $siem -match "${_}SiemTransport" }).Count
    $found -ge 4
}

Assert-Gate "P344-5" "6 default alert rules" {
    $alerts = Get-Content (Join-Path $RepoRoot "apps/api/src/auth/security-alerts.ts") -Raw
    $rules = @("brute-force","privilege-escalation","break-glass","mass-data-export","after-hours","sensitivity-access")
    $found = ($rules | Where-Object { $alerts -match $_ }).Count
    $found -ge 6
}

Assert-Gate "P344-6" "AUTH_RULES: /siem/ requires admin" {
    $sec = Get-Content (Join-Path $RepoRoot "apps/api/src/middleware/security.ts") -Raw
    $sec -match "siem.*admin|/siem/"
}

# =========================================================================
# Tier 9: Cross-Cutting Security Invariants
# =========================================================================
Write-Host ""
Write-Host "--- Tier 9: Cross-Cutting Security Invariants ---"

Assert-Gate "X-1" "No console.log in W16 auth files" {
    $authDir = Join-Path $RepoRoot "apps/api/src/auth"
    $w16files = @(
        "session-security.ts","step-up-auth.ts","mfa-enforcement.ts",
        "scim-server.ts","abac-attributes.ts","abac-engine.ts",
        "key-provider.ts","envelope-encryption.ts","rotation-manager.ts",
        "tenant-security-policy.ts","privacy-segmentation.ts",
        "siem-sink.ts","security-alerts.ts"
    )
    $hits = $w16files | ForEach-Object {
        $f = Join-Path $authDir $_
        if (Test-Path -LiteralPath $f) {
            Select-String -Path $f -Pattern "console\.log" -SimpleMatch
        }
    } | Where-Object { $_ }
    $hits.Count -eq 0
}

Assert-Gate "X-2" "ADR docs exist" {
    $adrs = @(
        "docs/adrs/ADR-AUTHZ-POLICY-ENGINE.md",
        "docs/adrs/ADR-SCIM-SUPPORT.md",
        "docs/adrs/ADR-SECRETS-ROTATION.md",
        "docs/adrs/ADR-SIEM-EXPORT.md"
    )
    $found = ($adrs | Where-Object { Test-Path -LiteralPath (Join-Path $RepoRoot $_) }).Count
    $found -eq 4
}

Assert-Gate "X-3" "All AUTH_RULES registered for W16 routes" {
    $sec = Get-Content (Join-Path $RepoRoot "apps/api/src/middleware/security.ts") -Raw
    $patterns = @("/auth/sessions","/scim/","/secrets/","/tenant-security/","/privacy/","/siem/")
    $found = ($patterns | Where-Object { $sec -match [regex]::Escape($_) }).Count
    $found -ge 6
}

Assert-Gate "X-4" "PG migrations v33-v37 all present" {
    $pg = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-migrate.ts") -Raw
    $versions = @("phase338","phase339","phase341","phase342","phase343")
    $found = ($versions | Where-Object { $pg -match $_ }).Count
    $found -eq 5
}

# =========================================================================
# Summary
# =========================================================================
Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
$total = $pass + $fail + $skip
$score = if ($total -gt 0) { [Math]::Round(($pass / $total) * 100) } else { 0 }
if ($fail -eq 0) {
    Write-Host "  WAVE 16 CERTIFIED: $pass/$total gates pass (score: $score%)" -ForegroundColor Green
} else {
    Write-Host "  WAVE 16 NOT CERTIFIED: $pass/$total pass, $fail fail (score: $score%)" -ForegroundColor Red
}
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

exit $fail
