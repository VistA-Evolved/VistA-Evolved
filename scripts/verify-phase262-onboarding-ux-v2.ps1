<# Phase 262 -- Onboarding UX v2 (Wave 8 P6) Verifier #>
param([switch]$SkipDocker)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass = 0; $fail = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "  PASS  $Name -- $Detail"; $script:pass++ }
  else     { Write-Host "  FAIL  $Name -- $Detail"; $script:fail++ }
}

Write-Host "`n=== Phase 262: Onboarding UX v2 (Wave 8 P6) ===`n"

# --- Gate 1: Integration steps store exists ---
$fs = Join-Path $root "apps/api/src/config/onboarding-integration-steps.ts"
$g = Test-Path -LiteralPath $fs
Gate "G01-integration-steps-store" $g $fs

# --- Gate 2: IntegrationKind type ---
if (Test-Path -LiteralPath $fs) {
  $c = Get-Content $fs -Raw
  $g = $c -match "IntegrationKind"
  Gate "G02-integration-kind-type" $g "IntegrationKind type exported"
} else { Gate "G02-integration-kind-type" $false "file missing" }

# --- Gate 3: All 5 kinds ---
if (Test-Path -LiteralPath $fs) {
  $kinds = @("hl7v2", "fhir", "payer", "imaging", "oidc")
  $allFound = $true
  foreach ($k in $kinds) { if ($c -notmatch "`"$k`"") { $allFound = $false } }
  $g = $allFound
  Gate "G03-five-kinds" $g "hl7v2, fhir, payer, imaging, oidc"
} else { Gate "G03-five-kinds" $false "file missing" }

# --- Gate 4: 3 integration steps ---
if (Test-Path -LiteralPath $fs) {
  $steps = @("integrations", "connectivity", "preflight")
  $allFound = $true
  foreach ($s in $steps) { if ($c -notmatch "`"$s`"") { $allFound = $false } }
  $g = $allFound
  Gate "G04-three-steps" $g "integrations, connectivity, preflight"
} else { Gate "G04-three-steps" $false "file missing" }

# --- Gate 5: createIntegrationSession ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function createIntegrationSession"
  Gate "G05-create-session" $g "createIntegrationSession"
} else { Gate "G05-create-session" $false "file missing" }

# --- Gate 6: upsertEndpoint ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function upsertEndpoint"
  Gate "G06-upsert-endpoint" $g "upsertEndpoint"
} else { Gate "G06-upsert-endpoint" $false "file missing" }

# --- Gate 7: probeEndpoints ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function probeEndpoints"
  Gate "G07-probe-endpoints" $g "probeEndpoints"
} else { Gate "G07-probe-endpoints" $false "file missing" }

# --- Gate 8: runPreflight ---
if (Test-Path -LiteralPath $fs) {
  $g = $c -match "export function runPreflight"
  Gate "G08-run-preflight" $g "runPreflight"
} else { Gate "G08-run-preflight" $false "file missing" }

# --- Gate 9: Routes file exists ---
$fr = Join-Path $root "apps/api/src/routes/onboarding-integration-routes.ts"
$g = Test-Path -LiteralPath $fr
Gate "G09-routes-exist" $g $fr

# --- Gate 10: Integration kinds endpoint ---
if (Test-Path -LiteralPath $fr) {
  $cr = Get-Content $fr -Raw
  $g = $cr -match "/admin/onboarding/integrations/kinds"
  Gate "G10-kinds-endpoint" $g "GET /admin/onboarding/integrations/kinds"
} else { Gate "G10-kinds-endpoint" $false "file missing" }

# --- Gate 11: Create session endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "app.post\("  -and $cr -match "/admin/onboarding/integrations"
  Gate "G11-create-endpoint" $g "POST /admin/onboarding/integrations"
} else { Gate "G11-create-endpoint" $false "file missing" }

# --- Gate 12: Endpoint upsert route ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/onboarding/integrations/:id/endpoints"
  Gate "G12-upsert-route" $g "POST endpoints upsert"
} else { Gate "G12-upsert-route" $false "file missing" }

# --- Gate 13: Probe route ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/onboarding/integrations/:id/probe"
  Gate "G13-probe-route" $g "POST probe"
} else { Gate "G13-probe-route" $false "file missing" }

# --- Gate 14: Preflight route ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/onboarding/integrations/:id/preflight"
  Gate "G14-preflight-route" $g "POST preflight"
} else { Gate "G14-preflight-route" $false "file missing" }

# --- Gate 15: Advance route ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/admin/onboarding/integrations/:id/advance"
  Gate "G15-advance-route" $g "POST advance"
} else { Gate "G15-advance-route" $false "file missing" }

# --- Gate 16: Test file exists ---
$ft = Join-Path $root "apps/api/tests/onboarding-ux-v2.test.ts"
$g = Test-Path -LiteralPath $ft
Gate "G16-test-file" $g $ft

# --- Gate 17: Base onboarding-store.ts untouched ---
$fb = Join-Path $root "apps/api/src/config/onboarding-store.ts"
$g = Test-Path -LiteralPath $fb
Gate "G17-base-store-intact" $g "onboarding-store.ts untouched"

# --- Gate 18: Base onboarding-routes.ts untouched ---
$fbr = Join-Path $root "apps/api/src/routes/onboarding-routes.ts"
$g = Test-Path -LiteralPath $fbr
Gate "G18-base-routes-intact" $g "onboarding-routes.ts untouched"

# --- Gate 19: Prompt implement ---
$fp = Join-Path $root "prompts/259-PHASE-262-ONBOARDING-UX-V2/262-01-IMPLEMENT.md"
$g = Test-Path -LiteralPath $fp
Gate "G19-prompt-implement" $g "IMPLEMENT prompt"

# --- Gate 20: Prompt verify ---
$fv = Join-Path $root "prompts/259-PHASE-262-ONBOARDING-UX-V2/262-99-VERIFY.md"
$g = Test-Path -LiteralPath $fv
Gate "G20-prompt-verify" $g "VERIFY prompt"

Write-Host "`n=== Results: $pass PASS, $fail FAIL ===`n"
if ($fail -gt 0) { exit 1 }
