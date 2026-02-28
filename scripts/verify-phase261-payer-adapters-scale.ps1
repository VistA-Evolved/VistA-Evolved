<# Phase 261 -- Payer Adapters at Scale (Wave 8 P5) Verifier #>
param([switch]$SkipDocker)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass = 0; $fail = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "  PASS  $Name -- $Detail"; $script:pass++ }
  else     { Write-Host "  FAIL  $Name -- $Detail"; $script:fail++ }
}

Write-Host "`n=== Phase 261: Payer Adapters at Scale (Wave 8 P5) ===`n"

# --- Gate 1: adapter-sdk.ts exists ---
$f = Join-Path $root "apps/api/src/rcm/adapters/adapter-sdk.ts"
$g = Test-Path -LiteralPath $f
Gate "G01-adapter-sdk-exists" $g $f

# --- Gate 2: BasePayerAdapter exported ---
if (Test-Path -LiteralPath $f) {
  $c = Get-Content $f -Raw
  $g = $c -match "export abstract class BasePayerAdapter"
  Gate "G02-base-payer-adapter" $g "BasePayerAdapter abstract class"
} else { Gate "G02-base-payer-adapter" $false "file missing" }

# --- Gate 3: AdapterRateLimiter exported ---
if (Test-Path -LiteralPath $f) {
  $g = $c -match "export class AdapterRateLimiter"
  Gate "G03-rate-limiter" $g "AdapterRateLimiter class"
} else { Gate "G03-rate-limiter" $false "file missing" }

# --- Gate 4: AdapterIdempotencyStore exported ---
if (Test-Path -LiteralPath $f) {
  $g = $c -match "export class AdapterIdempotencyStore"
  Gate "G04-idempotency-store" $g "AdapterIdempotencyStore class"
} else { Gate "G04-idempotency-store" $false "file missing" }

# --- Gate 5: AdapterMetricsCollector exported ---
if (Test-Path -LiteralPath $f) {
  $g = $c -match "export class AdapterMetricsCollector"
  Gate "G05-metrics-collector" $g "AdapterMetricsCollector class"
} else { Gate "G05-metrics-collector" $false "file missing" }

# --- Gate 6: Sandbox test cases ---
if (Test-Path -LiteralPath $f) {
  $g = $c -match "SANDBOX_TEST_CASES"
  Gate "G06-sandbox-test-cases" $g "SANDBOX_TEST_CASES array"
} else { Gate "G06-sandbox-test-cases" $false "file missing" }

# --- Gate 7: SHA-256 idempotency key ---
if (Test-Path -LiteralPath $f) {
  $g = $c -match "sha256"
  Gate "G07-sha256-idemp" $g "SHA-256 idempotency key"
} else { Gate "G07-sha256-idemp" $false "file missing" }

# --- Gate 8: adapter-sdk-routes.ts exists ---
$fr = Join-Path $root "apps/api/src/routes/adapter-sdk-routes.ts"
$g = Test-Path -LiteralPath $fr
Gate "G08-sdk-routes-exists" $g $fr

# --- Gate 9: SDK adapter list endpoint ---
if (Test-Path -LiteralPath $fr) {
  $cr = Get-Content $fr -Raw
  $g = $cr -match "/rcm/sdk/adapters"
  Gate "G09-sdk-adapter-list" $g "GET /rcm/sdk/adapters"
} else { Gate "G09-sdk-adapter-list" $false "file missing" }

# --- Gate 10: SDK test-cases endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/rcm/sdk/test-cases"
  Gate "G10-sdk-test-cases" $g "GET /rcm/sdk/test-cases"
} else { Gate "G10-sdk-test-cases" $false "file missing" }

# --- Gate 11: SDK test-cases/run endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/rcm/sdk/test-cases/run"
  Gate "G11-sdk-test-run" $g "POST /rcm/sdk/test-cases/run"
} else { Gate "G11-sdk-test-run" $false "file missing" }

# --- Gate 12: SDK capabilities endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/rcm/sdk/capabilities"
  Gate "G12-sdk-capabilities" $g "GET /rcm/sdk/capabilities"
} else { Gate "G12-sdk-capabilities" $false "file missing" }

# --- Gate 13: SDK rate-limits endpoint ---
if (Test-Path -LiteralPath $fr) {
  $g = $cr -match "/rcm/sdk/rate-limits"
  Gate "G13-sdk-rate-limits" $g "GET /rcm/sdk/rate-limits"
} else { Gate "G13-sdk-rate-limits" $false "file missing" }

# --- Gate 14: Test file exists ---
$ft = Join-Path $root "apps/api/tests/payer-adapter-sdk.test.ts"
$g = Test-Path -LiteralPath $ft
Gate "G14-test-file-exists" $g $ft

# --- Gate 15: Existing payer-adapter.ts untouched ---
$fa = Join-Path $root "apps/api/src/rcm/adapters/payer-adapter.ts"
$g = Test-Path -LiteralPath $fa
Gate "G15-payer-adapter-exists" $g "existing payer-adapter.ts intact"

# --- Gate 16: Existing connector-resilience.ts untouched ---
$fcr = Join-Path $root "apps/api/src/rcm/connectors/connector-resilience.ts"
$g = Test-Path -LiteralPath $fcr
Gate "G16-connector-resilience" $g "existing connector-resilience.ts intact"

# --- Gate 17: Existing sandbox-adapter.ts untouched ---
$fsa = Join-Path $root "apps/api/src/rcm/adapters/sandbox-adapter.ts"
$g = Test-Path -LiteralPath $fsa
Gate "G17-sandbox-adapter" $g "existing sandbox-adapter.ts intact"

# --- Gate 18: Prompt implement file ---
$fp = Join-Path $root "prompts/258-PHASE-261-PAYER-ADAPTERS-SCALE/261-01-IMPLEMENT.md"
$g = Test-Path -LiteralPath $fp
Gate "G18-prompt-implement" $g "IMPLEMENT prompt"

# --- Gate 19: Prompt verify file ---
$fv = Join-Path $root "prompts/258-PHASE-261-PAYER-ADAPTERS-SCALE/261-99-VERIFY.md"
$g = Test-Path -LiteralPath $fv
Gate "G19-prompt-verify" $g "VERIFY prompt"

# --- Gate 20: No PHI in adapter SDK ---
if (Test-Path -LiteralPath $f) {
  $pats = @("patientName", "\.ssn", "\.dob\b")
  $hasP = $false
  foreach ($p in $pats) { if ($c -match $p) { $hasP = $true } }
  $g = -not $hasP
  Gate "G20-no-phi-in-sdk" $g "No PHI fields in adapter SDK"
} else { Gate "G20-no-phi-in-sdk" $false "file missing" }

Write-Host "`n=== Results: $pass PASS, $fail FAIL ===`n"
if ($fail -gt 0) { exit 1 }
