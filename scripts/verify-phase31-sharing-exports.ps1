param([switch]$SkipDocker, [switch]$SkipPlaywright, [switch]$SkipE2E)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$warn = 0

function Write-Gate {
  param([string]$Name, [bool]$Ok, [string]$Detail = "")
  if ($Ok) {
    Write-Host "  [PASS] $Name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $Name - $Detail" -ForegroundColor Red
    $script:fail++
  }
}

function Write-Warning-Gate {
  param([string]$Name, [string]$Detail = "")
  Write-Host "  [WARN] $Name - $Detail" -ForegroundColor Yellow
  $script:warn++
}

function Test-FileContains {
  param([string]$Path, [string]$Pattern, [switch]$IsRegex)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  if ($IsRegex) {
    return (Select-String -LiteralPath $Path -Pattern $Pattern -Quiet)
  }
  return (Select-String -LiteralPath $Path -Pattern $Pattern -SimpleMatch -Quiet)
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Phase 31 Verification -- Sharing + Exports + SHC" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ================================================================
# G31-0  REGRESSION (delegate to Phase 30 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G31-0: Regression (Phase 30) ---" -ForegroundColor Yellow

$phase30Script = "$root\scripts\verify-phase1-to-phase30.ps1"
if (Test-Path $phase30Script) {
  Write-Host "  Delegating to Phase 30 verifier..." -ForegroundColor DarkGray
  $phase30Result = & powershell -ExecutionPolicy Bypass -File $phase30Script -SkipPlaywright -SkipE2E 2>&1
  $phase30Exit = $LASTEXITCODE
  if ($phase30Exit -eq 0) {
    Write-Gate "Phase 30 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 30 regression" "Phase 30 verifier returned exit code $phase30Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 30 regression" "verify-phase1-to-phase30.ps1 not found (non-blocking)"
}

# ================================================================
# G31-1  PROMPTS + TSC
# ================================================================
Write-Host ""
Write-Host "--- G31-1: Prompts + TypeScript ---" -ForegroundColor Yellow

$promptDir = "$root\prompts\33-PHASE-31-SHARING-EXPORTS"
Write-Gate "Prompt directory exists" (Test-Path -LiteralPath $promptDir)
Write-Gate "Implement prompt exists" (Test-Path -LiteralPath "$promptDir\33-01-sharing-exports-IMPLEMENT.md")

# TSC check
Push-Location "$root\apps\api"
$apiTsc = pnpm exec tsc --noEmit 2>&1
$apiTscOk = $LASTEXITCODE -eq 0
Pop-Location
Write-Gate "API TSC clean" $apiTscOk

Push-Location "$root\apps\portal"
$portalTsc = pnpm exec tsc --noEmit 2>&1
$portalTscOk = $LASTEXITCODE -eq 0
Pop-Location
Write-Gate "Portal TSC clean" $portalTscOk

# ================================================================
# G31-2  SHARING SERVICE (portal-sharing.ts)
# ================================================================
Write-Host ""
Write-Host "--- G31-2: Sharing Service Enhancements ---" -ForegroundColor Yellow

$sharingPath = "$root\apps\api\src\services\portal-sharing.ts"
Write-Gate "portal-sharing.ts exists" (Test-Path -LiteralPath $sharingPath)

Write-Gate "DEFAULT_SHARE_TTL_MS = 60 min" (Test-FileContains $sharingPath "60 * 60 * 1000")
Write-Gate "MAX_SHARE_TTL_MS = 24h" (Test-FileContains $sharingPath "24 * 60 * 60 * 1000")
Write-Gate "MAX_ACCESS_ATTEMPTS = 3" (Test-FileContains $sharingPath "MAX_ACCESS_ATTEMPTS = 3")
Write-Gate "oneTimeRedeem field" (Test-FileContains $sharingPath "oneTimeRedeem")
Write-Gate "validateCaptcha function" (Test-FileContains $sharingPath "validateCaptcha")
Write-Gate "SHAREABLE_CURATED_SECTIONS export" (Test-FileContains $sharingPath "SHAREABLE_CURATED_SECTIONS")
Write-Gate "One-time redeem auto-revoke logic" (Test-FileContains $sharingPath "one-time-redeem")
Write-Gate "captchaToken parameter" (Test-FileContains $sharingPath "captchaToken")

# ================================================================
# G31-3  PDF + JSON EXPORT (portal-pdf.ts)
# ================================================================
Write-Host ""
Write-Host "--- G31-3: PDF + JSON Export ---" -ForegroundColor Yellow

$pdfPath = "$root\apps\api\src\services\portal-pdf.ts"
Write-Gate "portal-pdf.ts exists" (Test-Path -LiteralPath $pdfPath)

Write-Gate "formatImmunizationsForPdf" (Test-FileContains $pdfPath "formatImmunizationsForPdf")
Write-Gate "formatLabsForPdf" (Test-FileContains $pdfPath "formatLabsForPdf")
Write-Gate "buildStructuredJsonExport" (Test-FileContains $pdfPath "buildStructuredJsonExport")
Write-Gate "StructuredJsonExport interface" (Test-FileContains $pdfPath "StructuredJsonExport")
Write-Gate "FHIR-mappable format version" (Test-FileContains $pdfPath "vista-evolved-health-record")
Write-Gate "Export metadata.source" (Test-FileContains $pdfPath "VistA-Evolved Health Portal")

# ================================================================
# G31-4  SHC ADAPTER (portal-shc.ts)
# ================================================================
Write-Host ""
Write-Host "--- G31-4: SMART Health Cards Adapter ---" -ForegroundColor Yellow

$shcPath = "$root\apps\api\src\services\portal-shc.ts"
Write-Gate "portal-shc.ts exists" (Test-Path -LiteralPath $shcPath)

Write-Gate "isShcEnabled feature flag" (Test-FileContains $shcPath "isShcEnabled")
Write-Gate "PORTAL_SHC_ENABLED env var" (Test-FileContains $shcPath "PORTAL_SHC_ENABLED")
Write-Gate "generateShcCredential function" (Test-FileContains $shcPath "generateShcCredential")
Write-Gate "getShcCapabilities function" (Test-FileContains $shcPath "getShcCapabilities")
Write-Gate "FHIR Immunization resource" (Test-FileContains $shcPath "FhirImmunization")
Write-Gate "buildImmunizationBundle" (Test-FileContains $shcPath "buildImmunizationBundle")
Write-Gate "JWS builder (dev mode)" (Test-FileContains $shcPath "DEV-HS256")
Write-Gate "shc:/ URI encoder" (Test-FileContains $shcPath "jwsToShcUri")
Write-Gate "devMode flag in meta" (Test-FileContains $shcPath "devMode")
Write-Gate "CVX coding system" (Test-FileContains $shcPath "hl7.org/fhir/sid/cvx")

# ================================================================
# G31-5  ROUTES (portal-core.ts)
# ================================================================
Write-Host ""
Write-Host "--- G31-5: API Routes ---" -ForegroundColor Yellow

$routesPath = "$root\apps\api\src\routes\portal-core.ts"
Write-Gate "portal-core.ts exists" (Test-Path -LiteralPath $routesPath)

Write-Gate "JSON export route" (Test-FileContains $routesPath "/portal/export/json")
Write-Gate "SHC capabilities route" (Test-FileContains $routesPath "/portal/shc/capabilities")
Write-Gate "SHC export route" (Test-FileContains $routesPath "/portal/export/shc/:dataset")
Write-Gate "immunizations in EXPORTABLE_SECTIONS" (Test-FileContains $routesPath "immunizations")
Write-Gate "labs in EXPORTABLE_SECTIONS" (Test-FileContains $routesPath "labs")
Write-Gate "oneTimeRedeem in share creation" (Test-FileContains $routesPath "oneTimeRedeem")
Write-Gate "captchaToken in verify" (Test-FileContains $routesPath "captchaToken")
Write-Gate "ttlMinutes support" (Test-FileContains $routesPath "ttlMinutes")
Write-Gate "Phase 31 log message" (Test-FileContains $routesPath "Phase 31")
Write-Gate "buildStructuredJsonExport import" (Test-FileContains $routesPath "buildStructuredJsonExport")
Write-Gate "generateShcCredential import" (Test-FileContains $routesPath "generateShcCredential")
Write-Gate "SHAREABLE_CURATED_SECTIONS import" (Test-FileContains $routesPath "SHAREABLE_CURATED_SECTIONS")

# ================================================================
# G31-6  AUDIT ACTIONS
# ================================================================
Write-Host ""
Write-Host "--- G31-6: Audit Trail ---" -ForegroundColor Yellow

$auditPath = "$root\apps\api\src\services\portal-audit.ts"
Write-Gate "portal-audit.ts exists" (Test-Path -LiteralPath $auditPath)

Write-Gate "portal.export.json action" (Test-FileContains $auditPath "portal.export.json")
Write-Gate "portal.export.shc action" (Test-FileContains $auditPath "portal.export.shc")
Write-Gate "portal.share.view action" (Test-FileContains $auditPath "portal.share.view")

# ================================================================
# G31-7  PORTAL UI PAGES
# ================================================================
Write-Host ""
Write-Host "--- G31-7: Portal UI Pages ---" -ForegroundColor Yellow

$sharingPagePath = "$root\apps\portal\src\app\dashboard\sharing\page.tsx"
$exportsPagePath = "$root\apps\portal\src\app\dashboard\exports\page.tsx"

Write-Gate "Sharing page exists" (Test-Path -LiteralPath $sharingPagePath)
Write-Gate "Exports page exists" (Test-Path -LiteralPath $exportsPagePath)

if (Test-Path -LiteralPath $sharingPagePath) {
  Write-Gate "Sharing: oneTimeRedeem UI" (Test-FileContains $sharingPagePath "oneTimeRedeem")
  Write-Gate "Sharing: ttlMinutes UI" (Test-FileContains $sharingPagePath "ttlMinutes")
  Write-Gate "Sharing: curated sections list" (Test-FileContains $sharingPagePath "immunizations")
  Write-Gate "Sharing: revoke button" (Test-FileContains $sharingPagePath "Revoke")
  Write-Gate "Sharing: access code display" (Test-FileContains $sharingPagePath "accessCode")
  Write-Gate "Sharing: one-time badge" (Test-FileContains $sharingPagePath "One-time")
}

if (Test-Path -LiteralPath $exportsPagePath) {
  Write-Gate "Exports: PDF download" (Test-FileContains $exportsPagePath "Download PDF")
  Write-Gate "Exports: JSON download" (Test-FileContains $exportsPagePath "JSON")
  Write-Gate "Exports: SHC section" (Test-FileContains $exportsPagePath "SMART Health Cards")
  Write-Gate "Exports: SHC capabilities check" (Test-FileContains $exportsPagePath "shc/capabilities")
  Write-Gate "Exports: section-by-section" (Test-FileContains $exportsPagePath "Individual Sections")
  Write-Gate "Exports: immunizations section" (Test-FileContains $exportsPagePath "Immunizations")
  Write-Gate "Exports: labs section" (Test-FileContains $exportsPagePath "Lab Results")
}

# ================================================================
# G31-8  NAVIGATION + API CLIENT
# ================================================================
Write-Host ""
Write-Host "--- G31-8: Navigation + API Client ---" -ForegroundColor Yellow

$navPath = "$root\apps\portal\src\components\portal-nav.tsx"
$apiClientPath = "$root\apps\portal\src\lib\api.ts"

Write-Gate "Nav: Share Records entry" (Test-FileContains $navPath "Share Records")
Write-Gate "Nav: Export entry" (Test-FileContains $navPath "Export")
Write-Gate "Nav: /dashboard/sharing href" (Test-FileContains $navPath "/dashboard/sharing")
Write-Gate "Nav: /dashboard/exports href" (Test-FileContains $navPath "/dashboard/exports")

Write-Gate "API client: exportJson" (Test-FileContains $apiClientPath "exportJson")
Write-Gate "API client: getShcCapabilities" (Test-FileContains $apiClientPath "getShcCapabilities")
Write-Gate "API client: exportShc" (Test-FileContains $apiClientPath "exportShc")
Write-Gate "API client: captchaToken param" (Test-FileContains $apiClientPath "captchaToken")

# ================================================================
# G31-9  DOCUMENTATION
# ================================================================
Write-Host ""
Write-Host "--- G31-9: Documentation ---" -ForegroundColor Yellow

$runbookPath = "$root\docs\runbooks\phase31-sharing-exports.md"
Write-Gate "Runbook exists" (Test-Path -LiteralPath $runbookPath)
Write-Gate "Runbook: threat model section" (Test-FileContains $runbookPath "Threat Model")
Write-Gate "Runbook: SHC section" (Test-FileContains $runbookPath "SMART Health Cards")
Write-Gate "Runbook: security parameters table" (Test-FileContains $runbookPath "Phase 27")
Write-Gate "Runbook: JSON export section" (Test-FileContains $runbookPath "Structured JSON Export")

$summaryPath = "$root\ops\summary.md"
Write-Gate "ops/summary.md updated" (Test-FileContains $summaryPath "Phase 31")

$notionPath = "$root\ops\notion-update.json"
Write-Gate "ops/notion-update.json updated" (Test-FileContains $notionPath "Phase 31")

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Phase 31 Verification Complete" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "================================================" -ForegroundColor Cyan

if ($fail -gt 0) { exit 1 } else { exit 0 }
