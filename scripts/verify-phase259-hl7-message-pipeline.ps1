<#
.SYNOPSIS
  Verify Phase 259 -- HL7v2 Message Pipeline
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

Write-Host "`n=== Phase 259 Verify: HL7v2 Message Pipeline ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# -- G01-G03: Message Event Store --
Write-Host "--- Message Event Store ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\message-event-store.ts"
Gate "G01-event-store" $g "Message event store exists"

if ($g) {
  $c = Get-Content "$root\apps\api\src\hl7\message-event-store.ts" -Raw
  $g = $c -match "recordMessageEvent"
  Gate "G02-record-event" $g "recordMessageEvent exported"

  $g = $c -match "verifyMessageEventChain"
  Gate "G03-verify-chain" $g "Hash chain verification"

  $g = $c -match "PHI_SEGMENT_PREFIXES"
  Gate "G04-phi-redaction" $g "PHI segment redaction"

  $g = $c -match "setHl7EventDbRepo"
  Gate "G05-db-repo-hook" $g "DB repo injection hook"
} else {
  Gate "G02-record-event" $false "File missing"
  Gate "G03-verify-chain" $false "File missing"
  Gate "G04-phi-redaction" $false "File missing"
  Gate "G05-db-repo-hook" $false "File missing"
}

# -- G06-G09: Enhanced DLQ --
Write-Host "`n--- Enhanced Dead-Letter Queue ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\dead-letter-enhanced.ts"
Gate "G06-dlq-enhanced" $g "Enhanced DLQ exists"

if ($g) {
  $c = Get-Content "$root\apps\api\src\hl7\dead-letter-enhanced.ts" -Raw
  $g = $c -match "rawMessageVault"
  Gate "G07-raw-vault" $g "Raw message vault"

  $g = $c -match "replayDeadLetter"
  Gate "G08-replay" $g "Replay function"

  $g = $c -match "resolveDeadLetter"
  Gate "G09-resolve" $g "Resolve function"
} else {
  Gate "G07-raw-vault" $false "File missing"
  Gate "G08-replay" $false "File missing"
  Gate "G09-resolve" $false "File missing"
}

# -- G10-G14: Pipeline Routes --
Write-Host "`n--- Pipeline Routes ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\routes\hl7-pipeline.ts"
Gate "G10-pipeline-routes" $g "Pipeline routes exist"

if ($g) {
  $c = Get-Content "$root\apps\api\src\routes\hl7-pipeline.ts" -Raw

  $g = $c -match "/hl7/pipeline/events"
  Gate "G11-events-endpoint" $g "Event query endpoint"

  $g = $c -match "/hl7/pipeline/verify"
  Gate "G12-verify-endpoint" $g "Chain verify endpoint"

  $g = $c -match "/hl7/dlq/:id/replay"
  Gate "G13-replay-endpoint" $g "DLQ replay endpoint"

  $g = $c -match "/hl7/dlq/:id/resolve"
  Gate "G14-resolve-endpoint" $g "DLQ resolve endpoint"

  $g = $c -match "/hl7/pipeline/stats"
  Gate "G15-stats-endpoint" $g "Pipeline stats endpoint"
} else {
  Gate "G11-events-endpoint" $false "File missing"
  Gate "G12-verify-endpoint" $false "File missing"
  Gate "G13-replay-endpoint" $false "File missing"
  Gate "G14-resolve-endpoint" $false "File missing"
  Gate "G15-stats-endpoint" $false "File missing"
}

# -- G16-G18: Store Policy --
Write-Host "`n--- Store Policy ---" -ForegroundColor Yellow

$sp = "$root\apps\api\src\platform\store-policy.ts"
if (Test-Path -LiteralPath $sp) {
  $c = Get-Content $sp -Raw

  $g = $c -match "hl7-message-events"
  Gate "G16-store-events" $g "Event store registered"

  $g = $c -match "hl7-dead-letter-enhanced"
  Gate "G17-store-dlq" $g "DLQ store registered"

  $g = $c -match "hl7-tenant-endpoints"
  Gate "G18-store-tenant" $g "Tenant endpoint store registered"
} else {
  Gate "G16-store-events" $false "store-policy.ts missing"
  Gate "G17-store-dlq" $false "store-policy.ts missing"
  Gate "G18-store-tenant" $false "store-policy.ts missing"
}

# -- G19-G20: Tests --
Write-Host "`n--- Tests ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\tests\hl7-message-pipeline.test.ts"
Gate "G19-pipeline-test" $g "Pipeline test exists"

# -- G20: Prompts --
$g = Test-Path -LiteralPath "$root\prompts\256-PHASE-259-HL7V2-MESSAGE-PIPELINE\259-01-IMPLEMENT.md"
Gate "G20-prompt-implement" $g "IMPLEMENT prompt"

# -- Summary --
$total = $pass + $fail
Write-Host "`n=== Phase 259 Summary ===" -ForegroundColor Cyan
Write-Host "  PASSED: $pass / $total"
Write-Host "  FAILED: $fail / $total"
if ($fail -gt 0) {
  Write-Host "  RESULT: FAIL" -ForegroundColor Red
} else {
  Write-Host "  RESULT: PASS" -ForegroundColor Green
}
exit $fail
