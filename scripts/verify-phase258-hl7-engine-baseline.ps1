<#
.SYNOPSIS
  Verify Phase 258 -- HL7v2 Integration Engine Baseline
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

Write-Host "`n=== Phase 258 Verify: HL7v2 Engine Baseline ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── G01-G05: MLLP Engine Core ───────────────────────────────────

Write-Host "--- MLLP Engine Core ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\mllp-server.ts"
Gate "G01-mllp-server" $g "MLLP server"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\mllp-client.ts"
Gate "G02-mllp-client" $g "MLLP client"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\parser.ts"
Gate "G03-parser" $g "HL7 parser"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\ack-generator.ts"
Gate "G04-ack-gen" $g "ACK generator"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\index.ts"
Gate "G05-engine-lifecycle" $g "Engine lifecycle"

# ── G06-G09: Message Packs ──────────────────────────────────────

Write-Host "`n--- Message Packs ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\packs\adt-pack.ts"
Gate "G06-adt-pack" $g "ADT pack"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\packs\oru-pack.ts"
Gate "G07-oru-pack" $g "ORU pack"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\packs\siu-pack.ts"
Gate "G08-siu-pack" $g "SIU pack"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\packs\orm-pack.ts"
Gate "G09-orm-pack" $g "ORM pack"

# ── G10-G14: Routing Layer ──────────────────────────────────────

Write-Host "`n--- Routing Layer ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\routing\dispatcher.ts"
Gate "G10-dispatcher" $g "Dispatcher"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\routing\matcher.ts"
Gate "G11-matcher" $g "Matcher"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\routing\registry.ts"
Gate "G12-registry" $g "Route registry"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\routing\transform.ts"
Gate "G13-transform" $g "Transform pipeline"

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\routing\types.ts"
Gate "G14-routing-types" $g "Routing types"

# ── G15-G18: Tenant Endpoints (Phase 258) ────────────────────────

Write-Host "`n--- Tenant Endpoints ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\src\hl7\tenant-endpoints.ts"
Gate "G15-tenant-endpoints" $g "Tenant endpoint config"

$g = Test-Path -LiteralPath "$root\apps\api\src\routes\hl7-tenant-endpoints.ts"
Gate "G16-tenant-routes" $g "Tenant endpoint routes"

if (Test-Path -LiteralPath "$root\apps\api\src\routes\hl7-tenant-endpoints.ts") {
  $rc = Get-Content "$root\apps\api\src\routes\hl7-tenant-endpoints.ts" -Raw
  $g = $rc -match "api/platform/integrations/hl7v2/endpoints"
  Gate "G17-route-convention" $g "Platform admin route convention"
} else {
  Gate "G17-route-convention" $false "Routes not found"
}

if (Test-Path -LiteralPath "$root\apps\api\src\hl7\tenant-endpoints.ts") {
  $te = Get-Content "$root\apps\api\src\hl7\tenant-endpoints.ts" -Raw
  $g = $te -match "resolveInboundEndpoint"
  Gate "G18-inbound-resolver" $g "Inbound endpoint resolver"
} else {
  Gate "G18-inbound-resolver" $false "Tenant endpoints not found"
}

# ── G19-G20: Docker ─────────────────────────────────────────────

Write-Host "`n--- Docker ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\services\hl7\docker-compose.yml"
Gate "G19-docker-compose" $g "HL7 docker-compose"

$g = Test-Path -LiteralPath "$root\services\hl7\send-test-message.sh"
Gate "G20-test-sender" $g "Test message sender"

# ── G21-G22: Tests and API Routes ───────────────────────────────

Write-Host "`n--- Tests and Routes ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\tests\hl7-engine-baseline.test.ts"
Gate "G21-baseline-test" $g "Engine baseline test"

$g = Test-Path -LiteralPath "$root\apps\api\src\routes\hl7-engine.ts"
Gate "G22-engine-routes" $g "Engine API routes"

# ── Summary ──────────────────────────────────────────────────────

$total = $pass + $fail
Write-Host "`n=== Phase 258 Summary ===" -ForegroundColor Cyan
Write-Host "  PASSED: $pass / $total"
Write-Host "  FAILED: $fail / $total"
if ($fail -gt 0) {
  Write-Host "  RESULT: FAIL" -ForegroundColor Red
} else {
  Write-Host "  RESULT: PASS" -ForegroundColor Green
}
exit $fail
