<# .SYNOPSIS
    Phase 291 verifier -- Certification Evidence Pack v2
    Validates the evidence bundler script and its outputs.
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

Write-Host "`n=== Phase 291 Verifier: Certification Evidence Pack v2 ===" -ForegroundColor Cyan

# Gate 1: Builder script exists
$builder = "scripts/build-evidence-pack.mjs"
Gate "G1: Evidence pack builder exists" (Test-Path -LiteralPath $builder) $builder

# Gate 2: Builder has key scan functions
if (Test-Path -LiteralPath $builder) {
    $bc = Get-Content $builder -Raw
    $hasScanEvidence = $bc -match "scanEvidence"
    $hasScanRunbooks = $bc -match "scanRunbooks"
    $hasScanVerifiers = $bc -match "scanVerifiers"
    $hasScanInterop = $bc -match "scanInteropSuites"
    $hasDetectGaps = $bc -match "detectGaps"
    Gate "G2: Builder has all 5 scanner functions" ($hasScanEvidence -and $hasScanRunbooks -and $hasScanVerifiers -and $hasScanInterop -and $hasDetectGaps) "missing scanners"
} else {
    Gate "G2: Builder has all 5 scanner functions" $false "file missing"
}

# Gate 3: Builder generates SHA-256 checksums
if (Test-Path -LiteralPath $builder) {
    $bc = Get-Content $builder -Raw
    Gate "G3: Builder uses SHA-256 checksums" ($bc -match "sha256" -and $bc -match "createHash") "missing sha256"
} else {
    Gate "G3: Builder uses SHA-256 checksums" $false "file missing"
}

# Gate 4: Builder generates manifest.json
if (Test-Path -LiteralPath $builder) {
    $bc = Get-Content $builder -Raw
    Gate "G4: Builder writes manifest.json" ($bc -match "manifest\.json") "missing manifest output"
} else {
    Gate "G4: Builder writes manifest.json" $false "file missing"
}

# Gate 5: Builder generates EVIDENCE_INDEX.md
if (Test-Path -LiteralPath $builder) {
    $bc = Get-Content $builder -Raw
    Gate "G5: Builder writes EVIDENCE_INDEX.md" ($bc -match "EVIDENCE_INDEX\.md") "missing index output"
} else {
    Gate "G5: Builder writes EVIDENCE_INDEX.md" $false "file missing"
}

# Gate 6: Builder supports --strict flag
if (Test-Path -LiteralPath $builder) {
    $bc = Get-Content $builder -Raw
    Gate "G6: Builder supports --strict flag" ($bc -match "--strict") "missing strict mode"
} else {
    Gate "G6: Builder supports --strict flag" $false "file missing"
}

# Gate 7: Run the builder and check outputs
$outDir = "artifacts/evidence-pack-test"
$builderOk = $false
try {
    $output = & node $builder --out $outDir 2>&1 | Out-String
    $builderOk = ($LASTEXITCODE -eq 0)
    Gate "G7: Builder runs successfully" $builderOk "exit code: $LASTEXITCODE"
} catch {
    Gate "G7: Builder runs successfully" $false $_
}

# Gate 8: manifest.json was generated
$manifestPath = Join-Path $outDir "manifest.json"
Gate "G8: manifest.json generated" (Test-Path -LiteralPath $manifestPath) $manifestPath

# Gate 9: EVIDENCE_INDEX.md was generated
$indexPath = Join-Path $outDir "EVIDENCE_INDEX.md"
Gate "G9: EVIDENCE_INDEX.md generated" (Test-Path -LiteralPath $indexPath) $indexPath

# Gate 10: manifest has required sections
if (Test-Path -LiteralPath $manifestPath) {
    try {
        $raw = Get-Content $manifestPath -Raw
        # Strip BOM if present
        if ($raw[0] -eq [char]0xFEFF) { $raw = $raw.Substring(1) }
        $manifest = $raw | ConvertFrom-Json
        $hasSummary = $null -ne $manifest.summary
        $hasEvidence = $null -ne $manifest.evidence
        $hasRunbooks = $null -ne $manifest.runbooks
        $hasVerifiers = $null -ne $manifest.verifiers
        Gate "G10: Manifest has summary+evidence+runbooks+verifiers" ($hasSummary -and $hasEvidence -and $hasRunbooks -and $hasVerifiers) "missing sections"
    } catch {
        Gate "G10: Manifest has summary+evidence+runbooks+verifiers" $false "parse error: $_"
    }
} else {
    Gate "G10: Manifest has summary+evidence+runbooks+verifiers" $false "file missing"
}

# Gate 11: Runbook exists
$runbook = "docs/runbooks/certification-evidence-pack.md"
Gate "G11: Runbook exists" (Test-Path -LiteralPath $runbook) $runbook

# Gate 12: Prompt files exist
$impl = "prompts/298-PHASE-291-CERT-EVIDENCE-PACK-V2/291-01-IMPLEMENT.md"
$verify = "prompts/298-PHASE-291-CERT-EVIDENCE-PACK-V2/291-99-VERIFY.md"
Gate "G12: Prompt 291-01-IMPLEMENT exists" (Test-Path -LiteralPath $impl) $impl
Gate "G12b: Prompt 291-99-VERIFY exists" (Test-Path -LiteralPath $verify) $verify

# Cleanup test output
if (Test-Path -LiteralPath $outDir) {
    Remove-Item -Path $outDir -Recurse -Force -ErrorAction SilentlyContinue
}

# ---- Summary ----------------------------------------------------------------
Write-Host "`n--- Phase 291 Summary ---" -ForegroundColor Cyan
Write-Host "  Passed: $pass / $total"
if ($fail -gt 0) {
    Write-Host "  FAILED: $fail gate(s)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "  ALL GATES PASSED" -ForegroundColor Green
    exit 0
}
