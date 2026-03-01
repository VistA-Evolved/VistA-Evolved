<#
.SYNOPSIS
  GA Certification Runner for VistA-Evolved.
.DESCRIPTION
  Master verifier that orchestrates all GA readiness checks, collects
  evidence artifacts, and produces a final certification report.
  Delegates to ga-checklist.ps1 for the 19-gate readiness check.
.PARAMETER SkipDocker
  Skip checks that require Docker containers to be running.
.EXAMPLE
  .\scripts\verify-ga.ps1
  .\scripts\verify-ga.ps1 -SkipDocker
#>
[CmdletBinding()]
param(
    [switch]$SkipDocker
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptsDir = Join-Path $repoRoot "scripts"
$timestamp = Get-Date -Format "yyyy-MM-ddTHH-mm-ss"
$evidenceDir = Join-Path $repoRoot "artifacts/ga-cert/$timestamp"

# -- Create evidence directory -------------------------------------------
if (-not (Test-Path -LiteralPath $evidenceDir)) {
    New-Item -ItemType Directory -Path $evidenceDir -Force | Out-Null
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VistA-Evolved GA Certification Runner" -ForegroundColor Cyan
Write-Host "  Evidence dir: artifacts/ga-cert/$timestamp" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$totalPass = 0
$totalFail = 0
$sections = @()

# == SECTION 1: GA Readiness Checklist (19 gates) =======================
Write-Host "[1/6] Running GA Readiness Checklist..." -ForegroundColor Yellow

$checklistScript = Join-Path $scriptsDir "ga-checklist.ps1"
$checklistPassed = $false
if (Test-Path -LiteralPath $checklistScript) {
    try {
        $checklistOut = & powershell.exe -NoProfile -File $checklistScript 2>&1
        $checklistPassed = ($LASTEXITCODE -eq 0)
        $checklistOut | Out-File -FilePath (Join-Path $evidenceDir "01-ga-checklist.txt") -Encoding ascii
    } catch {
        $checklistOut = "ERROR: $($_.Exception.Message)"
        $checklistOut | Out-File -FilePath (Join-Path $evidenceDir "01-ga-checklist.txt") -Encoding ascii
    }
} else {
    $checklistOut = "MISSING: ga-checklist.ps1 not found"
    $checklistOut | Out-File -FilePath (Join-Path $evidenceDir "01-ga-checklist.txt") -Encoding ascii
}

if ($checklistPassed) {
    Write-Host "  [PASS] GA Checklist - all 19 gates" -ForegroundColor Green
    $totalPass++
} else {
    Write-Host "  [FAIL] GA Checklist - see evidence for details" -ForegroundColor Red
    $totalFail++
}
$sections += @{ name = "GA Readiness Checklist"; status = $(if ($checklistPassed) { "PASS" } else { "FAIL" }) }

# == SECTION 2: TypeScript compilation ==================================
Write-Host ""
Write-Host "[2/6] Checking TypeScript compilation..." -ForegroundColor Yellow

$tscPassed = $false
try {
    Push-Location (Join-Path $repoRoot "apps/api")
    $tscOut = & npx tsc --noEmit 2>&1
    $tscPassed = ($LASTEXITCODE -eq 0)
    Pop-Location
    if ($tscOut) {
        $tscOut | Out-File -FilePath (Join-Path $evidenceDir "02-tsc-check.txt") -Encoding ascii
    } else {
        "tsc --noEmit: CLEAN (no errors)" | Out-File -FilePath (Join-Path $evidenceDir "02-tsc-check.txt") -Encoding ascii
    }
} catch {
    "ERROR: $($_.Exception.Message)" | Out-File -FilePath (Join-Path $evidenceDir "02-tsc-check.txt") -Encoding ascii
    if ((Get-Location).Path -ne $repoRoot) { Pop-Location -ErrorAction SilentlyContinue }
}

if ($tscPassed) {
    Write-Host "  [PASS] TypeScript compilation clean" -ForegroundColor Green
    $totalPass++
} else {
    Write-Host "  [FAIL] TypeScript compilation errors" -ForegroundColor Red
    $totalFail++
}
$sections += @{ name = "TypeScript Compilation"; status = $(if ($tscPassed) { "PASS" } else { "FAIL" }) }

# == SECTION 3: Critical file existence =================================
Write-Host ""
Write-Host "[3/6] Checking critical file existence..." -ForegroundColor Yellow

$criticalFiles = @(
    "apps/api/src/services/release-train-service.ts",
    "apps/api/src/services/customer-success-service.ts",
    "apps/api/src/services/support-ops-service.ts",
    "apps/api/src/services/external-validation-service.ts",
    "apps/api/src/services/data-rights-service.ts",
    "apps/api/src/routes/release-train-routes.ts",
    "apps/api/src/routes/customer-success-routes.ts",
    "apps/api/src/routes/support-ops-routes.ts",
    "apps/api/src/routes/external-validation-routes.ts",
    "apps/api/src/routes/data-rights-routes.ts",
    "docs/ga/GA_READINESS_CHECKLIST.md",
    "docs/decisions/ADR-GA-READINESS-MODEL.md",
    "docs/decisions/ADR-RELEASE-TRAIN-GOVERNANCE.md",
    "docs/decisions/ADR-DATA-RIGHTS-OPERATIONS.md",
    "prompts/WAVE_20_MANIFEST.md",
    "scripts/ga-checklist.ps1",
    "scripts/verify-ga.ps1"
)

$fileMissing = 0
$fileResults = @()
foreach ($f in $criticalFiles) {
    $fullPath = Join-Path $repoRoot $f
    $exists = Test-Path -LiteralPath $fullPath
    if ($exists) {
        $fileResults += "  [OK] $f"
    } else {
        $fileResults += "  [MISSING] $f"
        $fileMissing++
    }
}
$fileResults | Out-File -FilePath (Join-Path $evidenceDir "03-critical-files.txt") -Encoding ascii

if ($fileMissing -eq 0) {
    Write-Host "  [PASS] All $($criticalFiles.Count) critical files present" -ForegroundColor Green
    $totalPass++
} else {
    Write-Host "  [FAIL] $fileMissing critical files missing" -ForegroundColor Red
    $totalFail++
}
$sections += @{ name = "Critical Files"; status = $(if ($fileMissing -eq 0) { "PASS" } else { "FAIL" }) }

# == SECTION 4: Store policy completeness ===============================
Write-Host ""
Write-Host "[4/6] Checking store-policy Wave 20 entries..." -ForegroundColor Yellow

$storePolicyPath = Join-Path $repoRoot "apps/api/src/platform/store-policy.ts"
$storeChecks = @(
    "release-train",
    "customer-success",
    "support-ops",
    "external-validation",
    "data-rights",
    "ga-evidence"
)
$storeMissing = 0
$storeResults = @()
$spContent = Get-Content $storePolicyPath -Raw

foreach ($domain in $storeChecks) {
    if ($spContent -match [regex]::Escape($domain)) {
        $storeResults += "  [OK] domain: $domain"
    } else {
        $storeResults += "  [MISSING] domain: $domain"
        $storeMissing++
    }
}
$storeResults | Out-File -FilePath (Join-Path $evidenceDir "04-store-policy.txt") -Encoding ascii

if ($storeMissing -eq 0) {
    Write-Host "  [PASS] All W20 store domains registered" -ForegroundColor Green
    $totalPass++
} else {
    Write-Host "  [FAIL] $storeMissing store domains missing" -ForegroundColor Red
    $totalFail++
}
$sections += @{ name = "Store Policy"; status = $(if ($storeMissing -eq 0) { "PASS" } else { "FAIL" }) }

# == SECTION 5: AUTH_RULES completeness =================================
Write-Host ""
Write-Host "[5/6] Checking AUTH_RULES Wave 20 entries..." -ForegroundColor Yellow

$securityPath = Join-Path $repoRoot "apps/api/src/middleware/security.ts"
$authChecks = @(
    "release-train",
    "customer-success",
    "support-ops",
    "external-validation",
    "data-rights"
)
$authMissing = 0
$authResults = @()
$secContent = Get-Content $securityPath -Raw

foreach ($route in $authChecks) {
    if ($secContent -match [regex]::Escape($route)) {
        $authResults += "  [OK] route: /$route/"
    } else {
        $authResults += "  [MISSING] route: /$route/"
        $authMissing++
    }
}
$authResults | Out-File -FilePath (Join-Path $evidenceDir "05-auth-rules.txt") -Encoding ascii

if ($authMissing -eq 0) {
    Write-Host "  [PASS] All W20 AUTH_RULES registered" -ForegroundColor Green
    $totalPass++
} else {
    Write-Host "  [FAIL] $authMissing AUTH_RULES missing" -ForegroundColor Red
    $totalFail++
}
$sections += @{ name = "AUTH Rules"; status = $(if ($authMissing -eq 0) { "PASS" } else { "FAIL" }) }

# == SECTION 6: Register-routes completeness ============================
Write-Host ""
Write-Host "[6/6] Checking register-routes Wave 20 imports..." -ForegroundColor Yellow

$registerPath = Join-Path $repoRoot "apps/api/src/server/register-routes.ts"
$regChecks = @(
    "release-train-routes",
    "customer-success-routes",
    "support-ops-routes",
    "external-validation-routes",
    "data-rights-routes"
)
$regMissing = 0
$regResults = @()
$regContent = Get-Content $registerPath -Raw

foreach ($route in $regChecks) {
    if ($regContent -match [regex]::Escape($route)) {
        $regResults += "  [OK] import: $route"
    } else {
        $regResults += "  [MISSING] import: $route"
        $regMissing++
    }
}
$regResults | Out-File -FilePath (Join-Path $evidenceDir "06-register-routes.txt") -Encoding ascii

if ($regMissing -eq 0) {
    Write-Host "  [PASS] All W20 route imports registered" -ForegroundColor Green
    $totalPass++
} else {
    Write-Host "  [FAIL] $regMissing route imports missing" -ForegroundColor Red
    $totalFail++
}
$sections += @{ name = "Register Routes"; status = $(if ($regMissing -eq 0) { "PASS" } else { "FAIL" }) }

# == Summary ============================================================
$totalChecks = $totalPass + $totalFail
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GA Certification Summary" -ForegroundColor Cyan
Write-Host "  Total: $totalChecks  |  PASS: $totalPass  |  FAIL: $totalFail" -ForegroundColor Cyan

if ($totalFail -eq 0) {
    Write-Host "  RESULT: GA CERTIFIED" -ForegroundColor Green
} else {
    Write-Host "  RESULT: NOT CERTIFIED ($totalFail sections failing)" -ForegroundColor Red
}
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# == Write certification report =========================================
$reportObj = @{
    title = "VistA-Evolved GA Certification Report"
    generatedAt = (Get-Date -Format "o")
    version = "Wave 20"
    totalSections = $totalChecks
    passed = $totalPass
    failed = $totalFail
    certified = ($totalFail -eq 0)
    sections = $sections
}

$jsonPath = Join-Path $evidenceDir "GA-CERT-REPORT.json"
$reportObj | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding ascii

# Build markdown report
$md = @"
# VistA-Evolved GA Certification Report

**Generated:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")
**Version:** Wave 20
**Result:** $(if ($totalFail -eq 0) { 'CERTIFIED' } else { "NOT CERTIFIED ($totalFail failures)" })

## Summary

| Metric | Value |
|--------|-------|
| Total Sections | $totalChecks |
| Passed | $totalPass |
| Failed | $totalFail |

## Sections

"@

foreach ($s in $sections) {
    $icon = if ($s.status -eq "PASS") { "[x]" } else { "[ ]" }
    $md += "- $icon **$($s.name)**: $($s.status)`n"
}

$md += @"

## Evidence

All evidence artifacts are in: ``artifacts/ga-cert/$timestamp/``

| File | Description |
|------|-------------|
| 01-ga-checklist.txt | GA readiness 19-gate output |
| 02-tsc-check.txt | TypeScript compilation check |
| 03-critical-files.txt | Critical file existence check |
| 04-store-policy.txt | Store policy domain completeness |
| 05-auth-rules.txt | AUTH_RULES route completeness |
| 06-register-routes.txt | Route import registration |
| GA-CERT-REPORT.json | Machine-readable report |
| GA-CERT-REPORT.md | This report |
"@

$mdPath = Join-Path $evidenceDir "GA-CERT-REPORT.md"
$md | Out-File -FilePath $mdPath -Encoding ascii

Write-Host "  Reports: $jsonPath" -ForegroundColor DarkGray
Write-Host "           $mdPath" -ForegroundColor DarkGray
Write-Host ""

# == Exit code ==========================================================
if ($totalFail -gt 0) {
    exit 1
}
exit 0
