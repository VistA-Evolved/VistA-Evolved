<# .SYNOPSIS
    Interop Certification Test-Suite Orchestrator
    Phase 290 -- runs FHIR conformance, SMART readiness, and HL7 pack suites.

    Usage:
      .\tests\interop\run-interop-suite.ps1
      .\tests\interop\run-interop-suite.ps1 -ApiUrl http://staging:3001
      .\tests\interop\run-interop-suite.ps1 -Suite fhir     # one suite only
      .\tests\interop\run-interop-suite.ps1 -OutDir ./results/interop
#>
param(
    [string] $ApiUrl  = $env:API_URL ?? "http://localhost:3001",
    [ValidateSet("all","fhir","smart","hl7")]
    [string] $Suite   = "all",
    [string] $OutDir  = "artifacts/interop"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot   # repo root = tests/../
$suiteDir = "$PSScriptRoot"                # tests/interop

# ---- helpers ---------------------------------------------------------------
function Write-Banner([string]$msg) {
    $sep = "=" * 60
    Write-Host "`n$sep" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "$sep" -ForegroundColor Cyan
}

function Run-Suite([string]$Name, [string]$Script) {
    Write-Banner $Name
    $outFile = Join-Path $OutDir "$Name.json"
    $exitCode = 0
    try {
        & node $Script --api $ApiUrl --out $outFile 2>&1 | ForEach-Object { Write-Host $_ }
        $exitCode = $LASTEXITCODE
    } catch {
        Write-Host "  ERROR: $_" -ForegroundColor Red
        $exitCode = 2
    }
    return @{
        suite    = $Name
        exitCode = $exitCode
        outFile  = $outFile
        passed   = ($exitCode -eq 0)
    }
}

# ---- prep ------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

Write-Banner "Interop Certification Suite"
Write-Host "  API:    $ApiUrl"
Write-Host "  Suite:  $Suite"
Write-Host "  Output: $OutDir"

# ---- run suites ------------------------------------------------------------
$suites = @()

if ($Suite -eq "all" -or $Suite -eq "fhir") {
    $suites += Run-Suite "fhir-conformance" "$suiteDir\fhir-conformance.mjs"
}

if ($Suite -eq "all" -or $Suite -eq "smart") {
    $suites += Run-Suite "smart-readiness" "$suiteDir\smart-readiness.mjs"
}

if ($Suite -eq "all" -or $Suite -eq "hl7") {
    $suites += Run-Suite "hl7-pack-suite" "$suiteDir\hl7-pack-suite.mjs"
}

# ---- summary ---------------------------------------------------------------
Write-Banner "Suite Summary"

$totalSuites  = $suites.Count
$passedSuites = ($suites | Where-Object { $_.passed }).Count
$failedSuites = $totalSuites - $passedSuites

foreach ($s in $suites) {
    $icon = if ($s.passed) { "PASS" } else { "FAIL" }
    $color = if ($s.passed) { "Green" } else { "Red" }
    Write-Host "  [$icon] $($s.suite)" -ForegroundColor $color
}

Write-Host "`n  Total: $totalSuites | Passed: $passedSuites | Failed: $failedSuites"

# Write combined manifest
$manifest = @{
    timestamp = (Get-Date -Format "o")
    apiUrl    = $ApiUrl
    suites    = $suites
    overall   = @{
        total  = $totalSuites
        passed = $passedSuites
        failed = $failedSuites
    }
}
$manifestPath = Join-Path $OutDir "interop-manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content -Path $manifestPath -Encoding ascii
Write-Host "  Manifest: $manifestPath"

if ($failedSuites -gt 0) {
    Write-Host "`n  Some suites FAILED -- see individual JSON reports." -ForegroundColor Yellow
}

exit $failedSuites
