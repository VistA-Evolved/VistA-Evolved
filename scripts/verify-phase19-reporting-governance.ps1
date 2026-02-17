<#
.SYNOPSIS
  Phase 19 verifier — Reporting + Export Governance + Ops Analytics + Optional RCM
.DESCRIPTION
  Checks all Phase 19 deliverables: report config, export governance, reporting API,
  admin reports UI, RCM placeholder, audit action types, feature flags, plus
  regression checks for Phases 1–18.
#>

param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
$repoRoot = Split-Path $PSScriptRoot -Parent

function Assert-Check {
  param([string]$Label, [bool]$Condition)
  if ($Condition) { Write-Host "  PASS  $Label" -ForegroundColor Green; $script:pass++ }
  else           { Write-Host "  FAIL  $Label" -ForegroundColor Red;   $script:fail++ }
}

function Assert-Warn {
  param([string]$Label, [bool]$Condition)
  if ($Condition) { Write-Host "  PASS  $Label" -ForegroundColor Green; $script:pass++ }
  else           { Write-Host "  WARN  $Label" -ForegroundColor Yellow; $script:warn++ }
}

Write-Host "`n=== Phase 19: Reporting + Export Governance + Ops Analytics Verifier ===" -ForegroundColor Cyan
Write-Host ""

# ─── Section A: Report Config ────────────────────────────────────────

Write-Host "--- A: Report Config ---" -ForegroundColor White

Assert-Check "report-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\report-config.ts")

$reportCfg = if (Test-Path "$repoRoot\apps\api\src\config\report-config.ts") {
  Get-Content "$repoRoot\apps\api\src\config\report-config.ts" -Raw
} else { "" }

Assert-Check "REPORT_CONFIG exported" ($reportCfg -match "export const REPORT_CONFIG")
Assert-Check "defaultPageSize configured" ($reportCfg -match "defaultPageSize")
Assert-Check "maxPageSize configured" ($reportCfg -match "maxPageSize")
Assert-Check "operationsCacheTtlMs configured" ($reportCfg -match "operationsCacheTtlMs")
Assert-Check "integrationsCacheTtlMs configured" ($reportCfg -match "integrationsCacheTtlMs")
Assert-Check "clinicalCacheTtlMs configured" ($reportCfg -match "clinicalCacheTtlMs")
Assert-Check "maxAuditRangeDays configured" ($reportCfg -match "maxAuditRangeDays")
Assert-Check "EXPORT_CONFIG exported" ($reportCfg -match "export const EXPORT_CONFIG")
Assert-Check "maxExportRows configured" ($reportCfg -match "maxExportRows")
Assert-Check "allowedFormats configured" ($reportCfg -match "allowedFormats")
Assert-Check "requireAdmin configured" ($reportCfg -match "requireAdmin")
Assert-Check "jobRetentionHours configured" ($reportCfg -match "jobRetentionHours")
Assert-Check "allowPhiExport configured" ($reportCfg -match "allowPhiExport")
Assert-Check "maxConcurrentJobsPerUser configured" ($reportCfg -match "maxConcurrentJobsPerUser")
Assert-Check "ExportFormat type exported" ($reportCfg -match "export type ExportFormat")

Write-Host ""

# ─── Section B: Export Governance ────────────────────────────────────

Write-Host "--- B: Export Governance ---" -ForegroundColor White

Assert-Check "export-governance.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\export-governance.ts")

$exportGov = if (Test-Path "$repoRoot\apps\api\src\lib\export-governance.ts") {
  Get-Content "$repoRoot\apps\api\src\lib\export-governance.ts" -Raw
} else { "" }

Assert-Check "ExportJobStatus type defined" ($exportGov -match "export type ExportJobStatus")
Assert-Check "ExportReportType type defined" ($exportGov -match "export type ExportReportType")
Assert-Check "ExportJob interface defined" ($exportGov -match "export interface ExportJob")
Assert-Check "ExportPolicyResult interface defined" ($exportGov -match "export interface ExportPolicyResult")
Assert-Check "checkExportPolicy function exported" ($exportGov -match "export function checkExportPolicy")
Assert-Check "createExportJob function exported" ($exportGov -match "export function createExportJob")
Assert-Check "executeExportJob function exported" ($exportGov -match "export function executeExportJob")
Assert-Check "getExportJob function exported" ($exportGov -match "export function getExportJob")
Assert-Check "listExportJobs function exported" ($exportGov -match "export function listExportJobs")
Assert-Check "generateCsv function exported" ($exportGov -match "export function generateCsv")
Assert-Check "generateJson function exported" ($exportGov -match "export function generateJson")
Assert-Check "Policy: admin role check" ($exportGov -match "admin")
Assert-Check "Policy: row limit check" ($exportGov -match "maxExportRows")
Assert-Check "Policy: PHI export check" ($exportGov -match "allowPhiExport")
Assert-Check "Policy: concurrent job check" ($exportGov -match "maxConcurrentJobsPerUser")
Assert-Check "Audit on export.request" ($exportGov -match "export\.request")
Assert-Check "Audit on export.download" ($exportGov -match "export\.download")
Assert-Check "Job expiry/purge logic" ($exportGov -match "purgeExpired")

Write-Host ""

# ─── Section C: Reporting API Routes ─────────────────────────────────

Write-Host "--- C: Reporting API Routes ---" -ForegroundColor White

Assert-Check "reporting.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\reporting.ts")

$reporting = if (Test-Path "$repoRoot\apps\api\src\routes\reporting.ts") {
  Get-Content "$repoRoot\apps\api\src\routes\reporting.ts" -Raw
} else { "" }

Assert-Check "reportingRoutes function exported" ($reporting -match "export default async function reportingRoutes")
Assert-Check "GET /reports/operations route" ($reporting -match '"/reports/operations"')
Assert-Check "GET /reports/integrations route" ($reporting -match '"/reports/integrations"')
Assert-Check "GET /reports/audit route" ($reporting -match '"/reports/audit"')
Assert-Check "GET /reports/clinical-activity route" ($reporting -match '"/reports/clinical-activity"')
Assert-Check "POST /reports/export route" ($reporting -match '"/reports/export"')
Assert-Check "GET /reports/export/jobs route" ($reporting -match '"/reports/export/jobs"')
Assert-Check "GET /reports/export/:jobId route" ($reporting -match '"/reports/export/:jobId"')
Assert-Check "requireSession on all routes" ($reporting -match "requireSession")
Assert-Check "requireRole admin on all routes" ($reporting -match 'requireRole\(session.*admin')
Assert-Check "Uses getRpcHealthSummary" ($reporting -match "getRpcHealthSummary")
Assert-Check "Uses getIntegrationHealthSummary" ($reporting -match "getIntegrationHealthSummary")
Assert-Check "Uses getAuditStats" ($reporting -match "getAuditStats")
Assert-Check "Uses queryAuditEvents" ($reporting -match "queryAuditEvents")
Assert-Check "Report caching with TTL" ($reporting -match "setCache|getCached")
Assert-Check "Page size clamping" ($reporting -match "clampPageSize")
Assert-Check "Clinical report: counts only, no PHI" ($reporting -match "no PHI text")
Assert-Check "Export policy check before job" ($reporting -match "checkExportPolicy")

Write-Host ""

# ─── Section D: Index.ts Wiring ──────────────────────────────────────

Write-Host "--- D: Index.ts Wiring ---" -ForegroundColor White

$indexTs = if (Test-Path "$repoRoot\apps\api\src\index.ts") {
  Get-Content "$repoRoot\apps\api\src\index.ts" -Raw
} else { "" }

Assert-Check "reportingRoutes imported in index.ts" ($indexTs -match "import reportingRoutes")
Assert-Check "reportingRoutes registered" ($indexTs -match "server\.register\(reportingRoutes\)")

Write-Host ""

# ─── Section E: Security AUTH_RULES ──────────────────────────────────

Write-Host "--- E: Security AUTH_RULES ---" -ForegroundColor White

$security = if (Test-Path "$repoRoot\apps\api\src\middleware\security.ts") {
  Get-Content "$repoRoot\apps\api\src\middleware\security.ts" -Raw
} else { "" }

Assert-Check "/reports/ in AUTH_RULES (admin)" ($security -match "admin\|audit\|reports|reports\|admin\|audit|reports.*admin")

Write-Host ""

# ─── Section F: Audit Action Types ───────────────────────────────────

Write-Host "--- F: Audit Action Types ---" -ForegroundColor White

$auditTs = if (Test-Path "$repoRoot\apps\api\src\lib\audit.ts") {
  Get-Content "$repoRoot\apps\api\src\lib\audit.ts" -Raw
} else { "" }

Assert-Check "report.generate audit action" ($auditTs -match '"report\.generate"')
Assert-Check "export.request audit action" ($auditTs -match '"export\.request"')
Assert-Check "export.download audit action" ($auditTs -match '"export\.download"')
Assert-Check "export.policy-check audit action" ($auditTs -match '"export\.policy-check"')

Write-Host ""

# ─── Section G: Feature Flags (RCM) ─────────────────────────────────

Write-Host "--- G: Feature Flags (RCM) ---" -ForegroundColor White

$tenantCfg = if (Test-Path "$repoRoot\apps\api\src\config\tenant-config.ts") {
  Get-Content "$repoRoot\apps\api\src\config\tenant-config.ts" -Raw
} else { "" }

Assert-Check "rcm.enabled in FeatureFlagId" ($tenantCfg -match '"rcm\.enabled"')
Assert-Check "rcm.enabled defaults to false" ($tenantCfg -match '"rcm\.enabled":\s*false')

Write-Host ""

# ─── Section H: Admin Reports UI ────────────────────────────────────

Write-Host "--- H: Admin Reports UI ---" -ForegroundColor White

Assert-Check "reports page.tsx exists" (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\reports\page.tsx")

$reportsPage = if (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\reports\page.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\admin\reports\page.tsx" -Raw
} else { "" }

Assert-Check "ReportsPage component exported" ($reportsPage -match "export default function ReportsPage")
Assert-Check "Operations tab" ($reportsPage -match "operations")
Assert-Check "Integrations tab" ($reportsPage -match "integrations")
Assert-Check "Audit tab" ($reportsPage -match "audit")
Assert-Check "Clinical tab" ($reportsPage -match "clinical")
Assert-Check "Exports tab" ($reportsPage -match "exports")
Assert-Check "Export CSV button" ($reportsPage -match "CSV")
Assert-Check "Export JSON button" ($reportsPage -match "JSON")
Assert-Check "Uses useSession" ($reportsPage -match "useSession")
Assert-Check "Checks admin role" ($reportsPage -match "hasRole.*admin")
Assert-Check "Fetches /reports/" ($reportsPage -match "/reports/")
Assert-Check "StatCard component" ($reportsPage -match "StatCard")
Assert-Check "ExportBar component" ($reportsPage -match "ExportBar")

Write-Host ""

# ─── Section I: RCM Placeholder UI ──────────────────────────────────

Write-Host "--- I: RCM Placeholder UI ---" -ForegroundColor White

Assert-Check "rcm page.tsx exists" (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\rcm\page.tsx")

$rcmPage = if (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\rcm\page.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw
} else { "" }

Assert-Check "RcmPage component exported" ($rcmPage -match "export default function RcmPage")
Assert-Check "Checks rcm.enabled feature flag" ($rcmPage -match "rcm\.enabled")
Assert-Check "Shows disabled message" ($rcmPage -match "RCM Module Disabled|disabled")
Assert-Check "Shows placeholder panels when enabled" ($rcmPage -match "PlaceholderCard")
Assert-Check "Encounter Coding placeholder" ($rcmPage -match "Encounter Coding")
Assert-Check "Charge Capture placeholder" ($rcmPage -match "Charge Capture")
Assert-Check "Claims Submission placeholder" ($rcmPage -match "Claims Submission")
Assert-Check "Billing Analytics placeholder" ($rcmPage -match "Billing Analytics")
Assert-Check "Denial Management placeholder" ($rcmPage -match "Denial Management")
Assert-Check "Uses useSession" ($rcmPage -match "useSession")
Assert-Check "Checks admin role" ($rcmPage -match "hasRole.*admin")

Write-Host ""

# ─── Section J: Documentation ────────────────────────────────────────

Write-Host "--- J: Documentation ---" -ForegroundColor White

Assert-Check "Runbook exists" (Test-Path "$repoRoot\docs\runbooks\vista-reporting-export-governance.md")
Assert-Check "Prompt 21-01 exists" (Test-Path "$repoRoot\prompts\21-PHASE-19-REPORTING-GOVERNANCE\21-01-Phase19-Reporting-Governance-IMPLEMENT.md")
Assert-Check "Prompt 21-99 exists" (Test-Path "$repoRoot\prompts\21-PHASE-19-REPORTING-GOVERNANCE\21-99-Phase19-Reporting-Governance-VERIFY.md")

$runbook = if (Test-Path "$repoRoot\docs\runbooks\vista-reporting-export-governance.md") {
  Get-Content "$repoRoot\docs\runbooks\vista-reporting-export-governance.md" -Raw
} else { "" }

Assert-Check "Runbook documents /reports/operations" ($runbook -match "/reports/operations")
Assert-Check "Runbook documents /reports/integrations" ($runbook -match "/reports/integrations")
Assert-Check "Runbook documents /reports/audit" ($runbook -match "/reports/audit")
Assert-Check "Runbook documents /reports/clinical-activity" ($runbook -match "/reports/clinical")
Assert-Check "Runbook documents export flow" ($runbook -match "POST /reports/export|export.request")
Assert-Check "Runbook documents env vars" ($runbook -match "REPORT_PAGE_SIZE|EXPORT_MAX_ROWS")

Write-Host ""

# ─── Section K: Phase 1–18 Regression Checks ────────────────────────

Write-Host "--- K: Phase 1-18 Regression ---" -ForegroundColor White

# Core files still exist
Assert-Check "index.ts exists" (Test-Path "$repoRoot\apps\api\src\index.ts")
Assert-Check "rpcBrokerClient.ts exists" (Test-Path "$repoRoot\apps\api\src\vista\rpcBrokerClient.ts")
Assert-Check "rpcBroker.ts exists" (Test-Path "$repoRoot\apps\api\src\vista\rpcBroker.ts")
Assert-Check "config.ts exists" (Test-Path "$repoRoot\apps\api\src\vista\config.ts")
Assert-Check "security.ts exists" (Test-Path "$repoRoot\apps\api\src\middleware\security.ts")
Assert-Check "audit.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\audit.ts")
Assert-Check "rpc-resilience.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\rpc-resilience.ts")
Assert-Check "server-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\server-config.ts")
Assert-Check "integration-registry.ts exists" (Test-Path "$repoRoot\apps\api\src\config\integration-registry.ts")
Assert-Check "tenant-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\tenant-config.ts")
Assert-Check "admin.ts routes exist" (Test-Path "$repoRoot\apps\api\src\routes\admin.ts")
Assert-Check "interop.ts routes exist" (Test-Path "$repoRoot\apps\api\src\routes\interop.ts")
Assert-Check "auth-routes.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\auth-routes.ts")
Assert-Check "session-store.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\session-store.ts")

# Key endpoints still wired
Assert-Check "API still has /health" ($indexTs -match '/health')
Assert-Check "API still has /ready" ($indexTs -match '/ready')
Assert-Check "API still has /vista/ping" ($indexTs -match '/vista/ping')
Assert-Check "API still has /metrics" ($indexTs -match '/metrics')
Assert-Check "API still has /audit/events" ($indexTs -match '/audit/events')
Assert-Check "API still has /audit/stats" ($indexTs -match '/audit/stats')
Assert-Check "API still registers authRoutes" ($indexTs -match 'server\.register\(authRoutes\)')
Assert-Check "API still registers adminRoutes" ($indexTs -match 'server\.register\(adminRoutes\)')
Assert-Check "API still registers interopRoutes" ($indexTs -match 'server\.register\(interopRoutes\)')
Assert-Check "API still registers imagingRoutes" ($indexTs -match 'server\.register\(imagingRoutes\)')
Assert-Check "API still has circuit-breaker" ($indexTs -match 'circuit-breaker')

# Web UI regressions
Assert-Check "Integrations admin page exists" (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx")
Assert-Check "CPRS layout exists" (Test-Path "$repoRoot\apps\web\src\app\cprs\layout.tsx")
Assert-Check "session-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\session-context.tsx")
Assert-Check "tenant-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\tenant-context.tsx")

# Phase 17: tenant model intact
Assert-Check "TenantConfig still defined" ($tenantCfg -match "export interface TenantConfig")
Assert-Check "ConnectorConfig still defined" ($tenantCfg -match "export interface ConnectorConfig")
Assert-Check "FeatureFlagId still defined" ($tenantCfg -match "export type FeatureFlagId")

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($fail -gt 0) { exit 1 }
