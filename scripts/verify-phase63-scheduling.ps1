<# Phase 63 -- Scheduling v1 (VistA SD* First) + Portal Appointments Verifier
   Gates: sd-plan.json, scheduling routes, VistA adapter, clinician UI,
          portal wiring, audit, double-booking lock, dead-click, docs
#>
param([switch]$SkipDocker)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 0

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id  $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id  $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id  $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 63 -- Scheduling v1 (VistA SD* First) ===" -ForegroundColor Cyan

# ---- G63-01: sd-plan.json exists ----
Write-Host "`n--- G63-01: SD Plan Artifact ---" -ForegroundColor Yellow

Gate "G63-01a" "artifacts/phase63/sd-plan.json exists" {
  Test-Path -LiteralPath "artifacts/phase63/sd-plan.json"
}
Gate "G63-01b" "sd-plan.json has inventory array with Vivian RPCs" {
  $j = Get-Content "artifacts/phase63/sd-plan.json" -Raw | ConvertFrom-Json
  ($j.inventory | Where-Object { $_.inVivian }).Count -gt 0
}
Gate "G63-01c" "sd-plan.json has inventory array with sandbox RPCs" {
  $j = Get-Content "artifacts/phase63/sd-plan.json" -Raw | ConvertFrom-Json
  ($j.inventory | Where-Object { $_.inSandbox }).Count -gt 0
}
Gate "G63-01d" "sd-plan.json has keySequences object" {
  $j = Get-Content "artifacts/phase63/sd-plan.json" -Raw | ConvertFrom-Json
  ($j.keySequences | Get-Member -MemberType NoteProperty).Count -gt 0
}

# ---- G63-02: Scheduling appointments route ----
Write-Host "`n--- G63-02: Scheduling Routes ---" -ForegroundColor Yellow

Gate "G63-02a" "scheduling/index.ts exists" {
  Test-Path -LiteralPath "apps/api/src/routes/scheduling/index.ts"
}
Gate "G63-02b" "GET /scheduling/appointments route defined" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'server\.get\(.*scheduling/appointments'
}
Gate "G63-02c" "GET /scheduling/appointments/range route defined" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'scheduling/appointments/range'
}
Gate "G63-02d" "Route references SDOE RPCs" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'SDOE'
}

# ---- G63-03: Clinics route uses SD W/L ----
Write-Host "`n--- G63-03: Clinics/Providers Routes ---" -ForegroundColor Yellow

Gate "G63-03a" "GET /scheduling/clinics route defined" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'scheduling/clinics'
}
Gate "G63-03b" "GET /scheduling/providers route defined" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'scheduling/providers'
}
Gate "G63-03c" "VistA adapter references SD W/L RETRIVE HOSP LOC" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'SD W/L RETRIVE HOSP LOC'
}
Gate "G63-03d" "VistA adapter references SD W/L RETRIVE PERSON" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'SD W/L RETRIVE PERSON'
}

# ---- G63-04: VistA adapter is real (not hollow) ----
Write-Host "`n--- G63-04: VistA Adapter Wired ---" -ForegroundColor Yellow

Gate "G63-04a" "vista-adapter.ts calls safeCallRpc" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'safeCallRpc'
}
Gate "G63-04b" "vista-adapter.ts calls SDOE LIST ENCOUNTERS FOR PAT" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'SDOE LIST ENCOUNTERS FOR PAT'
}
Gate "G63-04c" "vista-adapter.ts parses encounter data" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'parseEncounterList'
}
Gate "G63-04d" "vista-adapter.ts has vistaDateToIso converter" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'vistaDateToIso'
}
Gate "G63-04e" "VistA adapter exports VistaSchedulingAdapter class" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'export class VistaSchedulingAdapter'
}

# ---- G63-05: Portal wired to scheduling API ----
Write-Host "`n--- G63-05: Portal Appointments Wired ---" -ForegroundColor Yellow

Gate "G63-05a" "portal-core.ts imports adapter-loader for scheduling" {
  (Get-Content "apps/api/src/routes/portal-core.ts" -Raw) -match 'adapter-loader.*|.*getAdapter.*scheduling'
}
Gate "G63-05b" "portal-core.ts calls listAppointments" {
  (Get-Content "apps/api/src/routes/portal-core.ts" -Raw) -match 'listAppointments'
}
Gate "G63-05c" "Portal appointments page exists" {
  Test-Path -LiteralPath "apps/portal/src/app/dashboard/appointments/page.tsx"
}
Gate "G63-05d" "Portal page has cancel handler" {
  (Get-Content "apps/portal/src/app/dashboard/appointments/page.tsx" -Raw) -match 'handleCancel'
}
Gate "G63-05e" "Portal page has reschedule handler" {
  (Get-Content "apps/portal/src/app/dashboard/appointments/page.tsx" -Raw) -match 'handleReschedule'
}

# ---- G63-06: Clinician scheduling page ----
Write-Host "`n--- G63-06: Clinician Scheduling UI ---" -ForegroundColor Yellow

Gate "G63-06a" "Clinician scheduling page exists" {
  Test-Path -LiteralPath "apps/web/src/app/cprs/scheduling/page.tsx"
}
Gate "G63-06b" "Clinician page has tabs" {
  (Get-Content "apps/web/src/app/cprs/scheduling/page.tsx" -Raw) -match 'schedule.*patient.*requests'
}
Gate "G63-06c" "Clinician page fetches /scheduling/appointments" {
  (Get-Content "apps/web/src/app/cprs/scheduling/page.tsx" -Raw) -match '/scheduling/appointments'
}
Gate "G63-06d" "Clinician page fetches /scheduling/clinics" {
  (Get-Content "apps/web/src/app/cprs/scheduling/page.tsx" -Raw) -match '/scheduling/clinics'
}
Gate "G63-06e" "Clinician page fetches /scheduling/requests" {
  (Get-Content "apps/web/src/app/cprs/scheduling/page.tsx" -Raw) -match '/scheduling/requests'
}

# ---- G63-07: Audit trail ----
Write-Host "`n--- G63-07: Scheduling Audit ---" -ForegroundColor Yellow

Gate "G63-07a" "immutable-audit.ts has scheduling.request action" {
  (Get-Content "apps/api/src/lib/immutable-audit.ts" -Raw) -match 'scheduling\.request'
}
Gate "G63-07b" "immutable-audit.ts has scheduling.cancel action" {
  (Get-Content "apps/api/src/lib/immutable-audit.ts" -Raw) -match 'scheduling\.cancel'
}
Gate "G63-07c" "immutable-audit.ts has scheduling.reschedule action" {
  (Get-Content "apps/api/src/lib/immutable-audit.ts" -Raw) -match 'scheduling\.reschedule'
}
Gate "G63-07d" "Routes call immutableAudit for scheduling" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'immutableAudit'
}

# ---- G63-08: Double-booking prevention ----
Write-Host "`n--- G63-08: Double-Booking Prevention ---" -ForegroundColor Yellow

Gate "G63-08a" "vista-adapter.ts has bookingLocks" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'bookingLock'
}
Gate "G63-08b" "vista-adapter.ts has acquireBookingLock" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'acquireBookingLock'
}
Gate "G63-08c" "vista-adapter.ts has releaseBookingLock" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'releaseBookingLock'
}
Gate "G63-08d" "Lock has TTL expiry" {
  (Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw) -match 'LOCK_TTL'
}

# ---- G63-09: No mock/seed data ----
Write-Host "`n--- G63-09: No Mock Data ---" -ForegroundColor Yellow

Gate "G63-09a" "VistA adapter has no mock/seed arrays" {
  $content = Get-Content "apps/api/src/adapters/scheduling/vista-adapter.ts" -Raw
  -not ($content -match 'mockAppointments|seedData|demoAppointments|fakeData')
}
Gate "G63-09b" "Scheduling routes have no hardcoded demo data" {
  $content = Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw
  -not ($content -match 'mockAppointments|seedData|demoAppointments|fakeData')
}

# ---- G63-10: Dead-click audit ----
Write-Host "`n--- G63-10: Dead-Click Audit ---" -ForegroundColor Yellow

Gate "G63-10a" "Clinician schedule tab loads data" {
  (Get-Content "apps/web/src/app/cprs/scheduling/page.tsx" -Raw) -match 'loadSchedule'
}
Gate "G63-10b" "Clinician patient tab has search button" {
  (Get-Content "apps/web/src/app/cprs/scheduling/page.tsx" -Raw) -match 'loadPatientAppts'
}
Gate "G63-10c" "Portal request button calls handleRequest" {
  (Get-Content "apps/portal/src/app/dashboard/appointments/page.tsx" -Raw) -match 'handleRequest'
}
Gate "G63-10d" "Portal cancel button calls handleCancel" {
  (Get-Content "apps/portal/src/app/dashboard/appointments/page.tsx" -Raw) -match 'handleCancel'
}

# ---- G63-11: Cancel/reschedule endpoints ----
Write-Host "`n--- G63-11: Cancel/Reschedule Endpoints ---" -ForegroundColor Yellow

Gate "G63-11a" "POST /scheduling/appointments/:id/cancel defined" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'cancel'
}
Gate "G63-11b" "POST /scheduling/appointments/:id/reschedule defined" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'reschedule'
}
Gate "G63-11c" "Cancel response includes SDEC target" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'SDEC APPDEL'
}
Gate "G63-11d" "Reschedule response includes SDEC target" {
  (Get-Content "apps/api/src/routes/scheduling/index.ts" -Raw) -match 'SDEC'
}

# ---- G63-12: verify-latest.ps1 delegation ----
Write-Host "`n--- G63-12: verify-latest.ps1 ---" -ForegroundColor Yellow

Gate "G63-12a" "verify-latest.ps1 delegates to phase 63" {
  (Get-Content "scripts/verify-latest.ps1" -Raw) -match 'phase63|phase-63'
}

# ---- G63-13: Runbook ----
Write-Host "`n--- G63-13: Runbook ---" -ForegroundColor Yellow

Gate "G63-13a" "Runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/scheduling-vista-sd.md"
}
Gate "G63-13b" "Runbook mentions SDOE RPCs" {
  (Get-Content "docs/runbooks/scheduling-vista-sd.md" -Raw) -match 'SDOE'
}
Gate "G63-13c" "Runbook mentions SD W/L RPCs" {
  (Get-Content "docs/runbooks/scheduling-vista-sd.md" -Raw) -match 'SD W/L'
}

# ---- G63-14: Ops artifacts ----
Write-Host "`n--- G63-14: Ops Artifacts ---" -ForegroundColor Yellow

Gate "G63-14a" "ops/phase63-summary.md exists" {
  Test-Path -LiteralPath "ops/phase63-summary.md"
}
Gate "G63-14b" "ops/phase63-notion-update.json exists" {
  Test-Path -LiteralPath "ops/phase63-notion-update.json"
}

# ---- TypeScript compilation ----
Write-Host "`n--- TypeScript ---" -ForegroundColor Yellow

Gate "TSC" "API TypeScript compiles clean" {
  Push-Location "apps/api"
  $out = npx tsc --noEmit 2>&1 | Out-String
  Pop-Location
  $out.Trim().Length -eq 0
}

# ---- Security ----
Write-Host "`n--- Security ---" -ForegroundColor Yellow

Gate "SEC-01" "/scheduling/ requires session auth" {
  (Get-Content "apps/api/src/middleware/security.ts" -Raw) -match 'scheduling'
}
Gate "SEC-02" "Routes registered in index.ts" {
  (Get-Content "apps/api/src/index.ts" -Raw) -match 'schedulingRoutes'
}

# ---- Summary ----
Write-Host "`n=== Phase 63 Results: $pass/$total passed, $fail failed ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })

if ($fail -gt 0) { exit 1 }
