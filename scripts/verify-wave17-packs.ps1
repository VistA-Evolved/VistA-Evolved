<#
  Phase 353 -- Wave 17 Pack Certification Runner
  Verifies all W17 phases (347-352) are properly integrated.

  Gates:
  1.  facility-service.ts exists
  2.  facility-routes.ts exists
  3.  dept-rbac-templates.ts exists
  4.  dept-rbac-routes.ts exists
  5.  department-packs.json exists and is valid JSON
  6.  dept-pack-service.ts exists
  7.  dept-pack-routes.ts exists
  8.  workflow-inbox-service.ts exists
  9.  workflow-inbox-routes.ts exists
  10. patient-comms-service.ts exists
  11. patient-comms-routes.ts exists
  12. dept-scheduling-service.ts exists
  13. dept-scheduling-routes.ts exists
  14. register-routes.ts imports all 6 W17 route files
  15. register-routes.ts registers all 6 W17 route plugins
  16. security.ts has AUTH_RULES for all W17 route prefixes
  17. pg-migrate.ts has migrations v38-v43
  18. pg-migrate.ts CANONICAL_RLS_TABLES has all W17 tables
  19. store-policy.ts has all W17 store entries
  20. tsc compiles cleanly (skippable with -SkipTsc)
  21. department-packs.json has 10 pack definitions
  22. All pack prerequisite modules exist in modules.json
#>

param(
  [switch]$SkipTsc
)

$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$total = 0

function Gate {
  param([string]$label, [bool]$ok, [string]$detail)
  $script:total++
  if ($ok) {
    $script:pass++
    Write-Host "  PASS  $label" -ForegroundColor Green
  } else {
    $script:fail++
    Write-Host "  FAIL  $label -- $detail" -ForegroundColor Red
  }
}

Write-Host "`n=== Phase 353: Wave 17 Pack Certification Runner ===`n"

# ---- Gate 1-13: File existence ----
$api = Join-Path $root "apps/api/src"

$files = @(
  @("facility-service.ts exists",        "services/facility-service.ts"),
  @("facility-routes.ts exists",         "routes/facility-routes.ts"),
  @("dept-rbac-templates.ts exists",     "auth/dept-rbac-templates.ts"),
  @("dept-rbac-routes.ts exists",        "routes/dept-rbac-routes.ts"),
  @("dept-pack-service.ts exists",       "services/dept-pack-service.ts"),
  @("dept-pack-routes.ts exists",        "routes/dept-pack-routes.ts"),
  @("workflow-inbox-service.ts exists",  "services/workflow-inbox-service.ts"),
  @("workflow-inbox-routes.ts exists",   "routes/workflow-inbox-routes.ts"),
  @("patient-comms-service.ts exists",   "services/patient-comms-service.ts"),
  @("patient-comms-routes.ts exists",    "routes/patient-comms-routes.ts"),
  @("dept-scheduling-service.ts exists", "services/dept-scheduling-service.ts"),
  @("dept-scheduling-routes.ts exists",  "routes/dept-scheduling-routes.ts")
)

foreach ($f in $files) {
  $path = Join-Path $api $f[1]
  Gate $f[0] (Test-Path -LiteralPath $path) "File not found: $($f[1])"
}

# Gate 5 separately (not under $api)
$packsPath = Join-Path $root "config/packs/department-packs.json"
Gate "department-packs.json exists" (Test-Path -LiteralPath $packsPath) "File not found: config/packs/department-packs.json"

# ---- Gate 14: register-routes imports all 6 W17 route files ----
$regFile = Join-Path $api "server/register-routes.ts"
$regContent = Get-Content $regFile -Raw -ErrorAction SilentlyContinue
$imports = @(
  "facility-routes",
  "dept-rbac-routes",
  "dept-pack-routes",
  "workflow-inbox-routes",
  "patient-comms-routes",
  "dept-scheduling-routes"
)
$allImports = $true
foreach ($imp in $imports) {
  if ($regContent -notmatch [regex]::Escape($imp)) {
    $allImports = $false
    Write-Host "    Missing import: $imp" -ForegroundColor Yellow
  }
}
Gate "register-routes imports all 6 W17 routes" $allImports "Missing W17 route imports"

# ---- Gate 15: register-routes registers all 6 W17 route plugins ----
$registrations = @(
  "facilityRoutes",
  "deptRbacRoutes",
  "deptPackRoutes",
  "workflowInboxRoutes",
  "patientCommsRoutes",
  "deptSchedulingRoutes"
)
$allRegs = $true
foreach ($reg in $registrations) {
  if ($regContent -notmatch "server\.register\($reg\)") {
    $allRegs = $false
    Write-Host "    Missing registration: $reg" -ForegroundColor Yellow
  }
}
Gate "register-routes registers all 6 W17 plugins" $allRegs "Missing W17 server.register() calls"

# ---- Gate 16: AUTH_RULES for all W17 route prefixes ----
$secFile = Join-Path $api "middleware/security.ts"
$secContent = Get-Content $secFile -Raw -ErrorAction SilentlyContinue
$authPrefixes = @(
  "facilities",
  "departments",
  "locations",
  "provider-assignments",
  "dept-rbac",
  "dept-packs",
  "workflow",
  "patient-comms",
  "dept-scheduling"
)
$allAuth = $true
foreach ($pfx in $authPrefixes) {
  if ($secContent -notmatch [regex]::Escape($pfx)) {
    $allAuth = $false
    Write-Host "    Missing AUTH_RULE for: /$pfx/" -ForegroundColor Yellow
  }
}
Gate "security.ts AUTH_RULES for all W17 prefixes" $allAuth "Missing AUTH_RULES entries"

# ---- Gate 17: PG migrations v38-v43 ----
$pgFile = Join-Path $api "platform/pg/pg-migrate.ts"
$pgContent = Get-Content $pgFile -Raw -ErrorAction SilentlyContinue
$migrations = @(
  "phase347_facility_location_model",
  "phase348_dept_rbac_templates",
  "phase349_department_packs",
  "phase350_workflow_inbox",
  "phase351_patient_comms",
  "phase352_dept_scheduling"
)
$allMigrations = $true
foreach ($mig in $migrations) {
  if ($pgContent -notmatch [regex]::Escape($mig)) {
    $allMigrations = $false
    Write-Host "    Missing migration: $mig" -ForegroundColor Yellow
  }
}
Gate "pg-migrate.ts has all 6 W17 migrations (v38-v43)" $allMigrations "Missing PG migrations"

# ---- Gate 18: CANONICAL_RLS_TABLES has all W17 tables ----
$rlsTables = @(
  "facility",
  "department",
  "location",
  "provider_facility_assignment",
  "dept_role_template",
  "dept_role_membership",
  "pack_installation",
  "workflow_task",
  "workflow_task_event",
  "patient_consent",
  "notification_template",
  "notification_record",
  "schedule_template",
  "dept_resource",
  "resource_allocation",
  "scheduling_rule",
  "cross_dept_referral"
)
$allRls = $true
foreach ($tbl in $rlsTables) {
  if ($pgContent -notmatch "`"$tbl`"") {
    $allRls = $false
    Write-Host "    Missing RLS table: $tbl" -ForegroundColor Yellow
  }
}
Gate "CANONICAL_RLS_TABLES has all 17 W17 tables" $allRls "Missing RLS table entries"

# ---- Gate 19: store-policy.ts has all W17 store entries ----
$spFile = Join-Path $api "platform/store-policy.ts"
$spContent = Get-Content $spFile -Raw -ErrorAction SilentlyContinue
$storeIds = @(
  "facility-store",
  "department-store",
  "location-store",
  "provider-facility-assignment-store",
  "dept-role-template-store",
  "dept-role-membership-store",
  "pack-installation-store",
  "pack-registry",
  "workflow-task-store",
  "workflow-task-event-log",
  "patient-consent-store",
  "notification-template-store",
  "notification-log",
  "notification-provider-registry",
  "dept-schedule-templates",
  "dept-resources",
  "dept-resource-allocations",
  "dept-scheduling-rules",
  "dept-referrals"
)
$allStores = $true
foreach ($sid in $storeIds) {
  if ($spContent -notmatch [regex]::Escape($sid)) {
    $allStores = $false
    Write-Host "    Missing store: $sid" -ForegroundColor Yellow
  }
}
Gate "store-policy.ts has all 19 W17 store entries" $allStores "Missing store-policy entries"

# ---- Gate 20: tsc compiles cleanly ----
if ($SkipTsc) {
  Write-Host "  SKIP  tsc (--SkipTsc)" -ForegroundColor Yellow
} else {
  Push-Location (Join-Path $root "apps/api")
  $tscOut = npx tsc --noEmit 2>&1
  Pop-Location
  $tscOk = ($LASTEXITCODE -eq 0)
  Gate "tsc compiles cleanly" $tscOk "tsc errors found"
  if (-not $tscOk -and $tscOut) {
    $tscOut | Select-Object -First 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
  }
}

# ---- Gate 21: department-packs.json has 10 pack definitions ----
$packsFile = Join-Path $root "config/packs/department-packs.json"
$packCount = 0
try {
  $packsJson = Get-Content $packsFile -Raw | ConvertFrom-Json
  $packCount = $packsJson.Count
} catch {
  # invalid JSON
}
Gate "department-packs.json has 10 pack definitions" ($packCount -eq 10) "Found $packCount packs, expected 10"

# ---- Gate 22: Pack prerequisites reference valid modules ----
$modsFile = Join-Path $root "config/modules.json"
$modsOk = $true
if (Test-Path -LiteralPath $modsFile) {
  try {
    $modsRaw = Get-Content $modsFile -Raw
    if ($modsRaw.Length -gt 0 -and $modsRaw[0] -eq [char]0xFEFF) { $modsRaw = $modsRaw.Substring(1) }
    $modsJson = $modsRaw | ConvertFrom-Json
    # modules.json uses object keys under .modules (e.g. .modules.clinical)
    $moduleIds = $modsJson.modules | Get-Member -MemberType NoteProperty | ForEach-Object { $_.Name }
    foreach ($pack in $packsJson) {
      foreach ($mod in $pack.modules) {
        if ($mod -notin $moduleIds) {
          $modsOk = $false
          Write-Host "    Pack '$($pack.id)' references unknown module: $mod" -ForegroundColor Yellow
        }
      }
    }
  } catch {
    $modsOk = $false
  }
} else {
  $modsOk = $false
}
Gate "Pack modules reference valid module IDs" $modsOk "Invalid module references in packs"

# ---- Summary ----
Write-Host "`n=== Phase 353 Verification: $pass / $total gates passed ===`n"
if ($fail -gt 0) {
  Write-Host "  $fail gate(s) FAILED" -ForegroundColor Red
  exit 1
} else {
  Write-Host "  ALL GATES PASSED" -ForegroundColor Green
  exit 0
}
