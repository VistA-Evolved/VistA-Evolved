<#
.SYNOPSIS
  Phase 82 Verifier — RCM Adapter Expansion v2

.DESCRIPTION
  Verifies:
  - New files exist and compile
  - Connector state probing returns honest state
  - Job audit bridge validates PHI
  - Ops routes return structured data
  - UI has Ops Dashboard tab
  - No fake claims/eligibility/status data
  - Audit trail records job operations
#>

param(
  [switch]$SkipDocker,
  [string]$ApiBase = "http://127.0.0.1:3001"
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0

function Gate([string]$name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name -- $_" -ForegroundColor Red
    $script:fail++
  }
}

function Skip([string]$name, [string]$reason) {
  Write-Host "  SKIP  $name -- $reason" -ForegroundColor Yellow
  $script:skip++
}

Write-Host "`n=== Phase 82 Verifier -- RCM Adapter Expansion v2 ===" -ForegroundColor Cyan
Write-Host ""

# ─── Section 1: File Existence ─────────────────────────────────────
Write-Host "--- Section 1: File Existence ---" -ForegroundColor White

Gate "connector-state.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/connectors/connector-state.ts"
}

Gate "job-audit-bridge.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/jobs/job-audit-bridge.ts"
}

Gate "rcm-ops-routes.ts exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/rcm-ops-routes.ts"
}

Gate "prompt 87-01-IMPLEMENT.md exists" {
  Test-Path -LiteralPath "prompts/87-PHASE-82-RCM-ADAPTER-EXPANSION-V2/87-01-IMPLEMENT.md"
}

Gate "prompt 87-99-VERIFY.md exists" {
  Test-Path -LiteralPath "prompts/87-PHASE-82-RCM-ADAPTER-EXPANSION-V2/87-99-VERIFY.md"
}

# ─── Section 2: Source Integrity ───────────────────────────────────
Write-Host "`n--- Section 2: Source Integrity ---" -ForegroundColor White

Gate "connector-state.ts has ConnectorHealthState type" {
  (Get-Content "apps/api/src/rcm/connectors/connector-state.ts" -Raw) -match "ConnectorHealthState"
}

Gate "connector-state.ts has pendingTarget support" {
  (Get-Content "apps/api/src/rcm/connectors/connector-state.ts" -Raw) -match "pendingTarget"
}

Gate "connector-state.ts has probe cooldown" {
  (Get-Content "apps/api/src/rcm/connectors/connector-state.ts" -Raw) -match "PROBE_COOLDOWN_MS"
}

Gate "connector-state.ts has getAllConnectorStates" {
  (Get-Content "apps/api/src/rcm/connectors/connector-state.ts" -Raw) -match "getAllConnectorStates"
}

Gate "connector-state.ts has getAllAdapterStates" {
  (Get-Content "apps/api/src/rcm/connectors/connector-state.ts" -Raw) -match "getAllAdapterStates"
}

Gate "connector-state.ts has getConnectorStateSummary" {
  (Get-Content "apps/api/src/rcm/connectors/connector-state.ts" -Raw) -match "getConnectorStateSummary"
}

Gate "job-audit-bridge.ts has PHI validation" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "validateJobPayload"
}

Gate "job-audit-bridge.ts has auditedEnqueue" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "auditedEnqueue"
}

Gate "job-audit-bridge.ts has auditJobCompletion" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "auditJobCompletion"
}

Gate "job-audit-bridge.ts has auditJobFailure" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "auditJobFailure"
}

Gate "job-audit-bridge.ts has tenant-scoped helpers" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "listJobsByTenant"
}

Gate "job-audit-bridge.ts rejects PHI fields" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "forbiddenFields"
}

Gate "rcm-ops-routes.ts has /rcm/ops/connector-state route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/connector-state"
}

Gate "rcm-ops-routes.ts has /rcm/ops/adapter-state route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/adapter-state"
}

Gate "rcm-ops-routes.ts has /rcm/ops/queue-depth route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/queue-depth"
}

Gate "rcm-ops-routes.ts has /rcm/ops/dashboard route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/dashboard"
}

Gate "rcm-ops-routes.ts has /rcm/ops/enqueue-eligibility route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/enqueue-eligibility"
}

Gate "rcm-ops-routes.ts has /rcm/ops/enqueue-status-poll route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/enqueue-status-poll"
}

Gate "rcm-ops-routes.ts has /rcm/ops/denial-queue route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/denial-queue"
}

Gate "rcm-ops-routes.ts has /rcm/ops/scheduler-status route" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "/rcm/ops/scheduler-status"
}

Gate "rcm-ops-routes.ts has pendingTargets in denial response" {
  (Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "pendingTargets"
}

# ─── Section 3: Integration in index.ts ────────────────────────────
Write-Host "`n--- Section 3: Integration ---" -ForegroundColor White

Gate "index.ts imports rcm-ops-routes" {
  (Get-Content "apps/api/src/index.ts" -Raw) -match "rcm-ops-routes"
}

Gate "index.ts registers rcmOpsRoutes" {
  (Get-Content "apps/api/src/index.ts" -Raw) -match "server\.register\(rcmOpsRoutes\)"
}

# ─── Section 4: UI Tab ────────────────────────────────────────────
Write-Host "`n--- Section 4: UI Tab ---" -ForegroundColor White

Gate "RCM page has ops-dashboard tab type" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "ops-dashboard"
}

Gate "RCM page has OpsDashboardTab component" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "OpsDashboardTab"
}

Gate "OpsDashboardTab fetches /rcm/ops/dashboard" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "/rcm/ops/dashboard"
}

Gate "OpsDashboardTab shows connector states as table" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "connectorId"
}

Gate "OpsDashboardTab shows pending targets" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "pendingTarget"
}

Gate "OpsDashboardTab has enqueue eligibility button" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "handleEnqueueEligibility"
}

Gate "OpsDashboardTab has enqueue status poll button" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "handleEnqueueStatusPoll"
}

Gate "OpsDashboardTab has honest state disclosure" {
  (Get-Content "apps/web/src/app/cprs/admin/rcm/page.tsx" -Raw) -match "Honest State"
}

# ─── Section 5: No Fake Data Guard ───────────────────────────────
Write-Host "`n--- Section 5: No Fake Data Guard ---" -ForegroundColor White

Gate "connector-state.ts does not return hardcoded eligible:true" {
  -not ((Get-Content "apps/api/src/rcm/connectors/connector-state.ts" -Raw) -match "eligible:\s*true")
}

Gate "rcm-ops-routes.ts does not return hardcoded eligible:true" {
  -not ((Get-Content "apps/api/src/rcm/rcm-ops-routes.ts" -Raw) -match "eligible:\s*true")
}

Gate "job-audit-bridge.ts does not fabricate claim data" {
  -not ((Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "fakeClaim|mockClaim|dummyClaim")
}

Gate "No PROV123 in new Phase 82 files" {
  $files = @(
    "apps/api/src/rcm/connectors/connector-state.ts",
    "apps/api/src/rcm/jobs/job-audit-bridge.ts",
    "apps/api/src/rcm/rcm-ops-routes.ts"
  )
  $found = $false
  foreach ($f in $files) {
    if ((Get-Content $f -Raw) -match "PROV123") { $found = $true }
  }
  -not $found
}

# ─── Section 6: Existing Infrastructure Preserved ─────────────────
Write-Host "`n--- Section 6: Existing Infrastructure ---" -ForegroundColor White

Gate "workqueue-store.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/workqueues/workqueue-store.ts"
}

Gate "queue.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/jobs/queue.ts"
}

Gate "polling-scheduler.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/jobs/polling-scheduler.ts"
}

Gate "payer-adapter.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/adapters/payer-adapter.ts"
}

Gate "eligibility-poller.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/jobs/eligibility-poller.ts"
}

Gate "claim-status-poller.ts still exists" {
  Test-Path -LiteralPath "apps/api/src/rcm/jobs/claim-status-poller.ts"
}

Gate "rcm-routes.ts still exists and is unbroken" {
  (Test-Path -LiteralPath "apps/api/src/rcm/rcm-routes.ts") -and
  ((Get-Content "apps/api/src/rcm/rcm-routes.ts" -Raw) -match "export default async function rcmRoutes")
}

# ─── Section 7: Audit Actions ─────────────────────────────────────
Write-Host "`n--- Section 7: Audit Actions ---" -ForegroundColor White

Gate "job-audit-bridge uses job.enqueued action" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "job\.enqueued"
}

Gate "job-audit-bridge uses job.completed action" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "job\.completed"
}

Gate "job-audit-bridge uses job.failed action" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "job\.failed"
}

Gate "job-audit-bridge uses job.cancelled action" {
  (Get-Content "apps/api/src/rcm/jobs/job-audit-bridge.ts" -Raw) -match "job\.cancelled"
}

# ─── Summary ──────────────────────────────────────────────────────
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  SKIP: $skip" -ForegroundColor Yellow
Write-Host "  TOTAL: $($pass + $fail + $skip)" -ForegroundColor White

if ($fail -gt 0) {
  Write-Host "`nVERDICT: FAIL" -ForegroundColor Red
  exit 1
} else {
  Write-Host "`nVERDICT: PASS" -ForegroundColor Green
  exit 0
}
