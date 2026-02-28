<# .SYNOPSIS
    Phase 290 verifier -- Interop Certification Harness
    Validates file existence, structural integrity, and assertion coverage.
#>
param([switch]$Verbose)
$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$pass = 0; $fail = 0; $total = 0
function Gate([string]$name, [bool]$ok, [string]$detail = "") {
    $script:total++
    if ($ok) { $script:pass++; Write-Host "  PASS  $name" -ForegroundColor Green }
    else     { $script:fail++; Write-Host "  FAIL  $name  -- $detail" -ForegroundColor Red }
}

Write-Host "`n=== Phase 290 Verifier: Interop Certification Harness ===" -ForegroundColor Cyan

# Gate 1: Assertion library exists
$assertLib = "tests/interop/assertions/fhir-assertions.mjs"
Gate "G1: Assertion library exists" (Test-Path -LiteralPath $assertLib) $assertLib

# Gate 2: Assertion library exports key functions
if (Test-Path -LiteralPath $assertLib) {
    $content = Get-Content $assertLib -Raw
    $fns = @("assert", "assertJsonResponse", "assertResourceType", "assertSupportsResource", "assertBundle", "summarize")
    $allExported = $true
    foreach ($fn in $fns) {
        if ($content -notmatch "export\s+(async\s+)?function\s+$fn") {
            $allExported = $false
        }
    }
    Gate "G2: Assertion library exports all 6 helpers" $allExported "missing exports"
} else {
    Gate "G2: Assertion library exports all 6 helpers" $false "file missing"
}

# Gate 3: FHIR conformance suite exists and has test functions
$fhirSuite = "tests/interop/fhir-conformance.mjs"
Gate "G3: FHIR conformance suite exists" (Test-Path -LiteralPath $fhirSuite) $fhirSuite
if (Test-Path -LiteralPath $fhirSuite) {
    $fc = Get-Content $fhirSuite -Raw
    $hasCap = $fc -match "testCapabilityStatement"
    $hasPatient = $fc -match "testPatientSearch"
    Gate "G3b: FHIR suite has CapabilityStatement + Patient tests" ($hasCap -and $hasPatient) "missing test functions"
}

# Gate 4: SMART readiness suite exists and has test functions
$smartSuite = "tests/interop/smart-readiness.mjs"
Gate "G4: SMART readiness suite exists" (Test-Path -LiteralPath $smartSuite) $smartSuite
if (Test-Path -LiteralPath $smartSuite) {
    $sc = Get-Content $smartSuite -Raw
    $hasDisco = $sc -match "testSmartConfiguration"
    $hasOidc = $sc -match "testOidcDiscovery"
    Gate "G4b: SMART suite has discovery + OIDC tests" ($hasDisco -and $hasOidc) "missing test functions"
}

# Gate 5: HL7 pack suite exists and has test functions
$hl7Suite = "tests/interop/hl7-pack-suite.mjs"
Gate "G5: HL7 pack suite exists" (Test-Path -LiteralPath $hl7Suite) $hl7Suite
if (Test-Path -LiteralPath $hl7Suite) {
    $hc = Get-Content $hl7Suite -Raw
    $hasList = $hc -match "testListPacks"
    $hasValidate = $hc -match "testValidateMessage"
    $hasTemplate = $hc -match "testTemplateGeneration"
    Gate "G5b: HL7 suite has list + validate + template tests" ($hasList -and $hasValidate -and $hasTemplate) "missing test functions"
}

# Gate 6: Orchestrator exists and supports -Suite param
$orch = "tests/interop/run-interop-suite.ps1"
Gate "G6: Orchestrator script exists" (Test-Path -LiteralPath $orch) $orch
if (Test-Path -LiteralPath $orch) {
    $oc = Get-Content $orch -Raw
    $hasSuiteParam = $oc -match '\[ValidateSet.*"all".*"fhir".*"smart".*"hl7"'
    Gate "G6b: Orchestrator has -Suite ValidateSet" $hasSuiteParam "missing Suite param"
}

# Gate 7: Runbook exists
$runbook = "docs/runbooks/interop-certification.md"
Gate "G7: Runbook exists" (Test-Path -LiteralPath $runbook) $runbook

# Gate 8: Prompt files exist
$impl = "prompts/297-PHASE-290-INTEROP-CERT-HARNESS/290-01-IMPLEMENT.md"
$verify = "prompts/297-PHASE-290-INTEROP-CERT-HARNESS/290-99-VERIFY.md"
Gate "G8: Prompt 290-01-IMPLEMENT exists" (Test-Path -LiteralPath $impl) $impl
Gate "G8b: Prompt 290-99-VERIFY exists" (Test-Path -LiteralPath $verify) $verify

# Gate 9: No console.log in assertion library (structured output only)
if (Test-Path -LiteralPath $assertLib) {
    $ac = Get-Content $assertLib -Raw
    $noConsole = $ac -notmatch "console\.log"
    Gate "G9: Assertion library has no console.log" $noConsole "should use return values only"
}

# Gate 10: All suites import from assertions/fhir-assertions.mjs
$suites = @($fhirSuite, $smartSuite, $hl7Suite)
$allImport = $true
foreach ($s in $suites) {
    if (Test-Path -LiteralPath $s) {
        $c = Get-Content $s -Raw
        if ($c -notmatch 'from\s+[''"]\.\/assertions\/fhir-assertions\.mjs[''"]') {
            if ($c -notmatch 'from\s+["'']\.\/assertions\/fhir-assertions\.mjs["'']') {
                $allImport = $false
            }
        }
    } else {
        $allImport = $false
    }
}
Gate "G10: All suites import shared assertion library" $allImport "missing import"

# ---- Summary ----------------------------------------------------------------
Write-Host "`n--- Phase 290 Summary ---" -ForegroundColor Cyan
Write-Host "  Passed: $pass / $total"
if ($fail -gt 0) {
    Write-Host "  FAILED: $fail gate(s)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  ALL GATES PASSED" -ForegroundColor Green
    exit 0
}
