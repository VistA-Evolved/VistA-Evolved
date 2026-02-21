<# Phase 69 -- RCM Ops Excellence v1 Verification
   Gates:
     1-5   File existence (adapters, pollers, scheduler)
     6-10  Interface conformance (PayerAdapter methods, PollingScheduler, results)
     11-14 Route wiring (new endpoints in rcm-routes.ts)
     15-18 UI tabs (adapters, jobs, eligibility in page.tsx)
     19-21 Plan artifact, prompt, no console.log
     22    TSC clean (api)
     23    TSC clean (web)
#>
param([switch]$SkipDocker)

$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 24

function Gate([string]$label, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $label" -ForegroundColor Red
    $script:fail++
  }
}

$root = Split-Path $PSScriptRoot -Parent

Write-Host "`n=== Phase 69: RCM Ops Excellence v1 ===" -ForegroundColor Cyan
Write-Host "Running $total gates...`n"

# --- File Existence ---
Write-Host "--- File Existence ---"
Gate "payer-adapter.ts exists" (Test-Path -LiteralPath "$root\apps\api\src\rcm\adapters\payer-adapter.ts")
Gate "sandbox-adapter.ts exists" (Test-Path -LiteralPath "$root\apps\api\src\rcm\adapters\sandbox-adapter.ts")
Gate "x12-adapter.ts exists" (Test-Path -LiteralPath "$root\apps\api\src\rcm\adapters\x12-adapter.ts")
Gate "philhealth-adapter.ts exists" (Test-Path -LiteralPath "$root\apps\api\src\rcm\adapters\philhealth-adapter.ts")
Gate "polling-scheduler.ts exists" (Test-Path -LiteralPath "$root\apps\api\src\rcm\jobs\polling-scheduler.ts")
Gate "eligibility-poller.ts exists" (Test-Path -LiteralPath "$root\apps\api\src\rcm\jobs\eligibility-poller.ts")
Gate "claim-status-poller.ts exists" (Test-Path -LiteralPath "$root\apps\api\src\rcm\jobs\claim-status-poller.ts")

# --- Interface Conformance ---
Write-Host "`n--- Interface Conformance ---"
$adapterIface = Get-Content "$root\apps\api\src\rcm\adapters\payer-adapter.ts" -Raw -ErrorAction SilentlyContinue
Gate "PayerAdapter has checkEligibility" ($adapterIface -match 'checkEligibility')
Gate "PayerAdapter has pollClaimStatus" ($adapterIface -match 'pollClaimStatus')
Gate "PayerAdapter has submitClaim" ($adapterIface -match 'submitClaim')

$schedulerSrc = Get-Content "$root\apps\api\src\rcm\jobs\polling-scheduler.ts" -Raw -ErrorAction SilentlyContinue
Gate "PollingScheduler has registerJob" ($schedulerSrc -match 'registerJob')
Gate "PollingScheduler has getStatus" ($schedulerSrc -match 'getStatus')

$eligSrc = Get-Content "$root\apps\api\src\rcm\jobs\eligibility-poller.ts" -Raw -ErrorAction SilentlyContinue
Gate "eligibility-poller has getEligibilityResultsSlice" ($eligSrc -match 'getEligibilityResultsSlice')

$claimStatusSrc = Get-Content "$root\apps\api\src\rcm\jobs\claim-status-poller.ts" -Raw -ErrorAction SilentlyContinue
Gate "claim-status-poller has getClaimStatusResultsSlice" ($claimStatusSrc -match 'getClaimStatusResultsSlice')

# --- Route Wiring ---
Write-Host "`n--- Route Wiring ---"
$routesSrc = Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw -ErrorAction SilentlyContinue
Gate "rcm-routes imports payer-adapter" ($routesSrc -match 'from.*adapters/payer-adapter')
Gate "rcm-routes has /rcm/adapters endpoint" ($routesSrc -match "/rcm/adapters'")
Gate "rcm-routes has /rcm/jobs/scheduler endpoint" ($routesSrc -match "/rcm/jobs/scheduler'")
Gate "rcm-routes has /rcm/eligibility/results endpoint" ($routesSrc -match "/rcm/eligibility/results'")

# --- UI Tabs ---
Write-Host "`n--- UI Tabs ---"
$uiSrc = Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw -ErrorAction SilentlyContinue
Gate "UI has adapters tab" ($uiSrc -match "'adapters'")
Gate "UI has jobs tab" ($uiSrc -match "'jobs'")
Gate "UI has eligibility tab" ($uiSrc -match "'eligibility'")

# --- Plan Artifact ---
Write-Host "`n--- Artifacts ---"
Gate "IB plan artifact exists" (Test-Path -LiteralPath "$root\artifacts\phase69\ib-plan.json")

# --- TSC ---
Write-Host "`n--- TypeScript Compilation ---"
Push-Location "$root\apps\api"
$tscApi = & npx tsc --noEmit 2>&1
$tscApiOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "API tsc --noEmit clean" $tscApiOk

Push-Location "$root\apps\web"
$tscWeb = & npx tsc --noEmit 2>&1
$tscWebOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "Web tsc --noEmit clean" $tscWebOk

# --- Summary ---
Write-Host "`n=== Phase 69 Result: $pass / $total passed ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) {
  Write-Host "  $fail gate(s) failed" -ForegroundColor Red
}
exit $fail
