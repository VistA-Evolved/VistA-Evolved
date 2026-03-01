<#
.SYNOPSIS
  Wave 22 -- Specialty Clinical Content + CDS + Deep VistA Writeback Certification Runner
  Phase 398 (W22-P10): Push-button verification across all 9 implementation phases.

.DESCRIPTION
  Verifies file existence, barrel exports, route registrations, AUTH_RULES,
  store-policy entries, type coverage, and prompt folder completeness
  for Phases 389-397 (W22-P1 through W22-P9).

.PARAMETER SkipDocker
  Skip Docker-dependent checks.
#>
param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$apiSrc = Join-Path (Join-Path (Join-Path $root "apps") "api") "src"

$pass = 0
$fail = 0
$total = 0

function Gate([string]$name, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

function FileExists([string]$rel) {
  $p = Join-Path $root $rel
  return (Test-Path -LiteralPath $p)
}

function FileContains([string]$rel, [string]$pattern) {
  $p = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $p)) { return $false }
  $content = Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue
  return ($content -match [regex]::Escape($pattern))
}

function FileMatchesRegex([string]$rel, [string]$regex) {
  $p = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $p)) { return $false }
  $content = Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue
  return ($content -match $regex)
}

Write-Host ""
Write-Host "=== Wave 22 Specialty Clinical Content + CDS -- Certification Runner ===" -ForegroundColor Cyan
Write-Host "  Phase 398 (W22-P10) -- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# -------------------------------------------------------------------------
# Section 1: P1 Manifest + ADRs (Phase 389)
# -------------------------------------------------------------------------
Write-Host "--- Section 1: P1 Manifest + ADRs (Phase 389) ---" -ForegroundColor Yellow

Gate "Manifest exists" { FileExists "prompts\WAVE_22_MANIFEST.md" }
Gate "ADR CDS architecture" { FileExists "docs\decisions\ADR-W22-CDS-ARCH.md" }
Gate "ADR content packs" { FileExists "docs\decisions\ADR-W22-CONTENT-PACKS.md" }
Gate "ADR terminology" { FileExists "docs\decisions\ADR-W22-TERMINOLOGY.md" }
Gate "ADR theming" { FileExists "docs\decisions\ADR-W22-THEMING.md" }
Gate "Specialty coverage map" { FileExists "docs\vista-alignment\rpc-coverage.json" }

# -------------------------------------------------------------------------
# Section 2: P2 Content Pack Framework v2 (Phase 390)
# -------------------------------------------------------------------------
Write-Host "--- Section 2: P2 Content Pack Framework v2 (Phase 390) ---" -ForegroundColor Yellow

Gate "P2 types.ts" { FileExists "apps\api\src\content-packs\types.ts" }
Gate "P2 pack-store.ts" { FileExists "apps\api\src\content-packs\pack-store.ts" }
Gate "P2 pack-routes.ts" { FileExists "apps\api\src\content-packs\pack-routes.ts" }
Gate "P2 index.ts" { FileExists "apps\api\src\content-packs\index.ts" }
Gate "P2 ContentPack type" { FileContains "apps\api\src\content-packs\types.ts" "ContentPack" }
Gate "P2 ClinicalTemplate type" { FileContains "apps\api\src\content-packs\types.ts" "ClinicalTemplate" }
Gate "P2 ContentPackV2 type" { FileContains "apps\api\src\content-packs\types.ts" "ContentPackV2" }

# -------------------------------------------------------------------------
# Section 3: P3 Inpatient Core (Phase 391)
# -------------------------------------------------------------------------
Write-Host "--- Section 3: P3 Inpatient Core (Phase 391) ---" -ForegroundColor Yellow

Gate "P3 types.ts" { FileExists "apps\api\src\inpatient\types.ts" }
Gate "P3 inpatient-store.ts" { FileExists "apps\api\src\inpatient\inpatient-store.ts" }
Gate "P3 inpatient-routes.ts" { FileExists "apps\api\src\inpatient\inpatient-routes.ts" }
Gate "P3 index.ts" { FileExists "apps\api\src\inpatient\index.ts" }
Gate "P3 BedAssignment type" { FileContains "apps\api\src\inpatient\types.ts" "BedAssignment" }
Gate "P3 AdtEvent type" { FileContains "apps\api\src\inpatient\types.ts" "AdtEvent" }
Gate "P3 FlowsheetRow type" { FileContains "apps\api\src\inpatient\types.ts" "FlowsheetRow" }

# -------------------------------------------------------------------------
# Section 4: P4 Pharmacy Deep Workflows (Phase 392)
# -------------------------------------------------------------------------
Write-Host "--- Section 4: P4 Pharmacy Deep Workflows (Phase 392) ---" -ForegroundColor Yellow

Gate "P4 types.ts" { FileExists "apps\api\src\pharmacy\types.ts" }
Gate "P4 pharmacy-store.ts" { FileExists "apps\api\src\pharmacy\pharmacy-store.ts" }
Gate "P4 pharmacy-routes.ts" { FileExists "apps\api\src\pharmacy\pharmacy-routes.ts" }
Gate "P4 index.ts" { FileExists "apps\api\src\pharmacy\index.ts" }
Gate "P4 PharmOrder type" { FileContains "apps\api\src\pharmacy\types.ts" "PharmOrder" }
Gate "P4 DispenseEvent type" { FileContains "apps\api\src\pharmacy\types.ts" "DispenseEvent" }
Gate "P4 ClinicalCheckResult type" { FileContains "apps\api\src\pharmacy\types.ts" "ClinicalCheckResult" }

# -------------------------------------------------------------------------
# Section 5: P5 Lab Deep Workflows (Phase 393)
# -------------------------------------------------------------------------
Write-Host "--- Section 5: P5 Lab Deep Workflows (Phase 393) ---" -ForegroundColor Yellow

Gate "P5 types.ts" { FileExists "apps\api\src\lab\types.ts" }
Gate "P5 lab-store.ts" { FileExists "apps\api\src\lab\lab-store.ts" }
Gate "P5 lab-routes.ts" { FileExists "apps\api\src\lab\lab-routes.ts" }
Gate "P5 index.ts" { FileExists "apps\api\src\lab\index.ts" }
Gate "P5 LabOrder type" { FileContains "apps\api\src\lab\types.ts" "LabOrder" }
Gate "P5 LabResult type" { FileContains "apps\api\src\lab\types.ts" "LabResult" }
Gate "P5 SpecimenSample type" { FileContains "apps\api\src\lab\types.ts" "SpecimenSample" }

# -------------------------------------------------------------------------
# Section 6: P6 Imaging/Radiology Deep (Phase 394)
# -------------------------------------------------------------------------
Write-Host "--- Section 6: P6 Imaging/Radiology Deep (Phase 394) ---" -ForegroundColor Yellow

Gate "P6 types.ts" { FileExists "apps\api\src\radiology\types.ts" }
Gate "P6 radiology-store.ts" { FileExists "apps\api\src\radiology\radiology-store.ts" }
Gate "P6 radiology-routes.ts" { FileExists "apps\api\src\radiology\radiology-routes.ts" }
Gate "P6 index.ts" { FileExists "apps\api\src\radiology\index.ts" }
Gate "P6 RadOrder type" { FileContains "apps\api\src\radiology\types.ts" "RadOrder" }
Gate "P6 RadReport type" { FileContains "apps\api\src\radiology\types.ts" "RadReport" }
Gate "P6 ReadingWorklistItem type" { FileContains "apps\api\src\radiology\types.ts" "ReadingWorklistItem" }

# -------------------------------------------------------------------------
# Section 7: P7 CDS Hooks + SMART Launch (Phase 395)
# -------------------------------------------------------------------------
Write-Host "--- Section 7: P7 CDS Hooks + SMART Launch (Phase 395) ---" -ForegroundColor Yellow

Gate "P7 types.ts" { FileExists "apps\api\src\cds\types.ts" }
Gate "P7 cds-store.ts" { FileExists "apps\api\src\cds\cds-store.ts" }
Gate "P7 cds-routes.ts" { FileExists "apps\api\src\cds\cds-routes.ts" }
Gate "P7 index.ts" { FileExists "apps\api\src\cds\index.ts" }
Gate "P7 CdsService type" { FileContains "apps\api\src\cds\types.ts" "CdsService" }
Gate "P7 CdsHookRequest type" { FileContains "apps\api\src\cds\types.ts" "CdsHookRequest" }
Gate "P7 SmartApp type" { FileContains "apps\api\src\cds\types.ts" "SmartApp" }
Gate "P7 CQF Ruler env" { FileContains "apps\api\src\cds\cds-store.ts" "CQF_RULER_URL" }

# -------------------------------------------------------------------------
# Section 8: P8 Clinical Reasoning + Quality Measures (Phase 396)
# -------------------------------------------------------------------------
Write-Host "--- Section 8: P8 Clinical Reasoning + Quality Measures (Phase 396) ---" -ForegroundColor Yellow

Gate "P8 types.ts" { FileExists "apps\api\src\clinical-reasoning\types.ts" }
Gate "P8 reasoning-store.ts" { FileExists "apps\api\src\clinical-reasoning\reasoning-store.ts" }
Gate "P8 reasoning-routes.ts" { FileExists "apps\api\src\clinical-reasoning\reasoning-routes.ts" }
Gate "P8 index.ts" { FileExists "apps\api\src\clinical-reasoning\index.ts" }
Gate "P8 CqlLibrary type" { FileContains "apps\api\src\clinical-reasoning\types.ts" "CqlLibrary" }
Gate "P8 QualityMeasure type" { FileContains "apps\api\src\clinical-reasoning\types.ts" "QualityMeasure" }
Gate "P8 PlanDefinition type" { FileContains "apps\api\src\clinical-reasoning\types.ts" "PlanDefinition" }
Gate "P8 MeasureReport type" { FileContains "apps\api\src\clinical-reasoning\types.ts" "MeasureReport" }

# -------------------------------------------------------------------------
# Section 9: P9 Localization + Multi-Country Packs + Theming (Phase 397)
# -------------------------------------------------------------------------
Write-Host "--- Section 9: P9 Localization + Multi-Country Packs + Theming (Phase 397) ---" -ForegroundColor Yellow

Gate "P9 types.ts" { FileExists "apps\api\src\localization\types.ts" }
Gate "P9 localization-store.ts" { FileExists "apps\api\src\localization\localization-store.ts" }
Gate "P9 localization-routes.ts" { FileExists "apps\api\src\localization\localization-routes.ts" }
Gate "P9 index.ts" { FileExists "apps\api\src\localization\index.ts" }
Gate "P9 LocaleDefinition type" { FileContains "apps\api\src\localization\types.ts" "LocaleDefinition" }
Gate "P9 TranslationBundle type" { FileContains "apps\api\src\localization\types.ts" "TranslationBundle" }
Gate "P9 ThemeDefinition type" { FileContains "apps\api\src\localization\types.ts" "ThemeDefinition" }
Gate "P9 CountryPack type" { FileContains "apps\api\src\localization\types.ts" "CountryPack" }
Gate "P9 UcumUnitProfile type" { FileContains "apps\api\src\localization\types.ts" "UcumUnitProfile" }

# -------------------------------------------------------------------------
# Section 10: Cross-Cutting -- Route Registration
# -------------------------------------------------------------------------
Write-Host "--- Section 10: Cross-Cutting -- Route Registration ---" -ForegroundColor Yellow

$regRoutes = "apps\api\src\server\register-routes.ts"
Gate "Route reg: contentPackRoutes" { FileContains $regRoutes "contentPackRoutes" }
Gate "Route reg: inpatientRoutes" { FileContains $regRoutes "inpatientRoutes" }
Gate "Route reg: pharmacyDeepRoutes" { FileContains $regRoutes "pharmacyDeepRoutes" }
Gate "Route reg: labDeepRoutes" { FileContains $regRoutes "labDeepRoutes" }
Gate "Route reg: radiologyDeepRoutes" { FileContains $regRoutes "radiologyDeepRoutes" }
Gate "Route reg: cdsHooksRoutes" { FileContains $regRoutes "cdsHooksRoutes" }
Gate "Route reg: clinicalReasoningRoutes" { FileContains $regRoutes "clinicalReasoningRoutes" }
Gate "Route reg: localizationRoutes" { FileContains $regRoutes "localizationRoutes" }

# -------------------------------------------------------------------------
# Section 11: Cross-Cutting -- AUTH_RULES
# -------------------------------------------------------------------------
Write-Host "--- Section 11: Cross-Cutting -- AUTH_RULES ---" -ForegroundColor Yellow

$security = "apps\api\src\middleware\security.ts"
Gate "AUTH: /content-packs/" { FileMatchesRegex $security "content-packs" }
Gate "AUTH: /inpatient/" { FileMatchesRegex $security "inpatient" }
Gate "AUTH: /pharmacy/" { FileMatchesRegex $security "pharmacy" }
Gate "AUTH: /lab/" { FileMatchesRegex $security "lab" }
Gate "AUTH: /radiology/" { FileMatchesRegex $security "radiology" }
Gate "AUTH: /cds/" { FileMatchesRegex $security "cds" }
Gate "AUTH: /clinical-reasoning/" { FileMatchesRegex $security "clinical-reasoning" }
Gate "AUTH: /localization/" { FileMatchesRegex $security "localization" }

# -------------------------------------------------------------------------
# Section 12: Cross-Cutting -- Store Policy
# -------------------------------------------------------------------------
Write-Host "--- Section 12: Cross-Cutting -- Store Policy ---" -ForegroundColor Yellow

$storePolicy = "apps\api\src\platform\store-policy.ts"
# P2: 7 stores
Gate "Store: content-packs" { FileContains $storePolicy "content-packs" }
Gate "Store: content-pack-order-sets" { FileContains $storePolicy "content-pack-order-sets" }
# P3: 4 stores
Gate "Store: inpatient-bed-assignments" { FileContains $storePolicy "inpatient-bed-assignments" }
Gate "Store: adt-events" { FileContains $storePolicy "adt-events" }
# P4: 3 stores
Gate "Store: pharmacy-orders" { FileContains $storePolicy "pharmacy-orders" }
Gate "Store: dispense-events" { FileContains $storePolicy "dispense-events" }
# P5: 4 stores
Gate "Store: lab-orders" { FileContains $storePolicy "lab-orders" }
Gate "Store: lab-results" { FileContains $storePolicy "lab-results" }
# P6: 6 stores
Gate "Store: radiology-orders" { FileContains $storePolicy "radiology-orders" }
Gate "Store: radiology-reports" { FileContains $storePolicy "radiology-reports" }
# P7: 5 stores
Gate "Store: cds-services" { FileContains $storePolicy "cds-services" }
Gate "Store: cds-rules" { FileContains $storePolicy "cds-rules" }
Gate "Store: smart-apps" { FileContains $storePolicy "smart-apps" }
# P8: 7 stores
Gate "Store: cql-libraries" { FileContains $storePolicy "cql-libraries" }
Gate "Store: quality-measures" { FileContains $storePolicy "quality-measures" }
Gate "Store: measure-reports" { FileContains $storePolicy "measure-reports" }
# P9: 6 stores
Gate "Store: locales" { FileContains $storePolicy "locales" }
Gate "Store: translation-bundles" { FileContains $storePolicy "translation-bundles" }
Gate "Store: themes" { FileContains $storePolicy "themes" }
Gate "Store: country-packs" { FileContains $storePolicy "country-packs" }
Gate "Store: ucum-unit-profiles" { FileContains $storePolicy "ucum-unit-profiles" }
Gate "Store: tenant-locale-configs" { FileContains $storePolicy "tenant-locale-configs" }

# -------------------------------------------------------------------------
# Section 13: TypeScript Compilation
# -------------------------------------------------------------------------
Write-Host "--- Section 13: TypeScript Compilation ---" -ForegroundColor Yellow

Gate "tsc --noEmit clean" {
  Push-Location (Join-Path (Join-Path $root "apps") "api")
  try {
    $output = & pnpm exec tsc --noEmit 2>&1
    $exitOk = $LASTEXITCODE -eq 0
    return $exitOk
  } finally {
    Pop-Location
  }
}

# -------------------------------------------------------------------------
# Section 14: Prompt Folders
# -------------------------------------------------------------------------
Write-Host "--- Section 14: Prompt Folders ---" -ForegroundColor Yellow

Gate "Prompt: 389-W22-P1" { FileExists "prompts\389-W22-P1-MANIFEST-COVERAGE\389-01-IMPLEMENT.md" }
Gate "Prompt: 390-W22-P2" { FileExists "prompts\390-W22-P2-CONTENT-PACKS\390-01-IMPLEMENT.md" }
Gate "Prompt: 391-W22-P3" { FileExists "prompts\391-W22-P3-INPATIENT-CORE\391-01-IMPLEMENT.md" }
Gate "Prompt: 392-W22-P4" { FileExists "prompts\392-W22-P4-PHARMACY-DEEP\392-01-IMPLEMENT.md" }
Gate "Prompt: 393-W22-P5" { FileExists "prompts\393-W22-P5-LAB-DEEP\393-01-IMPLEMENT.md" }
Gate "Prompt: 394-W22-P6" { FileExists "prompts\394-W22-P6-IMAGING-RAD\394-01-IMPLEMENT.md" }
Gate "Prompt: 395-W22-P7" { FileExists "prompts\395-W22-P7-CDS-HOOKS\395-01-IMPLEMENT.md" }
Gate "Prompt: 396-W22-P8" { FileExists "prompts\396-W22-P8-CLINICAL-REASONING\396-01-IMPLEMENT.md" }
Gate "Prompt: 397-W22-P9" { FileExists "prompts\397-W22-P9-LOCALIZATION\397-01-IMPLEMENT.md" }
Gate "Prompt: 398-W22-P10" { FileExists "prompts\398-W22-P10-CERT-RUNNER\398-01-IMPLEMENT.md" }

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "=== CERTIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Total gates: $total"
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($fail -eq 0) {
  Write-Host "  WAVE 22 CERTIFICATION: ALL GATES PASSED" -ForegroundColor Green
  exit 0
} else {
  Write-Host "  WAVE 22 CERTIFICATION: $fail GATE(S) FAILED" -ForegroundColor Red
  exit 1
}
