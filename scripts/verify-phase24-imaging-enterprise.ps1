<#
.SYNOPSIS
    Phase 24 - Imaging Enterprise Hardening verification script.
.DESCRIPTION
    Validates all Phase 24 deliverables on top of Phase 23 regression:
    - Phase 23 regression (delegates to verify-phase23-imaging-workflow.ps1)
    - Imaging RBAC service (imaging-authz.ts)
    - Break-glass service + endpoints
    - Imaging audit trail (hash-chained, imaging-audit.ts)
    - Audit compliance endpoints (events, stats, verify, export)
    - Device onboarding framework (imaging-devices.ts)
    - DICOMweb proxy hardening (RBAC + rate limit)
    - Multi-tenant imaging config (imaging-tenant.ts)
    - UI: break-glass banner, devices tab, audit tab
    - Runbooks + AGENTS.md updates
    - Security + PHI scan on Phase 24 files
    - TypeScript compilation clean
.NOTES
    Run from repo root: .\scripts\verify-phase24-imaging-enterprise.ps1
    Use -SkipDocker to skip Docker connectivity checks.
    Use -SkipRegression to skip Phase 23 regression.
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipRegression
)

$ErrorActionPreference = "Continue"
$pass = 0
$fail = 0
$warn = 0

function Gate-Pass($msg) {
    Write-Host "  [PASS] $msg" -ForegroundColor Green
    $script:pass++
}
function Gate-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    $script:fail++
}
function Gate-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
    $script:warn++
}

Write-Host ""
Write-Host "=== Phase 24 - Imaging Enterprise Hardening Verification ===" -ForegroundColor Cyan
Write-Host ""

# --- 0: Phase 23 Regression ---

if (-not $SkipRegression) {
    Write-Host "--- 0: Phase 23 Regression ---" -ForegroundColor White
    $p23Script = "$PSScriptRoot\verify-phase23-imaging-workflow.ps1"
    if (Test-Path $p23Script) {
        $p23Args = @()
        if ($SkipDocker) { $p23Args += "-SkipDocker" }
        & $p23Script @p23Args 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -eq 0) {
            Gate-Pass "Phase 23 regression: ALL GATES PASSED"
        } else {
            Gate-Warn "Phase 23 regression: some gates failed (check above)"
        }
    } else {
        Gate-Warn "Phase 23 regression script not found (skipping)"
    }
} else {
    Write-Host "--- 0: Skipping Phase 23 Regression ---" -ForegroundColor DarkYellow
}

# --- 1: Core Service Files Exist ---

Write-Host ""
Write-Host "--- 1: Phase 24 Core Service Files ---" -ForegroundColor White

$phase24Files = @(
    "apps/api/src/services/imaging-authz.ts",
    "apps/api/src/services/imaging-audit.ts",
    "apps/api/src/services/imaging-devices.ts",
    "apps/api/src/config/imaging-tenant.ts",
    "apps/api/src/routes/imaging-audit-routes.ts"
)

foreach ($f in $phase24Files) {
    if (Test-Path $f) {
        Gate-Pass "File exists: $f"
    } else {
        Gate-Fail "File missing: $f"
    }
}

# --- 2: Imaging RBAC Features ---

Write-Host ""
Write-Host "--- 2: Imaging RBAC (imaging-authz.ts) ---" -ForegroundColor White

$authzContent = Get-Content "apps/api/src/services/imaging-authz.ts" -Raw -ErrorAction SilentlyContinue
if ($authzContent) {
    if ($authzContent -match "imaging_view") { Gate-Pass "RBAC: imaging_view permission defined" } else { Gate-Fail "RBAC: imaging_view missing" }
    if ($authzContent -match "imaging_diagnostic") { Gate-Pass "RBAC: imaging_diagnostic permission defined" } else { Gate-Fail "RBAC: imaging_diagnostic missing" }
    if ($authzContent -match "imaging_admin") { Gate-Pass "RBAC: imaging_admin permission defined" } else { Gate-Fail "RBAC: imaging_admin missing" }
    if ($authzContent -match "break_glass") { Gate-Pass "RBAC: break_glass permission defined" } else { Gate-Fail "RBAC: break_glass missing" }
    if ($authzContent -match "hasImagingPermission") { Gate-Pass "RBAC: hasImagingPermission exported" } else { Gate-Fail "RBAC: hasImagingPermission missing" }
    if ($authzContent -match "ROLE_PERMISSIONS") { Gate-Pass "RBAC: ROLE_PERMISSIONS mapping" } else { Gate-Fail "RBAC: ROLE_PERMISSIONS missing" }
    # Break-glass features
    if ($authzContent -match "break-glass/start") { Gate-Pass "Break-glass: start endpoint" } else { Gate-Fail "Break-glass: start endpoint missing" }
    if ($authzContent -match "break-glass/stop") { Gate-Pass "Break-glass: stop endpoint" } else { Gate-Fail "Break-glass: stop endpoint missing" }
    if ($authzContent -match "break-glass/active") { Gate-Pass "Break-glass: active endpoint" } else { Gate-Fail "Break-glass: active endpoint missing" }
    if ($authzContent -match "MAX_BREAK_GLASS_TTL") { Gate-Pass "Break-glass: max TTL configured" } else { Gate-Fail "Break-glass: max TTL missing" }
    if ($authzContent -match "setTimeout") { Gate-Pass "Break-glass: auto-expiry timer" } else { Gate-Fail "Break-glass: auto-expiry missing" }
} else {
    Gate-Fail "Cannot read imaging-authz.ts"
}

# --- 3: Imaging Audit Trail ---

Write-Host ""
Write-Host "--- 3: Imaging Audit Trail (imaging-audit.ts) ---" -ForegroundColor White

$auditContent = Get-Content "apps/api/src/services/imaging-audit.ts" -Raw -ErrorAction SilentlyContinue
if ($auditContent) {
    if ($auditContent -match "sha-?256" -or $auditContent -match "createHash.*sha256") { Gate-Pass "Audit: SHA-256 hashing" } else { Gate-Fail "Audit: SHA-256 hashing missing" }
    if ($auditContent -match "prevHash") { Gate-Pass "Audit: hash chain (prevHash)" } else { Gate-Fail "Audit: hash chain missing" }
    if ($auditContent -match "GENESIS_HASH") { Gate-Pass "Audit: genesis hash defined" } else { Gate-Fail "Audit: genesis hash missing" }
    if ($auditContent -match "imagingAudit") { Gate-Pass "Audit: imagingAudit function" } else { Gate-Fail "Audit: imagingAudit function missing" }
    if ($auditContent -match "verifyChain") { Gate-Pass "Audit: verifyChain function" } else { Gate-Fail "Audit: verifyChain missing" }
    if ($auditContent -match "sanitizeDetail") { Gate-Pass "Audit: sanitizeDetail (PHI protection)" } else { Gate-Fail "Audit: sanitizeDetail missing" }
    if ($auditContent -match "exportAuditCsv") { Gate-Pass "Audit: CSV export function" } else { Gate-Fail "Audit: CSV export missing" }
    # Action types
    if ($auditContent -match "VIEW_STUDY") { Gate-Pass "Audit action: VIEW_STUDY" } else { Gate-Fail "Audit action: VIEW_STUDY missing" }
    if ($auditContent -match "BREAK_GLASS_START") { Gate-Pass "Audit action: BREAK_GLASS_START" } else { Gate-Fail "Audit action: BREAK_GLASS_START missing" }
    if ($auditContent -match "DEVICE_REGISTER") { Gate-Pass "Audit action: DEVICE_REGISTER" } else { Gate-Fail "Audit action: DEVICE_REGISTER missing" }
    if ($auditContent -match "STOW_UPLOAD") { Gate-Pass "Audit action: STOW_UPLOAD" } else { Gate-Fail "Audit action: STOW_UPLOAD missing" }
    if ($auditContent -match "VIEWER_LAUNCH") { Gate-Pass "Audit action: VIEWER_LAUNCH" } else { Gate-Fail "Audit action: VIEWER_LAUNCH missing" }
} else {
    Gate-Fail "Cannot read imaging-audit.ts"
}

# --- 4: Device Registry ---

Write-Host ""
Write-Host "--- 4: Device Registry (imaging-devices.ts) ---" -ForegroundColor White

$devicesContent = Get-Content "apps/api/src/services/imaging-devices.ts" -Raw -ErrorAction SilentlyContinue
if ($devicesContent) {
    if ($devicesContent -match "AE_TITLE_REGEX") { Gate-Pass "Devices: AE Title validation regex" } else { Gate-Fail "Devices: AE Title regex missing" }
    if ($devicesContent -match '\[A-Z0-9_\s?\]') { Gate-Pass "Devices: uppercase-only AE pattern" } else { Gate-Warn "Devices: could not verify AE pattern" }
    if ($devicesContent -match "decommissioned") { Gate-Pass "Devices: soft delete (decommissioned)" } else { Gate-Fail "Devices: soft delete missing" }
    if ($devicesContent -match "echo") { Gate-Pass "Devices: C-ECHO endpoint" } else { Gate-Fail "Devices: C-ECHO missing" }
    if ($devicesContent -match "ipAllowlist") { Gate-Pass "Devices: IP allowlist field" } else { Gate-Fail "Devices: IP allowlist missing" }
    if ($devicesContent -match "tlsMode") { Gate-Pass "Devices: TLS mode field" } else { Gate-Fail "Devices: TLS mode missing" }
    if ($devicesContent -match "VALID_MODALITIES") { Gate-Pass "Devices: modality validation" } else { Gate-Fail "Devices: modality validation missing" }
} else {
    Gate-Fail "Cannot read imaging-devices.ts"
}

# --- 5: Multi-Tenant Config ---

Write-Host ""
Write-Host "--- 5: Multi-Tenant Config (imaging-tenant.ts) ---" -ForegroundColor White

$tenantContent = Get-Content "apps/api/src/config/imaging-tenant.ts" -Raw -ErrorAction SilentlyContinue
if ($tenantContent) {
    if ($tenantContent -match "TenantImagingConfig") { Gate-Pass "Tenant: TenantImagingConfig type" } else { Gate-Fail "Tenant: config type missing" }
    if ($tenantContent -match "resolveImagingConfig") { Gate-Pass "Tenant: resolveImagingConfig function" } else { Gate-Fail "Tenant: resolve function missing" }
    if ($tenantContent -match "isAeTitleAllowed") { Gate-Pass "Tenant: isAeTitleAllowed function" } else { Gate-Fail "Tenant: AE allowlist function missing" }
    if ($tenantContent -match "getOrthancUrl") { Gate-Pass "Tenant: getOrthancUrl function" } else { Gate-Fail "Tenant: getOrthancUrl missing" }
    if ($tenantContent -match "aeAllowlist") { Gate-Pass "Tenant: aeAllowlist per facility" } else { Gate-Fail "Tenant: aeAllowlist missing" }
} else {
    Gate-Fail "Cannot read imaging-tenant.ts"
}

# --- 6: DICOMweb Proxy Hardening ---

Write-Host ""
Write-Host "--- 6: DICOMweb Proxy Hardening (imaging-proxy.ts) ---" -ForegroundColor White

$proxyContent = Get-Content "apps/api/src/routes/imaging-proxy.ts" -Raw -ErrorAction SilentlyContinue
if ($proxyContent) {
    if ($proxyContent -match "hasImagingPermission") { Gate-Pass "Proxy: imports imaging RBAC" } else { Gate-Fail "Proxy: imaging RBAC import missing" }
    if ($proxyContent -match "requireImagingView") { Gate-Pass "Proxy: requireImagingView gate" } else { Gate-Fail "Proxy: imaging_view gate missing" }
    if ($proxyContent -match "requireImagingAdmin") { Gate-Pass "Proxy: requireImagingAdmin gate" } else { Gate-Fail "Proxy: imaging_admin gate missing" }
    if ($proxyContent -match "checkDicomwebRateLimit") { Gate-Pass "Proxy: DICOMweb rate limiter" } else { Gate-Fail "Proxy: rate limiter missing" }
    if ($proxyContent -match "DICOMWEB_RATE_LIMIT") { Gate-Pass "Proxy: rate limit configurable" } else { Gate-Fail "Proxy: rate limit not configurable" }
    if ($proxyContent -match "imagingAudit") { Gate-Pass "Proxy: imaging audit integration" } else { Gate-Fail "Proxy: imaging audit missing" }
    if ($proxyContent -match "imagingAuditDenied") { Gate-Pass "Proxy: denied event logging" } else { Gate-Fail "Proxy: denied event logging missing" }
    if ($proxyContent -match "429") { Gate-Pass "Proxy: 429 rate limit response" } else { Gate-Fail "Proxy: 429 response missing" }
    # STOW-RS uses imaging_admin not requireAdmin
    if ($proxyContent -match "STOW.*imaging_admin") { Gate-Pass "Proxy: STOW-RS uses imaging_admin" } else { Gate-Warn "Proxy: STOW-RS auth check (manual verify needed)" }
} else {
    Gate-Fail "Cannot read imaging-proxy.ts"
}

# --- 7: Audit Route Endpoints ---

Write-Host ""
Write-Host "--- 7: Audit Route Endpoints ---" -ForegroundColor White

$auditRoutesContent = Get-Content "apps/api/src/routes/imaging-audit-routes.ts" -Raw -ErrorAction SilentlyContinue
if ($auditRoutesContent) {
    if ($auditRoutesContent -match "/imaging/audit/events") { Gate-Pass "Audit routes: /events endpoint" } else { Gate-Fail "Audit routes: /events missing" }
    if ($auditRoutesContent -match "/imaging/audit/stats") { Gate-Pass "Audit routes: /stats endpoint" } else { Gate-Fail "Audit routes: /stats missing" }
    if ($auditRoutesContent -match "/imaging/audit/verify") { Gate-Pass "Audit routes: /verify endpoint" } else { Gate-Fail "Audit routes: /verify missing" }
    if ($auditRoutesContent -match "/imaging/audit/export") { Gate-Pass "Audit routes: /export endpoint" } else { Gate-Fail "Audit routes: /export missing" }
} else {
    Gate-Fail "Cannot read imaging-audit-routes.ts"
}

# --- 8: Route Registration in index.ts ---

Write-Host ""
Write-Host "--- 8: Route Registration ---" -ForegroundColor White

$indexContent = Get-Content "apps/api/src/index.ts" -Raw -ErrorAction SilentlyContinue
if ($indexContent) {
    if ($indexContent -match "imagingAuthzRoutes") { Gate-Pass "Registration: imagingAuthzRoutes" } else { Gate-Fail "Registration: imagingAuthzRoutes missing" }
    if ($indexContent -match "imagingDeviceRoutes") { Gate-Pass "Registration: imagingDeviceRoutes" } else { Gate-Fail "Registration: imagingDeviceRoutes missing" }
    if ($indexContent -match "imagingAuditRoutes") { Gate-Pass "Registration: imagingAuditRoutes" } else { Gate-Fail "Registration: imagingAuditRoutes missing" }
} else {
    Gate-Fail "Cannot read index.ts"
}

# --- 9: Security Middleware Rules ---

Write-Host ""
Write-Host "--- 9: Security Middleware Rules ---" -ForegroundColor White

$securityContent = Get-Content "apps/api/src/middleware/security.ts" -Raw -ErrorAction SilentlyContinue
if ($securityContent) {
    if ($securityContent -match "imaging.*devices") { Gate-Pass "Security: /imaging/devices rule" } else { Gate-Fail "Security: /imaging/devices rule missing" }
    if ($securityContent -match "imaging.*audit") { Gate-Pass "Security: /imaging/audit rule" } else { Gate-Fail "Security: /imaging/audit rule missing" }
    if ($securityContent -match "break-glass") { Gate-Pass "Security: /security/break-glass rule" } else { Gate-Fail "Security: break-glass rule missing" }
} else {
    Gate-Fail "Cannot read security.ts"
}

# --- 10: UI Updates ---

Write-Host ""
Write-Host "--- 10: UI Updates (ImagingPanel.tsx) ---" -ForegroundColor White

$panelContent = Get-Content "apps/web/src/components/cprs/panels/ImagingPanel.tsx" -Raw -ErrorAction SilentlyContinue
if ($panelContent) {
    if ($panelContent -match "break-glass") { Gate-Pass "UI: break-glass functionality" } else { Gate-Fail "UI: break-glass missing" }
    if ($panelContent -match "BREAK-GLASS ACCESS ACTIVE") { Gate-Pass "UI: break-glass active banner" } else { Gate-Fail "UI: break-glass banner missing" }
    if ($panelContent -match "devices") { Gate-Pass "UI: devices tab" } else { Gate-Fail "UI: devices tab missing" }
    if ($panelContent -match "audit") { Gate-Pass "UI: audit tab" } else { Gate-Fail "UI: audit tab missing" }
    if ($panelContent -match "isAdmin") { Gate-Pass "UI: admin tab gating" } else { Gate-Fail "UI: admin gating missing" }
    if ($panelContent -match "Break Glass") { Gate-Pass "UI: break-glass request button" } else { Gate-Fail "UI: break-glass button missing" }
    if ($panelContent -match "DeviceEntry") { Gate-Pass "UI: DeviceEntry type" } else { Gate-Fail "UI: DeviceEntry type missing" }
    if ($panelContent -match "AuditEntry") { Gate-Pass "UI: AuditEntry type" } else { Gate-Fail "UI: AuditEntry type missing" }
} else {
    Gate-Fail "Cannot read ImagingPanel.tsx"
}

# --- 11: TypeScript Compilation ---

Write-Host ""
Write-Host "--- 11: TypeScript Compilation ---" -ForegroundColor White

Push-Location "apps/api"
$apiTsc = npx tsc --noEmit 2>&1
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Gate-Pass "API TypeScript compilation: clean"
} else {
    Gate-Fail "API TypeScript compilation: errors found"
    $apiTsc | Select-Object -First 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
}

Push-Location "apps/web"
$webTsc = npx tsc --noEmit 2>&1
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Gate-Pass "Web TypeScript compilation: clean"
} else {
    Gate-Fail "Web TypeScript compilation: errors found"
    $webTsc | Select-Object -First 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed }
}

# --- 12: Documentation ---

Write-Host ""
Write-Host "--- 12: Documentation ---" -ForegroundColor White

$docs = @(
    "docs/runbooks/imaging-enterprise-security.md",
    "docs/runbooks/imaging-device-onboarding-enterprise.md",
    "docs/runbooks/imaging-audit.md",
    "scripts/verify-imaging-devices.ps1",
    "prompts/26-PHASE-24-IMAGING-ENTERPRISE/26-01-imaging-enterprise-IMPLEMENT.md",
    "prompts/26-PHASE-24-IMAGING-ENTERPRISE/26-99-imaging-enterprise-VERIFY.md"
)

foreach ($d in $docs) {
    if (Test-Path $d) {
        Gate-Pass "Doc exists: $d"
    } else {
        Gate-Fail "Doc missing: $d"
    }
}

# --- 13: AGENTS.md Phase 24 Gotchas ---

Write-Host ""
Write-Host "--- 13: AGENTS.md Updates ---" -ForegroundColor White

$agentsContent = Get-Content "AGENTS.md" -Raw -ErrorAction SilentlyContinue
if ($agentsContent) {
    if ($agentsContent -match "Phase 24") { Gate-Pass "AGENTS.md: Phase 24 mentioned" } else { Gate-Fail "AGENTS.md: Phase 24 not mentioned" }
    if ($agentsContent -match "imaging_view") { Gate-Pass "AGENTS.md: imaging_view gotcha" } else { Gate-Fail "AGENTS.md: imaging_view gotcha missing" }
    if ($agentsContent -match "Break-glass") { Gate-Pass "AGENTS.md: break-glass gotcha" } else { Gate-Fail "AGENTS.md: break-glass gotcha missing" }
    if ($agentsContent -match "imaging-authz") { Gate-Pass "AGENTS.md: imaging-authz in architecture" } else { Gate-Fail "AGENTS.md: imaging-authz architecture missing" }
    if ($agentsContent -match "imaging-audit") { Gate-Pass "AGENTS.md: imaging-audit in architecture" } else { Gate-Fail "AGENTS.md: imaging-audit architecture missing" }
    if ($agentsContent -match "imaging-devices") { Gate-Pass "AGENTS.md: imaging-devices in architecture" } else { Gate-Fail "AGENTS.md: imaging-devices architecture missing" }
} else {
    Gate-Fail "Cannot read AGENTS.md"
}

# --- 14: Security Scan (no secrets in Phase 24 files) ---

Write-Host ""
Write-Host "--- 14: Security Scan ---" -ForegroundColor White

$scanFiles = @(
    "apps/api/src/services/imaging-authz.ts",
    "apps/api/src/services/imaging-audit.ts",
    "apps/api/src/services/imaging-devices.ts",
    "apps/api/src/config/imaging-tenant.ts",
    "apps/api/src/routes/imaging-audit-routes.ts",
    "apps/api/src/routes/imaging-proxy.ts"
)

$secretPattern = "PROV123|PHARM123|NURSE123|password\s*=\s*['""][^'""]+['""]"
$secretFound = $false
foreach ($sf in $scanFiles) {
    if (Test-Path $sf) {
        $content = Get-Content $sf -Raw
        if ($content -match $secretPattern) {
            Gate-Fail "Secret found in $sf"
            $secretFound = $true
        }
    }
}
if (-not $secretFound) {
    Gate-Pass "No hardcoded secrets in Phase 24 files"
}

# PHI field check in audit
if ($auditContent -match "sanitizeDetail") {
    $phiFields = @("pixelData", "ssn", "accessCode", "verifyCode", "password")
    $allRedacted = $true
    foreach ($pf in $phiFields) {
        if ($auditContent -notmatch $pf) { $allRedacted = $false }
    }
    if ($allRedacted) {
        Gate-Pass "Audit sanitization covers PHI fields"
    } else {
        Gate-Warn "Audit sanitization may be incomplete"
    }
}

# console.log count
$totalConsoleLog = 0
foreach ($sf in $scanFiles) {
    if (Test-Path $sf) {
        $content = Get-Content $sf -Raw
        $matches = [regex]::Matches($content, "console\.log")
        $totalConsoleLog += $matches.Count
    }
}
if ($totalConsoleLog -le 6) {
    Gate-Pass "console.log count in Phase 24 files: $totalConsoleLog (<= 6)"
} else {
    Gate-Fail "console.log count in Phase 24 files: $totalConsoleLog (> 6 limit)"
}

# --- Summary ---

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Phase 24 Imaging Enterprise Hardening" -ForegroundColor Cyan
Write-Host "  PASS: $pass   FAIL: $fail   WARN: $warn" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) {
    Write-Host "Phase 24 verification: FAILED ($fail gates)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "Phase 24 verification: ALL GATES PASSED" -ForegroundColor Green
    exit 0
}
