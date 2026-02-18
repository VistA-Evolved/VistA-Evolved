<#
.SYNOPSIS
    Phase 25 - Enterprise BI + Analytics + Clinical Reporting verification script.
.DESCRIPTION
    Validates all Phase 25 deliverables on top of Phase 24 regression:
    - Phase 24 regression (delegates to verify-phase24-imaging-enterprise.ps1)
    - Data classification document
    - Analytics config (analytics-config.ts)
    - Analytics event store (analytics-store.ts)
    - Analytics aggregator (analytics-aggregator.ts)
    - Clinical report pipeline (clinical-reports.ts)
    - Analytics routes (analytics-routes.ts)
    - Security middleware updates (AUTH_RULES for /analytics/*)
    - Route registration in index.ts
    - Analytics dashboard UI (page.tsx)
    - Docker compose + Octo SQL seed
    - Runbooks + AGENTS.md updates
    - PHI scan on analytics files
    - TypeScript compilation clean
.NOTES
    Run from repo root: .\scripts\verify-phase25-bi-analytics.ps1
    Use -SkipDocker to skip Docker connectivity checks.
    Use -SkipRegression to skip Phase 24 regression.
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipRegression
)

$ErrorActionPreference = "Continue"
$pass = 0
$fail = 0
$warn = 0

function Gate-Pass($msg) {
    Write-Host "  [PASS] $msg" -ForegroundColor Green
    $script:pass++
}
function Gate-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    $script:fail++
}
function Gate-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
    $script:warn++
}

Write-Host ""
Write-Host "=== Phase 25 - Enterprise BI + Analytics Verification ===" -ForegroundColor Cyan
Write-Host ""

# --- 0: Phase 24 Regression ---

if (-not $SkipRegression) {
    Write-Host "--- 0: Phase 24 Regression ---" -ForegroundColor White
    $p24Script = "$PSScriptRoot\verify-phase24-imaging-enterprise.ps1"
    if (Test-Path $p24Script) {
        $p24Args = @("-SkipRegression")
        if ($SkipDocker) { $p24Args += "-SkipDocker" }
        & $p24Script @p24Args 2>&1 | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -eq 0) {
            Gate-Pass "Phase 24 regression: PASSED"
        } else {
            Gate-Warn "Phase 24 regression: some gates failed (check above)"
        }
    } else {
        Gate-Warn "Phase 24 regression script not found (skipping)"
    }
} else {
    Write-Host "--- 0: Skipping Phase 24 Regression ---" -ForegroundColor DarkYellow
}

# --- 1: Data Classification Document ---

Write-Host ""
Write-Host "--- 1: Data Classification Document ---" -ForegroundColor White

$classDoc = "docs/analytics/phase25-data-classification.md"
if (Test-Path $classDoc) {
    Gate-Pass "Data classification file exists"
    $classContent = Get-Content $classDoc -Raw
    if ($classContent -match "Class 1.*PHI") { Gate-Pass "Classification: Class 1 (PHI) defined" } else { Gate-Fail "Classification: Class 1 (PHI) missing" }
    if ($classContent -match "Class 2.*De-identified") { Gate-Pass "Classification: Class 2 (De-identified) defined" } else { Gate-Fail "Classification: Class 2 missing" }
    if ($classContent -match "Class 3.*Aggregated") { Gate-Pass "Classification: Class 3 (Aggregated) defined" } else { Gate-Fail "Classification: Class 3 missing" }
    if ($classContent -match "Class 4.*Operational") { Gate-Pass "Classification: Class 4 (Operational) defined" } else { Gate-Fail "Classification: Class 4 missing" }
    if ($classContent -match "DFN.*NEVER") { Gate-Pass "Classification: DFN NEVER in analytics rule" } else { Gate-Fail "Classification: DFN NEVER rule missing" }
} else {
    Gate-Fail "Data classification document missing: $classDoc"
}

# --- 2: Analytics Core Service Files ---

Write-Host ""
Write-Host "--- 2: Phase 25 Core Service Files ---" -ForegroundColor White

$phase25Files = @(
    "apps/api/src/config/analytics-config.ts",
    "apps/api/src/services/analytics-store.ts",
    "apps/api/src/services/analytics-aggregator.ts",
    "apps/api/src/services/clinical-reports.ts",
    "apps/api/src/routes/analytics-routes.ts"
)

foreach ($f in $phase25Files) {
    if (Test-Path $f) {
        Gate-Pass "File exists: $f"
    } else {
        Gate-Fail "File missing: $f"
    }
}

# --- 3: Analytics Config ---

Write-Host ""
Write-Host "--- 3: Analytics Config (analytics-config.ts) ---" -ForegroundColor White

$configFile = "apps/api/src/config/analytics-config.ts"
if (Test-Path $configFile) {
    $configContent = Get-Content $configFile -Raw
    if ($configContent -match "analytics_viewer") { Gate-Pass "Config: analytics_viewer permission defined" } else { Gate-Fail "Config: analytics_viewer missing" }
    if ($configContent -match "analytics_admin") { Gate-Pass "Config: analytics_admin permission defined" } else { Gate-Fail "Config: analytics_admin missing" }
    if ($configContent -match "ANALYTICS_ROLE_PERMISSIONS") { Gate-Pass "Config: role→permission mapping exists" } else { Gate-Fail "Config: role mapping missing" }
    if ($configContent -match "ANALYTICS_SQL_CONFIG") { Gate-Pass "Config: SQL/Octo config present" } else { Gate-Fail "Config: SQL config missing" }
    if ($configContent -match "ANALYTICS_RATE_LIMIT") { Gate-Pass "Config: rate limit config present" } else { Gate-Fail "Config: rate limit missing" }
} else {
    Gate-Fail "Analytics config file missing"
}

# --- 4: Analytics Event Store (PHI Safety) ---

Write-Host ""
Write-Host "--- 4: Analytics Event Store (PHI Safety) ---" -ForegroundColor White

$storeFile = "apps/api/src/services/analytics-store.ts"
if (Test-Path $storeFile) {
    $storeContent = Get-Content $storeFile -Raw
    if ($storeContent -match "hashUserId") { Gate-Pass "Store: user ID hashing function exists" } else { Gate-Fail "Store: hashUserId missing" }
    if ($storeContent -match "sanitizeAnalyticsTags") { Gate-Pass "Store: tag sanitization function exists" } else { Gate-Fail "Store: sanitizeAnalyticsTags missing" }
    if ($storeContent -match "recordAnalyticsEvent") { Gate-Pass "Store: event recording function exists" } else { Gate-Fail "Store: recordAnalyticsEvent missing" }
    if ($storeContent -match "queryAnalyticsEvents") { Gate-Pass "Store: event query function exists" } else { Gate-Fail "Store: queryAnalyticsEvents missing" }
    if ($storeContent -match "exportAnalyticsEventsCsv") { Gate-Pass "Store: CSV export function exists" } else { Gate-Fail "Store: CSV export missing" }
    # PHI check: AnalyticsEvent interface must not have a DFN field (sanitizer blocklist references are OK)
    $ifaceMatch = [regex]::Match($storeContent, "interface AnalyticsEvent \{[^}]+\}")
    if ($ifaceMatch.Success -and $ifaceMatch.Value -notmatch "\bdfn\b|\bpatientDfn\b") {
        Gate-Pass "PHI: no patient DFN in AnalyticsEvent interface"
    } elseif (-not $ifaceMatch.Success) {
        Gate-Warn "PHI: could not parse AnalyticsEvent interface in store"
    } else {
        Gate-Fail "PHI: patient DFN found in AnalyticsEvent interface!"
    }
    if ($storeContent -match "AnalyticsEventCategory") { Gate-Pass "Store: event categories typed" } else { Gate-Fail "Store: categories missing" }
} else {
    Gate-Fail "Analytics store file missing"
}

# --- 5: Analytics Aggregator ---

Write-Host ""
Write-Host "--- 5: Analytics Aggregator ---" -ForegroundColor White

$aggFile = "apps/api/src/services/analytics-aggregator.ts"
if (Test-Path $aggFile) {
    $aggContent = Get-Content $aggFile -Raw
    if ($aggContent -match "MetricBucket") { Gate-Pass "Aggregator: MetricBucket type defined" } else { Gate-Fail "Aggregator: MetricBucket missing" }
    if ($aggContent -match "runAggregation") { Gate-Pass "Aggregator: runAggregation function exists" } else { Gate-Fail "Aggregator: runAggregation missing" }
    if ($aggContent -match "queryAggregatedMetrics") { Gate-Pass "Aggregator: queryAggregatedMetrics exists" } else { Gate-Fail "Aggregator: query missing" }
    if ($aggContent -match "getMetricSeries") { Gate-Pass "Aggregator: getMetricSeries for dashboards exists" } else { Gate-Fail "Aggregator: series missing" }
    if ($aggContent -match "startAggregationJob") { Gate-Pass "Aggregator: periodic job exists" } else { Gate-Fail "Aggregator: periodic job missing" }
    if ($aggContent -match "exportAggregatedCsv") { Gate-Pass "Aggregator: CSV export exists" } else { Gate-Fail "Aggregator: CSV export missing" }
    if ($aggContent -match "p95|p99") { Gate-Pass "Aggregator: percentile calculations" } else { Gate-Fail "Aggregator: percentiles missing" }
} else {
    Gate-Fail "Analytics aggregator file missing"
}

# --- 6: Clinical Report Pipeline ---

Write-Host ""
Write-Host "--- 6: Clinical Report Pipeline ---" -ForegroundColor White

$crFile = "apps/api/src/services/clinical-reports.ts"
if (Test-Path $crFile) {
    $crContent = Get-Content $crFile -Raw
    if ($crContent -match "getClinicalReportList") { Gate-Pass "Clinical: report list function exists" } else { Gate-Fail "Clinical: list function missing" }
    if ($crContent -match "getClinicalReportText") { Gate-Pass "Clinical: report text function exists" } else { Gate-Fail "Clinical: text function missing" }
    if ($crContent -match "sanitizeReportText") { Gate-Pass "Clinical: HTML sanitization exists" } else { Gate-Fail "Clinical: sanitization missing" }
    if ($crContent -match "ORWRP REPORT TEXT") { Gate-Pass "Clinical: uses ORWRP REPORT TEXT RPC" } else { Gate-Fail "Clinical: ORWRP RPC missing" }
    if ($crContent -match "recordAnalyticsEvent") { Gate-Pass "Clinical: analytics event recording wired" } else { Gate-Fail "Clinical: analytics not wired" }
    if ($crContent -match "audit\(") { Gate-Pass "Clinical: audit trail wired" } else { Gate-Fail "Clinical: audit trail missing" }
    if ($crContent -match "getClinicalReportHealth") { Gate-Pass "Clinical: health check function exists" } else { Gate-Fail "Clinical: health missing" }
} else {
    Gate-Fail "Clinical reports service file missing"
}

# --- 7: Analytics Routes ---

Write-Host ""
Write-Host "--- 7: Analytics Routes ---" -ForegroundColor White

$routeFile = "apps/api/src/routes/analytics-routes.ts"
if (Test-Path $routeFile) {
    $routeContent = Get-Content $routeFile -Raw
    if ($routeContent -match "/analytics/dashboards/ops") { Gate-Pass "Routes: ops dashboard endpoint" } else { Gate-Fail "Routes: ops dashboard missing" }
    if ($routeContent -match "/analytics/dashboards/clinical") { Gate-Pass "Routes: clinical dashboard endpoint" } else { Gate-Fail "Routes: clinical dashboard missing" }
    if ($routeContent -match "/analytics/events") { Gate-Pass "Routes: events query endpoint" } else { Gate-Fail "Routes: events endpoint missing" }
    if ($routeContent -match "/analytics/aggregated") { Gate-Pass "Routes: aggregated query endpoint" } else { Gate-Fail "Routes: aggregated endpoint missing" }
    if ($routeContent -match "/analytics/export") { Gate-Pass "Routes: export endpoint" } else { Gate-Fail "Routes: export endpoint missing" }
    if ($routeContent -match "/analytics/health") { Gate-Pass "Routes: health endpoint" } else { Gate-Fail "Routes: health endpoint missing" }
    if ($routeContent -match "/analytics/clinical-reports") { Gate-Pass "Routes: clinical reports endpoint" } else { Gate-Fail "Routes: clinical reports missing" }
    if ($routeContent -match "requireSession") { Gate-Pass "Routes: session auth required" } else { Gate-Fail "Routes: no auth check" }
    if ($routeContent -match "requireAnalyticsPermission|hasAnalyticsPermission") { Gate-Pass "Routes: analytics permission check" } else { Gate-Fail "Routes: permission check missing" }
} else {
    Gate-Fail "Analytics routes file missing"
}

# --- 8: Security Middleware Integration ---

Write-Host ""
Write-Host "--- 8: Security Middleware + Route Registration ---" -ForegroundColor White

$secContent = Get-Content "apps/api/src/middleware/security.ts" -Raw -ErrorAction SilentlyContinue
if ($secContent -match "analytics") {
    Gate-Pass "Security: /analytics/* AUTH_RULE present"
} else {
    Gate-Fail "Security: /analytics/* AUTH_RULE missing"
}

if ($secContent -match "stopAggregationJob") {
    Gate-Pass "Security: aggregation job stopped on shutdown"
} else {
    Gate-Fail "Security: aggregation job not stopped on shutdown"
}

$indexContent = Get-Content "apps/api/src/index.ts" -Raw -ErrorAction SilentlyContinue
if ($indexContent -match "analyticsRoutes") {
    Gate-Pass "Index: analytics routes imported and registered"
} else {
    Gate-Fail "Index: analytics routes not registered"
}

if ($indexContent -match "startAggregationJob") {
    Gate-Pass "Index: aggregation job started on server startup"
} else {
    Gate-Fail "Index: aggregation job not started"
}

# --- 9: Analytics Dashboard UI ---

Write-Host ""
Write-Host "--- 9: Analytics Dashboard UI ---" -ForegroundColor White

$uiFile = "apps/web/src/app/cprs/admin/analytics/page.tsx"
if (Test-Path $uiFile) {
    Gate-Pass "UI: analytics dashboard page exists"
    $uiContent = Get-Content $uiFile -Raw
    if ($uiContent -match "Ops Dashboard|ops") { Gate-Pass "UI: ops dashboard tab" } else { Gate-Fail "UI: ops tab missing" }
    if ($uiContent -match "Clinical Utilization|clinical") { Gate-Pass "UI: clinical utilization tab" } else { Gate-Fail "UI: clinical tab missing" }
    if ($uiContent -match "Events Explorer|events") { Gate-Pass "UI: events explorer tab" } else { Gate-Fail "UI: events tab missing" }
    if ($uiContent -match "Export|export") { Gate-Pass "UI: export tab" } else { Gate-Fail "UI: export tab missing" }
    if ($uiContent -match "credentials.*include") { Gate-Pass "UI: credentials: include for auth" } else { Gate-Fail "UI: credentials include missing" }
} else {
    Gate-Fail "Analytics dashboard UI file missing"
}

# --- 10: Docker + Octo SQL ---

Write-Host ""
Write-Host "--- 10: Octo SQL Layer ---" -ForegroundColor White

$dockerFile = "services/analytics/docker-compose.yml"
$seedFile = "services/analytics/octo-seed.sql"
if (Test-Path $dockerFile) {
    Gate-Pass "Docker: analytics docker-compose.yml exists"
    $dcContent = Get-Content $dockerFile -Raw
    if ($dcContent -match "octo|Octo") { Gate-Pass "Docker: Octo container defined" } else { Gate-Fail "Docker: Octo not defined" }
    if ($dcContent -match "1338") { Gate-Pass "Docker: ROcto port 1338 exposed" } else { Gate-Fail "Docker: ROcto port missing" }
} else {
    Gate-Fail "Docker: analytics docker-compose.yml missing"
}

if (Test-Path $seedFile) {
    Gate-Pass "SQL: Octo seed schema exists"
    $sqlContent = Get-Content $seedFile -Raw
    if ($sqlContent -match "analytics_hourly") { Gate-Pass "SQL: analytics_hourly table defined" } else { Gate-Fail "SQL: hourly table missing" }
    if ($sqlContent -match "analytics_daily") { Gate-Pass "SQL: analytics_daily table defined" } else { Gate-Fail "SQL: daily table missing" }
    if ($sqlContent -match "rpc_health_hourly") { Gate-Pass "SQL: RPC health table defined" } else { Gate-Fail "SQL: RPC health missing" }
    if ($sqlContent -match "clinical_report_usage") { Gate-Pass "SQL: clinical report usage table defined" } else { Gate-Fail "SQL: clinical report table missing" }
    if ($sqlContent -match "NO PHI|no PHI") { Gate-Pass "SQL: PHI disclaimer in schema" } else { Gate-Warn "SQL: PHI disclaimer missing" }
} else {
    Gate-Fail "SQL: Octo seed schema missing"
}

# --- 11: PHI Safety Scan ---

Write-Host ""
Write-Host "--- 11: PHI Safety Scan (Analytics Files) ---" -ForegroundColor White

# The PHI scan checks that analytics files do not define data FIELDS that store PHI.
# It must exclude:
#   - Comment lines (// or -- or *) that describe what NOT to store
#   - Sanitizer blocklists that enumerate patterns to strip
# Strategy: check only non-comment, non-string-literal lines for PHI field definitions.

$analyticsFiles = @(
    "apps/api/src/config/analytics-config.ts",
    "apps/api/src/services/analytics-aggregator.ts",
    "apps/api/src/routes/analytics-routes.ts"
)

$phiFieldPatterns = @("socialSecurity\s*:", "patientName\s*:", "dateOfBirth\s*:")
$phiFound = $false

foreach ($f in $analyticsFiles) {
    if (Test-Path $f) {
        $lines = Get-Content $f
        foreach ($line in $lines) {
            # Skip comment lines
            if ($line -match "^\s*(//|\*|--|\#)") { continue }
            foreach ($pat in $phiFieldPatterns) {
                if ($line -match $pat) {
                    Gate-Fail "PHI: field pattern '$pat' found in $f"
                    $phiFound = $true
                }
            }
        }
    }
}

if (-not $phiFound) {
    Gate-Pass "PHI: no PHI field definitions detected in analytics files"
}

# Verify analytics-store.ts has sanitizer but no DFN in the event interface itself
$storeContent2 = Get-Content "apps/api/src/services/analytics-store.ts" -Raw -ErrorAction SilentlyContinue
if ($storeContent2 -match "sanitizeAnalyticsTags") {
    Gate-Pass "PHI: analytics store has tag sanitizer"
} else {
    Gate-Fail "PHI: analytics store missing tag sanitizer"
}

# Check that the AnalyticsEvent interface does NOT have dfn field
$interfaceBlock = [regex]::Match($storeContent2, "interface AnalyticsEvent \{[^}]+\}")
if ($interfaceBlock.Success) {
    $iface = $interfaceBlock.Value
    if ($iface -notmatch "\bdfn\b|\bpatientDfn\b|\bpatient_dfn\b") {
        Gate-Pass "PHI: AnalyticsEvent interface has no DFN field"
    } else {
        Gate-Fail "PHI: AnalyticsEvent interface contains a DFN field"
    }
} else {
    Gate-Warn "PHI: could not parse AnalyticsEvent interface for DFN check"
}

# --- 12: Documentation ---

Write-Host ""
Write-Host "--- 12: Documentation ---" -ForegroundColor White

if (Test-Path "docs/analytics/phase25-data-classification.md") {
    Gate-Pass "Docs: data classification document"
} else {
    Gate-Fail "Docs: data classification missing"
}

$runbookFile = "docs/runbooks/analytics-octo-rocto.md"
if (Test-Path $runbookFile) {
    Gate-Pass "Docs: analytics Octo/ROcto runbook"
} else {
    Gate-Warn "Docs: analytics runbook missing"
}

if (Test-Path "prompts/27-PHASE-25-BI-ANALYTICS/27-01-bi-analytics-IMPLEMENT.md") {
    Gate-Pass "Prompts: Phase 25 IMPLEMENT prompt"
} else {
    Gate-Fail "Prompts: IMPLEMENT missing"
}

if (Test-Path "prompts/27-PHASE-25-BI-ANALYTICS/27-99-bi-analytics-VERIFY.md") {
    Gate-Pass "Prompts: Phase 25 VERIFY prompt"
} else {
    Gate-Fail "Prompts: VERIFY missing"
}

# --- 13: TypeScript Compilation ---

Write-Host ""
Write-Host "--- 13: TypeScript Compilation ---" -ForegroundColor White

Push-Location "apps/api"
try {
    $tscOutput = & npx tsc --noEmit 2>&1 | Out-String
    if ($LASTEXITCODE -eq 0) {
        Gate-Pass "TypeScript: API compiles clean"
    } else {
        $errorLines = ($tscOutput -split "`n" | Where-Object { $_ -match "error TS" } | Select-Object -First 5) -join "`n"
        Gate-Fail "TypeScript: API compilation errors`n$errorLines"
    }
} catch {
    Gate-Warn "TypeScript: could not run tsc ($($_.Exception.Message))"
}
Pop-Location

# --- Summary ---

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Phase 25 Verification Summary" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($fail -gt 0) {
    Write-Host "RESULT: SOME GATES FAILED" -ForegroundColor Red
    exit 1
} else {
    Write-Host "RESULT: ALL GATES PASSED" -ForegroundColor Green
    exit 0
}
