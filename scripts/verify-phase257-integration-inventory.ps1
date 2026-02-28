<#
.SYNOPSIS
  Verify Phase 257 -- OSS Integration Inventory + ADRs
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass = 0
$fail = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) {
    Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 257 Verify: OSS Integration Inventory ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── G01-G06: ADR ─────────────────────────────────────────────────

Write-Host "--- ADR ---" -ForegroundColor Yellow

$adrPath = "$root\docs\decisions\ADR-OSS-Integrations.md"
$g = Test-Path -LiteralPath $adrPath
Gate "G01-adr-exists" $g "ADR-OSS-Integrations.md"

if (Test-Path -LiteralPath $adrPath) {
  $adr = Get-Content $adrPath -Raw
  $g = $adr -match "HL7v2"
  Gate "G02-adr-hl7-decision" $g "References HL7v2 decision"

  $g = $adr -match "FHIR"
  Gate "G03-adr-fhir-decision" $g "References FHIR decision"

  $g = $adr -match "Payer"
  Gate "G04-adr-payer-decision" $g "References payer decision"

  $g = $adr -match "Alternatives Not Chosen"
  Gate "G05-adr-alternatives" $g "Documents alternatives"

  $g = Test-Path -LiteralPath "$root\docs\decisions\ADR-hl7-engine-choice.md"
  Gate "G06-prior-hl7-adr" $g "Prior HL7 ADR exists"
} else {
  for ($i = 2; $i -le 6; $i++) {
    Gate "G0$i-adr-content" $false "ADR not found"
  }
}

# ── G07-G12: Integration Overview ────────────────────────────────

Write-Host "`n--- Integration Overview ---" -ForegroundColor Yellow

$ioPath = "$root\docs\integrations\INTEGRATIONS_OVERVIEW.md"
$g = Test-Path -LiteralPath $ioPath
Gate "G07-overview-exists" $g "INTEGRATIONS_OVERVIEW.md"

if (Test-Path -LiteralPath $ioPath) {
  $io = Get-Content $ioPath -Raw

  $g = $io -match "IntegrationEnvelope"
  Gate "G08-envelope-spec" $g "Message envelope specification"

  $g = $io -match "Tenant Routing"
  Gate "G09-tenant-routing" $g "Tenant routing strategy"

  $g = $io -match "PHI Redaction"
  Gate "G10-phi-redaction" $g "PHI redaction rules"

  $g = $io -match "Subsystem Reference"
  Gate "G11-subsystem-ref" $g "Subsystem reference"

  $g = $io -match "Maturity Matrix"
  Gate "G12-maturity-matrix" $g "Integration maturity matrix"
} else {
  for ($i = 8; $i -le 12; $i++) {
    Gate "G$( '{0:D2}' -f $i )-overview-content" $false "Overview not found"
  }
}

# ── G13-G15: Wave 8 Manifest ────────────────────────────────────

Write-Host "`n--- Wave 8 Manifest ---" -ForegroundColor Yellow

$wmPath = "$root\docs\waves\WAVE8-MANIFEST.md"
$g = Test-Path -LiteralPath $wmPath
Gate "G13-manifest-exists" $g "WAVE8-MANIFEST.md"

if (Test-Path -LiteralPath $wmPath) {
  $wm = Get-Content $wmPath -Raw

  $g = $wm -match "265"
  Gate "G14-nine-phases" $g "Contains all 9 phases (257-265)"

  $g = $wm -match "Dependencies"
  Gate "G15-dependency-graph" $g "Dependency graph"
} else {
  Gate "G14-nine-phases" $false "Manifest not found"
  Gate "G15-dependency-graph" $false "Manifest not found"
}

# ── G16-G20: Existing Infrastructure ────────────────────────────

Write-Host "`n--- Existing Infrastructure ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7"
Gate "G16-hl7-engine" $g "HL7 engine directory"

$g = Test-Path -LiteralPath "$root\apps\api\src\fhir"
Gate "G17-fhir-gateway" $g "FHIR gateway directory"

$g = Test-Path -LiteralPath "$root\apps\api\src\rcm"
Gate "G18-rcm-subsystem" $g "RCM subsystem directory"

$g = Test-Path -LiteralPath "$root\apps\api\src\exports"
Gate "G19-export-engine" $g "Export engine directory"

$g = Test-Path -LiteralPath "$root\apps\api\src\support"
Gate "G20-support-tooling" $g "Support tooling directory"

# ── Summary ──────────────────────────────────────────────────────

$total = $pass + $fail
Write-Host "`n=== Phase 257 Summary ===" -ForegroundColor Cyan
Write-Host "  PASSED: $pass / $total"
Write-Host "  FAILED: $fail / $total"
if ($fail -gt 0) {
  Write-Host "  RESULT: FAIL" -ForegroundColor Red
} else {
  Write-Host "  RESULT: PASS" -ForegroundColor Green
}
exit $fail
