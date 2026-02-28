<#
  verify-phase264-data-portability-exports.ps1
  Phase 264 -- Data Portability Exports v1 (Wave 8 P8)
  20 gates
#>
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
$pass = 0; $fail = 0; $total = 20

function Gate([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) {
    Write-Host "  PASS  $Name -- $Detail" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $Name -- $Detail" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 264: Data Portability Exports v1 ===" -ForegroundColor Cyan

# --- Gate 1: data-portability.ts exists ---
$g = Test-Path -LiteralPath "$root\apps\api\src\exports\data-portability.ts"
Gate "G01-engine-file" $g "data-portability.ts exists"

# --- Gate 2: Routes file exists ---
$g = Test-Path -LiteralPath "$root\apps\api\src\routes\data-portability-routes.ts"
Gate "G02-routes-file" $g "data-portability-routes.ts exists"

# --- Gate 3: Test file exists ---
$g = Test-Path -LiteralPath "$root\apps\api\tests\data-portability.test.ts"
Gate "G03-test-file" $g "data-portability.test.ts exists"

# --- Gate 4: BulkExportJob interface ---
$eng = ""
if (Test-Path -LiteralPath "$root\apps\api\src\exports\data-portability.ts") {
  $eng = Get-Content "$root\apps\api\src\exports\data-portability.ts" -Raw
}
$g = $eng -match "BulkExportJob"
Gate "G04-bulk-export-job" $g "BulkExportJob type defined"

# --- Gate 5: kickoffBulkExport ---
$g = $eng -match "export function kickoffBulkExport"
Gate "G05-kickoff-bulk" $g "kickoffBulkExport function exists"

# --- Gate 6: PatientChartBundle ---
$g = $eng -match "PatientChartBundle"
Gate "G06-patient-chart" $g "PatientChartBundle type defined"

# --- Gate 7: generatePatientChart ---
$g = $eng -match "export function generatePatientChart"
Gate "G07-gen-patient-chart" $g "generatePatientChart function exists"

# --- Gate 8: TenantExportJob ---
$g = $eng -match "TenantExportJob"
Gate "G08-tenant-export" $g "TenantExportJob type defined"

# --- Gate 9: kickoffTenantExport ---
$g = $eng -match "export function kickoffTenantExport"
Gate "G09-kickoff-tenant" $g "kickoffTenantExport function exists"

# --- Gate 10: verifyExportManifest ---
$g = $eng -match "export function verifyExportManifest"
Gate "G10-verify-manifest" $g "verifyExportManifest function exists"

# --- Gate 11: SHA-256 manifest hashing ---
$g = $eng -match "sha256"
Gate "G11-sha256" $g "SHA-256 used for manifest integrity"

# --- Gate 12: 7 FHIR resource types ---
$rts = @("Patient","AllergyIntolerance","Condition","Observation","MedicationRequest","DocumentReference","Encounter")
$allRt = $true
foreach ($rt in $rts) {
  if ($eng -notmatch [regex]::Escape("`"$rt`"")) { $allRt = $false }
}
Gate "G12-fhir-resource-types" $allRt "7 FHIR resource types defined"

# --- Gate 13: 7 tenant export scopes ---
$scopes = @("clinical","rcm","audit","analytics","platform","imaging","integrations")
$allS = $true
foreach ($s in $scopes) {
  if ($eng -notmatch [regex]::Escape("`"$s`"")) { $allS = $false }
}
Gate "G13-tenant-scopes" $allS "7 tenant export scopes defined"

# --- Gate 14: Routes bulk kickoff ---
$rts2 = ""
if (Test-Path -LiteralPath "$root\apps\api\src\routes\data-portability-routes.ts") {
  $rts2 = Get-Content "$root\apps\api\src\routes\data-portability-routes.ts" -Raw
}
$g = $rts2 -match "/admin/exports/bulk/kickoff"
Gate "G14-route-bulk-kickoff" $g "Bulk export kickoff route"

# --- Gate 15: Routes patient chart ---
$g = $rts2 -match "/admin/exports/patient-chart"
Gate "G15-route-patient-chart" $g "Patient chart export route"

# --- Gate 16: Routes tenant kickoff ---
$g = $rts2 -match "/admin/exports/tenant/kickoff"
Gate "G16-route-tenant-kickoff" $g "Tenant export kickoff route"

# --- Gate 17: Routes manifest verification ---
$g = $rts2 -match "/admin/exports/verify-manifest"
Gate "G17-route-verify-manifest" $g "Manifest verification route"

# --- Gate 18: 202 async responses ---
$g = $rts2 -match "\.code\(202\)"
Gate "G18-async-202" $g "Async kickoffs return 202"

# --- Gate 19: Existing export-engine preserved ---
$g = Test-Path -LiteralPath "$root\apps\api\src\exports\export-engine.ts"
Gate "G19-existing-export-engine" $g "export-engine.ts preserved"

# --- Gate 20: Prompt files ---
$pDir = "$root\prompts\261-PHASE-264-DATA-PORTABILITY-EXPORTS"
$g1 = Test-Path -LiteralPath "$pDir\264-01-IMPLEMENT.md"
$g2 = Test-Path -LiteralPath "$pDir\264-99-VERIFY.md"
$g = $g1 -and $g2
Gate "G20-prompt-files" $g "Prompt files present"

# --- Summary ---
Write-Host "`n=== Results: $pass PASS / $fail FAIL / $total TOTAL ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
