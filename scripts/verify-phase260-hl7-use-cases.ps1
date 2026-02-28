<#
.SYNOPSIS
  Verify Phase 260 -- HL7v2 Use-Cases v1 (ADT+ORU+SIU)
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass = 0; $fail = 0

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green; $script:pass++ }
  else     { Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red;   $script:fail++ }
}

Write-Host "`n=== Phase 260 Verify: HL7v2 Use-Cases v1 ===" -ForegroundColor Cyan

# -- Fixtures --
Write-Host "`n--- Fixtures ---" -ForegroundColor Yellow

$fixtures = @("ADT_A01_admit.hl7","ADT_A03_discharge.hl7","ADT_A08_update.hl7","ORU_R01_lab_result.hl7","SIU_S12_new_appointment.hl7","SIU_S13_reschedule.hl7")
$allExist = $true
foreach ($f in $fixtures) {
  $p = "$root\services\hl7\fixtures\$f"
  if (-not (Test-Path -LiteralPath $p)) { $allExist = $false }
}
Gate "G01-fixtures" $allExist "All 6 fixture files exist"

# Spot check MSH header
$adtPath = "$root\services\hl7\fixtures\ADT_A01_admit.hl7"
if (Test-Path -LiteralPath $adtPath) {
  $c = Get-Content $adtPath -Raw
  $g = $c.StartsWith("MSH|")
  Gate "G02-msh-header" $g "Fixtures start with MSH"
} else { Gate "G02-msh-header" $false "ADT_A01 missing" }

# -- Domain Mapper --
Write-Host "`n--- Domain Mapper ---" -ForegroundColor Yellow

$dm = "$root\apps\api\src\hl7\domain-mapper.ts"
$g = Test-Path -LiteralPath $dm
Gate "G03-domain-mapper" $g "domain-mapper.ts exists"

if ($g) {
  $c = Get-Content $dm -Raw

  $g = $c -match "mapHl7ToDomainEvent"
  Gate "G04-universal-mapper" $g "Universal mapper function"

  $g = $c -match "mapAdtMessage"
  Gate "G05-adt-mapper" $g "ADT mapper"

  $g = $c -match "mapOruMessage"
  Gate "G06-oru-mapper" $g "ORU mapper"

  $g = $c -match "mapSiuMessage"
  Gate "G07-siu-mapper" $g "SIU mapper"

  $g = $c -match "patient\.admitted"
  Gate "G08-adt-a01-event" $g "ADT^A01 -> patient.admitted"

  $g = $c -match "patient\.discharged"
  Gate "G09-adt-a03-event" $g "ADT^A03 -> patient.discharged"

  $g = $c -match "result\.received"
  Gate "G10-oru-event" $g "ORU^R01 -> result.received"

  $g = $c -match "appointment\.booked"
  Gate "G11-siu-s12-event" $g "SIU^S12 -> appointment.booked"

  $g = $c -match "listSupportedMappings"
  Gate "G12-mapping-list" $g "Supported mappings list"

  # PHI safety: no patientName in payload
  $g = -not ($c -match "patientName:")
  Gate "G13-no-phi-name" $g "No patient names in domain event payload"
} else {
  for ($i = 4; $i -le 13; $i++) { Gate "G$('{0:D2}' -f $i)-skip" $false "domain-mapper missing" }
}

# -- Routes --
Write-Host "`n--- Use-Case Routes ---" -ForegroundColor Yellow

$rp = "$root\apps\api\src\routes\hl7-use-cases.ts"
$g = Test-Path -LiteralPath $rp
Gate "G14-use-case-routes" $g "hl7-use-cases.ts exists"

if ($g) {
  $c = Get-Content $rp -Raw

  $g = $c -match "/hl7/ingest"
  Gate "G15-ingest-endpoint" $g "Ingest endpoint"

  $g = $c -match "/hl7/use-cases"
  Gate "G16-use-cases-list" $g "Use-cases list endpoint"
} else {
  Gate "G15-ingest-endpoint" $false "Routes missing"
  Gate "G16-use-cases-list" $false "Routes missing"
}

# -- Tests + Prompts --
Write-Host "`n--- Tests + Prompts ---" -ForegroundColor Yellow

$g = Test-Path -LiteralPath "$root\apps\api\tests\hl7-use-cases.test.ts"
Gate "G17-test-file" $g "Use-case test file"

$g = Test-Path -LiteralPath "$root\prompts\257-PHASE-260-HL7V2-USE-CASES-V1\260-01-IMPLEMENT.md"
Gate "G18-prompt" $g "IMPLEMENT prompt"

# -- Summary --
$total = $pass + $fail
Write-Host "`n=== Phase 260 Summary ===" -ForegroundColor Cyan
Write-Host "  PASSED: $pass / $total"
Write-Host "  FAILED: $fail / $total"
if ($fail -gt 0) { Write-Host "  RESULT: FAIL" -ForegroundColor Red }
else              { Write-Host "  RESULT: PASS" -ForegroundColor Green }
exit $fail
