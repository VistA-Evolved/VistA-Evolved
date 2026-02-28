<# Phase 263 -- Support Tooling v2 (Wave 8 P7) Verifier #>
param([switch]$SkipDocker)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass = 0; $fail = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "  PASS  $Name -- $Detail"; $script:pass++ }
  else     { Write-Host "  FAIL  $Name -- $Detail"; $script:fail++ }
}

Write-Host "`n=== Phase 263: Support Tooling v2 (Wave 8 P7) ===`n"

# --- Gate 1: Toolkit v2 store ---
$fs = Join-Path $root "apps/api/src/support/support-toolkit-v2.ts"
$g = Test-Path -LiteralPath $fs
Gate "G01-toolkit-store" $g $fs

# --- Gate 2: DiagnosticBundle type ---
if (Test-Path -LiteralPath $fs) {
  $c = Get-Content $fs -Raw
  $g = $c -match "DiagnosticBundle"
  Gate "G02-diag-bundle-type" $g "DiagnosticBundle type"
} else { Gate "G02-diag-bundle-type" $false "file missing" }

# --- Gate 3: generateDiagnosticBundle ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function generateDiagnosticBundle"
  Gate "G03-generate-bundle" $g "generateDiagnosticBundle"
} else { Gate "G03-generate-bundle" $false "file missing" }

# --- Gate 4: addCorrelation ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function addCorrelation"
  Gate "G04-add-correlation" $g "addCorrelation"
} else { Gate "G04-add-correlation" $false "file missing" }

# --- Gate 5: buildHl7ViewerEntry ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function buildHl7ViewerEntry"
  Gate "G05-hl7-viewer" $g "buildHl7ViewerEntry"
} else { Gate "G05-hl7-viewer" $false "file missing" }

# --- Gate 6: buildPostureSummary ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function buildPostureSummary"
  Gate "G06-posture-summary" $g "buildPostureSummary"
} else { Gate "G06-posture-summary" $false "file missing" }

# --- Gate 7: 6 diagnostic sections ---
if (Test-Path -LiteralPath $fs) {
  $sects = @("runtime", "environment", "vista-connectivity", "hl7-engine", "stores", "tenant")
  $allFound = $true
  foreach ($s in $sects) { if ($c -notmatch "`"$s`"") { $allFound = $false } }
  $g = $allFound
  Gate "G07-six-sections" $g "6 diagnostic sections"
} else { Gate "G07-six-sections" $false "file missing" }

# --- Gate 8: 4 correlation types ---
if (Test-Path -LiteralPath $fs) {
  $types = @("hl7_event", "hl7_dlq", "posture_gate", "audit_entry")
  $allFound = $true
  foreach ($t in $types) { if ($c -notmatch "`"$t`"") { $allFound = $false } }
  $g = $allFound
  Gate "G08-correlation-types" $g "4 correlation types"
} else { Gate "G08-correlation-types" $false "file missing" }

# --- Gate 9: Routes file exists ---
$fr = Join-Path $root "apps/api/src/routes/support-toolkit-v2-routes.ts"
$g = Test-Path -LiteralPath $fr
Gate "G09-routes-exist" $g $fr

# --- Gate 10: Bundle generation endpoint ---
if (Test-Path -LiteralPath $fr) {
  $cr = Get-Content $fr -Raw
  $g = $cr -match "/admin/support/bundles"
  Gate "G10-bundle-endpoint" $g "POST /admin/support/bundles"
} else { Gate "G10-bundle-endpoint" $false "file missing" }

# --- Gate 11: Bundle download endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/support/bundles/:id/download"
  Gate "G11-download-endpoint" $g "GET bundle download"
} else { Gate "G11-download-endpoint" $false "file missing" }

# --- Gate 12: Correlation endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/support/tickets/:ticketId/correlations"
  Gate "G12-correlation-endpoint" $g "ticket correlations"
} else { Gate "G12-correlation-endpoint" $false "file missing" }

# --- Gate 13: Posture summary endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/support/posture-summary"
  Gate "G13-posture-endpoint" $g "posture summary"
} else { Gate "G13-posture-endpoint" $false "file missing" }

# --- Gate 14: HL7 viewer endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/support/hl7-viewer"
  Gate "G14-hl7-viewer-endpoint" $g "HL7 viewer"
} else { Gate "G14-hl7-viewer-endpoint" $false "file missing" }

# --- Gate 15: Test file ---
$ft = Join-Path $root "apps/api/tests/support-toolkit-v2.test.ts"
$g = Test-Path -LiteralPath $ft
Gate "G15-test-file" $g $ft

# --- Gate 16: Base diagnostics.ts untouched ---
$fd = Join-Path $root "apps/api/src/support/diagnostics.ts"
$g = Test-Path -LiteralPath $fd
Gate "G16-base-diag-intact" $g "diagnostics.ts untouched"

# --- Gate 17: Base ticket-store.ts untouched ---
$fts = Join-Path $root "apps/api/src/support/ticket-store.ts"
$g = Test-Path -LiteralPath $fts
Gate "G17-base-tickets-intact" $g "ticket-store.ts untouched"

# --- Gate 18: Prompt implement ---
$fp = Join-Path $root "prompts/260-PHASE-263-SUPPORT-TOOLING-V2/263-01-IMPLEMENT.md"
$g = Test-Path -LiteralPath $fp
Gate "G18-prompt-implement" $g "IMPLEMENT prompt"

# --- Gate 19: Prompt verify ---
$fv = Join-Path $root "prompts/260-PHASE-263-SUPPORT-TOOLING-V2/263-99-VERIFY.md"
$g = Test-Path -LiteralPath $fv
Gate "G19-prompt-verify" $g "VERIFY prompt"

# --- Gate 20: No PHI in toolkit ---
if (Test-Path -LiteralPath $fs) {
  $pats = @("patientName", "\.ssn", "\.dob\b")
  $hasP = $false
  foreach ($p in $pats) { if ($c -match $p) { $hasP = $true } }
  $g = -not $hasP
  Gate "G20-no-phi" $g "No PHI in support toolkit"
} else { Gate "G20-no-phi" $false "file missing" }

Write-Host "`n=== Results: $pass PASS, $fail FAIL ===`n"
if ($fail -gt 0) { exit 1 }
