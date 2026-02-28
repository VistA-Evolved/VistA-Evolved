<# Phase 299 Verifier: Manifest + Scope Matrix + OSS Reuse ADRs #>
param([switch]$Quiet)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Test-Gate([string]$Name, [bool]$Condition, [string]$Detail = '') {
    $script:total++
    if ($Condition) {
        $script:pass++
        if (!$Quiet) { Write-Host "  PASS  $Name" -ForegroundColor Green }
    } else {
        $script:fail++
        Write-Host "  FAIL  $Name $(if ($Detail) { "-- $Detail" })" -ForegroundColor Red
    }
}

Write-Host "=== Phase 299 Verifier: W12 Manifest + Scope Matrix + OSS ADRs ===" -ForegroundColor Cyan

# G1: WAVE_12_MANIFEST.md exists
$manifest = "prompts/WAVE_12_MANIFEST.md"
Test-Gate "G1: WAVE_12_MANIFEST.md exists" (Test-Path -LiteralPath $manifest)

# G2: Manifest lists 10 phases (299-308)
if (Test-Path -LiteralPath $manifest) {
    $mContent = Get-Content $manifest -Raw
    $has299 = $mContent -match '299'
    $has308 = $mContent -match '308'
    $has10Phases = $mContent -match '10 phases'
    Test-Gate "G2: Manifest lists phases 299-308" ($has299 -and $has308 -and $has10Phases)
} else {
    Test-Gate "G2: Manifest lists phases 299-308" $false "manifest missing"
}

# G3: All 10 prompt folders exist
$folders = @(
    "prompts/299-PHASE-299-W12-MANIFEST-SCOPE-MATRIX",
    "prompts/300-PHASE-300-CLINICAL-WRITEBACK-BUS",
    "prompts/301-PHASE-301-TIU-NOTES-WRITEBACK",
    "prompts/302-PHASE-302-ORDERS-WRITEBACK-CORE",
    "prompts/303-PHASE-303-PHARMACY-DEEP-WRITEBACK",
    "prompts/304-PHASE-304-LAB-DEEP-WRITEBACK",
    "prompts/305-PHASE-305-INPATIENT-ADT-WRITEBACK",
    "prompts/306-PHASE-306-IMAGING-PACS-VALIDATION",
    "prompts/307-PHASE-307-TELEHEALTH-HARDENING",
    "prompts/308-PHASE-308-DEPT-CERTIFICATION-RUNNER"
)
$allExist = $true
foreach ($f in $folders) {
    if (!(Test-Path -LiteralPath $f)) { $allExist = $false; break }
}
Test-Gate "G3: All 10 prompt folders exist" $allExist

# G4: P299 has IMPLEMENT, VERIFY, NOTES
$p299Dir = "prompts/299-PHASE-299-W12-MANIFEST-SCOPE-MATRIX"
$hasImpl = Test-Path -LiteralPath "$p299Dir/299-01-IMPLEMENT.md"
$hasVerify = Test-Path -LiteralPath "$p299Dir/299-99-VERIFY.md"
$hasNotes = Test-Path -LiteralPath "$p299Dir/299-NOTES.md"
Test-Gate "G4: P299 has IMPLEMENT + VERIFY + NOTES" ($hasImpl -and $hasVerify -and $hasNotes)

# G5: Writeback scope matrix exists
$scopeMatrix = "docs/clinical/writeback-scope-matrix.md"
Test-Gate "G5: Writeback scope matrix exists" (Test-Path -LiteralPath $scopeMatrix)

# G6: Scope matrix covers all 6 domains
if (Test-Path -LiteralPath $scopeMatrix) {
    $smContent = Get-Content $scopeMatrix -Raw
    $domains = @('Notes \(TIU\)', 'Orders \(OR\)', 'Pharmacy \(PS', 'Labs \(LR', 'Inpatient.*ADT', 'Imaging \(RA')
    $allDomains = $true
    foreach ($d in $domains) {
        if ($smContent -notmatch $d) { $allDomains = $false; break }
    }
    Test-Gate "G6: Scope matrix covers all 6 domains" $allDomains
} else {
    Test-Gate "G6: Scope matrix covers all 6 domains" $false "matrix missing"
}

# G7: ADR-PACS-viewer.md exists
Test-Gate "G7: ADR-PACS-viewer.md exists" (Test-Path -LiteralPath "docs/adrs/ADR-PACS-viewer.md")

# G8: ADR-DICOM-store.md exists
Test-Gate "G8: ADR-DICOM-store.md exists" (Test-Path -LiteralPath "docs/adrs/ADR-DICOM-store.md")

# G9: ADR-telehealth-providers.md exists
Test-Gate "G9: ADR-telehealth-providers.md exists" (Test-Path -LiteralPath "docs/adrs/ADR-telehealth-providers.md")

# G10: ADR-HL7-ops.md exists
Test-Gate "G10: ADR-HL7-ops.md exists" (Test-Path -LiteralPath "docs/adrs/ADR-HL7-ops.md")

# G11: Evidence directory has required files
$evDir = "evidence/wave-12/299-manifest"
$hasPromptsScan = Test-Path -LiteralPath "$evDir/prompts-scan.txt"
$hasManifestTxt = Test-Path -LiteralPath "$evDir/manifest.txt"
$hasScopeEvidence = Test-Path -LiteralPath "$evDir/writeback-scope-matrix.md"
Test-Gate "G11: Evidence has prompts-scan + manifest + scope matrix" ($hasPromptsScan -and $hasManifestTxt -and $hasScopeEvidence)

# G12: Scope matrix references existing route files
if (Test-Path -LiteralPath $scopeMatrix) {
    $smContent = Get-Content $scopeMatrix -Raw
    $refsRoutes = ($smContent -match 'tiu-notes\.ts') -and ($smContent -match 'orders-cpoe\.ts') -and ($smContent -match 'wave2-routes\.ts')
    Test-Gate "G12: Scope matrix references actual route files" $refsRoutes
} else {
    Test-Gate "G12: Scope matrix references actual route files" $false
}

# G13: No PHI in any created file
$phiPatterns = @('PROV123', 'NURSE123', 'PHARM123', '\d{3}-\d{2}-\d{4}')
$phiFound = $false
$checkFiles = @($manifest, $scopeMatrix) + @(
    "docs/adrs/ADR-PACS-viewer.md",
    "docs/adrs/ADR-DICOM-store.md",
    "docs/adrs/ADR-telehealth-providers.md",
    "docs/adrs/ADR-HL7-ops.md"
)
foreach ($cf in $checkFiles) {
    if (Test-Path -LiteralPath $cf) {
        $content = Get-Content $cf -Raw
        foreach ($pat in $phiPatterns) {
            if ($content -match $pat) { $phiFound = $true; break }
        }
    }
    if ($phiFound) { break }
}
Test-Gate "G13: No PHI in created files" (-not $phiFound)

Write-Host ""
Write-Host "--- Phase 299 Summary ---"
Write-Host "  Passed: $pass / $total"
if ($fail -eq 0) {
    Write-Host "  ALL GATES PASSED" -ForegroundColor Green
} else {
    Write-Host "  FAILURES: $fail" -ForegroundColor Red
}
exit $fail
