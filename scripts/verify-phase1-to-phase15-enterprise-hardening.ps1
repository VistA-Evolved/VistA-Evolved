<#
.SYNOPSIS
    VistA-Evolved Phase 15 - Enterprise Hardening Verification
.DESCRIPTION
    Extends Phase 14 verification with Phase 15 checks:
    - Security middleware (headers, rate limiting, request IDs)
    - Structured logging (credential/PHI redaction)
    - HIPAA-posture audit logging (centralized audit)
    - RPC resilience (circuit breaker, metrics)
    - Zod request validation
    - UI reliability (ErrorBoundary, useDebounce)
    - Compliance configuration
    - Observability endpoints (/health, /ready, /metrics)
    Run from repo root: .\scripts\verify-phase1-to-phase15-enterprise-hardening.ps1
.NOTES
    Requires: Node v24+, pnpm v10+, Docker Desktop running, API on port 3001
    Date: 2026-02-18
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipInstall,
    [int]$ApiPort = 3001
)

Set-StrictMode -Off
$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $repoRoot

# -- Helpers ---------------------------------------------------------------

$script:pass = 0
$script:fail = 0
$script:warn = 0
$script:info = 0
$script:results = @()

function Write-Phase($phase, $desc) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $phase -- $desc" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Assert-Check($name, $condition, $detail) {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
        $script:pass++
        $script:results += [PSCustomObject]@{ Check = $name; Status = "PASS"; Detail = $detail }
    } else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        if ($detail) { Write-Host "         $detail" -ForegroundColor Yellow }
        $script:fail++
        $script:results += [PSCustomObject]@{ Check = $name; Status = "FAIL"; Detail = $detail }
    }
}

function Warn-Check($name, $detail) {
    Write-Host "  [WARN] $name" -ForegroundColor Yellow
    if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
    $script:warn++
    $script:results += [PSCustomObject]@{ Check = $name; Status = "WARN"; Detail = $detail }
}

function Info-Check($name, $detail) {
    Write-Host "  [INFO] $name" -ForegroundColor DarkCyan
    if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
    $script:info++
    $script:results += [PSCustomObject]@{ Check = $name; Status = "INFO"; Detail = $detail }
}

# -- Pre-flight ------------------------------------------------------------

Write-Host ""
Write-Host "VistA-Evolved Phase 15 - Enterprise Hardening Verification" -ForegroundColor White -BackgroundColor DarkBlue
Write-Host "Repo: $repoRoot"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

$nodeVer = (node -v 2>$null)
Assert-Check "Node.js installed" ($nodeVer -match "^v2[4-9]") "Found: $nodeVer"
$pnpmVer = (pnpm -v 2>$null)
Assert-Check "pnpm installed" ($pnpmVer -match "^10\.") "Found: $pnpmVer"

# =========================================================================
# PHASE 15A - Security Baseline (File Existence)
# =========================================================================

Write-Phase "PHASE 15A" "Security Baseline - File Existence"

Assert-Check "server-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\server-config.ts")
Assert-Check "logger.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\logger.ts")
Assert-Check "audit.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\audit.ts")
Assert-Check "rpc-resilience.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\rpc-resilience.ts")
Assert-Check "validation.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\validation.ts")
Assert-Check "security.ts middleware exists" (Test-Path "$repoRoot\apps\api\src\middleware\security.ts")

# Code pattern checks
$loggerContent = $null
$loggerContent = Get-Content "$repoRoot\apps\api\src\lib\logger.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "Logger exports 'log'" ($loggerContent -match 'export\s+(const|function)\s+log\b') ""
Assert-Check "Logger redacts credentials" ($loggerContent -match 'redact|REDACTED') "PHI/credential scrubbing"

$auditContent = $null
$auditContent = Get-Content "$repoRoot\apps\api\src\lib\audit.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "Audit exports 'audit'" ($auditContent -match 'export\s+(function|const)\s+audit\b') ""
Assert-Check "Audit has AuditAction type" ($auditContent -match "AuditAction") ""
Assert-Check "Audit has 'phi.patient-search'" ($auditContent -match "phi\.patient-search") ""
Assert-Check "Audit has 'clinical.allergy-add'" ($auditContent -match "clinical\.allergy-add") ""
Assert-Check "Audit has 'rpc.console-connect'" ($auditContent -match "rpc\.console-connect") ""

$validationContent = $null
$validationContent = Get-Content "$repoRoot\apps\api\src\lib\validation.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "Validation uses Zod" ($validationContent -match "import.*zod") "Zod schemas present"
Assert-Check "Validation exports LoginBodySchema" ($validationContent -match "LoginBodySchema") ""

$secMiddleware = $null
$secMiddleware = Get-Content "$repoRoot\apps\api\src\middleware\security.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "Security middleware has rate limiting" ($secMiddleware -match 'rate.?limit|rateLimitMap') ""
Assert-Check "Security middleware has request IDs" ($secMiddleware -match 'X-Request-Id|requestId|randomUUID') ""
Assert-Check "Security middleware sets nosniff" ($secMiddleware -match "nosniff") ""
Assert-Check "Security middleware sets DENY" ($secMiddleware -match "DENY") ""

$configContent = $null
$configContent = Get-Content "$repoRoot\apps\api\src\config\server-config.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "Config exports SESSION_CONFIG" ($configContent -match "SESSION_CONFIG") ""
Assert-Check "Config exports RATE_LIMIT_CONFIG" ($configContent -match "RATE_LIMIT_CONFIG") ""

# =========================================================================
# PHASE 15B - RPC Resilience (File + Pattern)
# =========================================================================

Write-Phase "PHASE 15B" "RPC Resilience - Circuit Breaker + Metrics"

$resContent = $null
$resContent = Get-Content "$repoRoot\apps\api\src\lib\rpc-resilience.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "RPC resilience exports resilientRpc" ($resContent -match "export.*resilientRpc") ""
Assert-Check "RPC resilience has circuit breaker" ($resContent -match 'CircuitBreaker|circuitBreaker|OPEN|CLOSED|HALF') ""
Assert-Check "RPC resilience has retry logic" ($resContent -match 'retry|maxRetries') ""
Assert-Check "RPC resilience has timeout" ($resContent -match 'timeout|timeoutMs') ""
Assert-Check "RPC resilience has metrics" ($resContent -match 'getRpcMetrics|rpcMetrics') ""

# =========================================================================
# PHASE 15C - Audit Wiring in Clinical Endpoints
# =========================================================================

Write-Phase "PHASE 15C" "Audit Wiring - Clinical Endpoints"

$indexContent = $null
$indexContent = Get-Content "$repoRoot\apps\api\src\index.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "index.ts imports audit" ($indexContent -match "import.*audit.*from.*lib/audit") ""
Assert-Check "index.ts imports registerSecurityMiddleware" ($indexContent -match "registerSecurityMiddleware") ""
Assert-Check "Audit: patient-search" ($indexContent -match 'audit\("phi\.patient-search"') ""
Assert-Check "Audit: demographics-view" ($indexContent -match 'audit\("phi\.demographics-view"') ""
Assert-Check "Audit: allergies-view" ($indexContent -match 'audit\("phi\.allergies-view"') ""
Assert-Check "Audit: allergy-add" ($indexContent -match 'audit\("clinical\.allergy-add"') ""
Assert-Check "Audit: vitals-view" ($indexContent -match 'audit\("phi\.vitals-view"') ""
Assert-Check "Audit: vitals-add" ($indexContent -match 'audit\("clinical\.vitals-add"') ""
Assert-Check "Audit: notes-view" ($indexContent -match 'audit\("phi\.notes-view"') ""
Assert-Check "Audit: note-create" ($indexContent -match 'audit\("clinical\.note-create"') ""
Assert-Check "Audit: medications-view" ($indexContent -match 'audit\("phi\.medications-view"') ""
Assert-Check "Audit: medication-add" ($indexContent -match 'audit\("clinical\.medication-add"') ""
Assert-Check "Audit: problems-view" ($indexContent -match 'audit\("phi\.problems-view"') ""
Assert-Check "Audit: patient-list" ($indexContent -match 'audit\("phi\.patient-list"') ""

# ws-console migration
$wsContent = $null
$wsContent = Get-Content "$repoRoot\apps\api\src\routes\ws-console.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "ws-console uses centralAudit" ($wsContent -match 'import.*centralAudit.*audit|import.*audit.*from.*lib/audit') ""
Assert-Check "ws-console no local auditLog array" (-not ($wsContent -match "const auditLog:\s*AuditEntry\[\]")) "Local audit array removed"

# write-backs migration
$wbContent = $null
$wbContent = Get-Content "$repoRoot\apps\api\src\routes\write-backs.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "write-backs uses centralAudit" ($wbContent -match 'import.*centralAudit.*audit|import.*audit.*from.*lib/audit') ""
Assert-Check "write-backs dual-write pattern" ($wbContent -match 'centralAudit\(') "Centralized audit calls present"

# =========================================================================
# PHASE 15D - Observability (File Patterns)
# =========================================================================

Write-Phase "PHASE 15D" "Observability - /health, /ready, /metrics"

Assert-Check "/health endpoint in index.ts" ($indexContent -match '"/health"') ""
Assert-Check "/ready endpoint in index.ts" ($indexContent -match '"/ready"') ""
Assert-Check "/metrics endpoint in index.ts" ($indexContent -match '"/metrics"') ""
Assert-Check "/audit/events endpoint" ($indexContent -match '"/audit/events"') ""
Assert-Check "/audit/stats endpoint" ($indexContent -match '"/audit/stats"') ""
Assert-Check "/admin/circuit-breaker/reset endpoint" ($indexContent -match 'circuit-breaker/reset') ""

# =========================================================================
# PHASE 15E - UI Reliability
# =========================================================================

Write-Phase "PHASE 15E" "UI Reliability - ErrorBoundary + useDebounce"

Assert-Check "ErrorBoundary.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\ui\ErrorBoundary.tsx")
Assert-Check "useDebounce.ts exists" (Test-Path "$repoRoot\apps\web\src\lib\useDebounce.ts")

$ebContent = $null
$ebContent = Get-Content "$repoRoot\apps\web\src\components\ui\ErrorBoundary.tsx" -Raw -ErrorAction SilentlyContinue
Assert-Check "ErrorBoundary is class component" ($ebContent -match "class ErrorBoundary") ""
Assert-Check "ErrorBoundary has retry" ($ebContent -match 'retry|resetErrorBoundary|Try Again') ""

$layoutContent = $null
$layoutContent = Get-Content "$repoRoot\apps\web\src\app\cprs\layout.tsx" -Raw -ErrorAction SilentlyContinue
Assert-Check "CPRS layout uses ErrorBoundary" ($layoutContent -match "ErrorBoundary") ""

$tabPageContent = $null
$tabPageContent = Get-Content -LiteralPath "$repoRoot\apps\web\src\app\cprs\chart\[dfn]\[tab]\page.tsx" -Raw -ErrorAction SilentlyContinue
Assert-Check "Chart tab uses ErrorBoundary" ($tabPageContent -match "ErrorBoundary") ""

# =========================================================================
# PHASE 15F - Compliance Config
# =========================================================================

Write-Phase "PHASE 15F" "Compliance Configuration"

Assert-Check "Config has SESSION_CONFIG" ($configContent -match 'SESSION_CONFIG') ""
Assert-Check "Config has LOG_CONFIG" ($configContent -match "LOG_CONFIG") ""
Assert-Check "Config has PHI_CONFIG" ($configContent -match "PHI_CONFIG") ""
Assert-Check "Config has AUDIT_CONFIG" ($configContent -match "AUDIT_CONFIG") ""
Assert-Check "Config has RPC_CONFIG" ($configContent -match "RPC_CONFIG") ""
Assert-Check "Config has CACHE_CONFIG" ($configContent -match "CACHE_CONFIG") ""

# Session store uses config
$ssContent = $null
$ssContent = Get-Content "$repoRoot\apps\api\src\auth\session-store.ts" -Raw -ErrorAction SilentlyContinue
Assert-Check "Session store imports server-config" ($ssContent -match "server-config") ""
Assert-Check "Session store has rotateSession" ($ssContent -match "rotateSession") ""
Assert-Check "Session store checks idle timeout" ($ssContent -match "idleTtl|lastAccess") ""

# =========================================================================
# PHASE 15G - Docs
# =========================================================================

Write-Phase "PHASE 15G" "Documentation"

Assert-Check "Phase 15 IMPLEMENT prompt" (Test-Path "$repoRoot\prompts\17-PHASE-15-ENTERPRISE-HARDENING\17-01-enterprise-hardening-IMPLEMENT.md")
Assert-Check "Phase 15 VERIFY prompt" (Test-Path "$repoRoot\prompts\17-PHASE-15-ENTERPRISE-HARDENING\17-99-enterprise-hardening-VERIFY.md")
Assert-Check "Phase 15 runbook" (Test-Path "$repoRoot\docs\runbooks\enterprise-hardening-phase15.md")

# =========================================================================
# COMPILATION
# =========================================================================

Write-Phase "COMPILATION" "TypeScript Compile Checks"

Push-Location "$repoRoot\apps\api"
$apiTsc = & npx tsc --noEmit 2>&1
$apiTscOk = ($LASTEXITCODE -eq 0)
Assert-Check "API compiles (tsc --noEmit)" $apiTscOk "$($apiTsc -join ' | ')"
Pop-Location

Push-Location "$repoRoot\apps\web"
$webTsc = & npx tsc --noEmit 2>&1
$webTscOk = ($LASTEXITCODE -eq 0)
Assert-Check "Web compiles (tsc --noEmit)" $webTscOk "$($webTsc -join ' | ')"
Pop-Location

# =========================================================================
# SECURITY - Credential Leak Checks
# =========================================================================

Write-Phase "SECURITY" "Credential Leak Checks"
$apiFiles = Get-ChildItem -Path "$repoRoot\apps\api\src" -Recurse -Include "*.ts" -File
$credLeaks = 0
foreach ($f in $apiFiles) {
    $content = Get-Content $f.FullName -Raw
    if ($content -match "console\.(log|info)\(.*(?:avPlain|accessCode|verifyCode|password)") {
        $credLeaks++
    }
}
Assert-Check "No credential logging in API source" ($credLeaks -eq 0) "$($apiFiles.Count) files scanned"

# Check that logger redacts SSNs and access codes
Assert-Check "Logger redacts SSN patterns" ($loggerContent -match 'SSN|ssn|\d{3}') "SSN regex in redaction"
Assert-Check "Logger redacts Bearer tokens" ($loggerContent -match 'Bearer|bearer') "Bearer token scrubbing"

# =========================================================================
# LIVE API CHECKS (Phase 15 endpoints)
# =========================================================================

$apiBase = "http://127.0.0.1:$ApiPort"
$apiUp = $false
try {
    $health = Invoke-RestMethod -Uri "$apiBase/health" -TimeoutSec 5
    $apiUp = ($health.ok -eq $true)
} catch { $apiUp = $false }

if ($apiUp) {
    Write-Phase "LIVE API" "Phase 15 Endpoint Tests"

    # /health
    try {
        $h = Invoke-RestMethod -Uri "$apiBase/health" -TimeoutSec 5
        Assert-Check "GET /health ok" ($h.ok -eq $true) "version=$($h.version)"
        Assert-Check "/health has uptime" ($null -ne $h.uptime) "uptime=$($h.uptime)"
        Assert-Check "/health version is phase-15" ($h.version -eq "phase-15") ""
    } catch {
        Assert-Check "GET /health" $false "Error: $_"
    }

    # /metrics
    try {
        $m = Invoke-RestMethod -Uri "$apiBase/metrics" -TimeoutSec 5
        Assert-Check "GET /metrics ok" ($m.ok -eq $true) ""
        Assert-Check "/metrics has circuitBreaker" ($null -ne $m.rpcHealth.circuitBreaker) ""
        Assert-Check "/metrics has rpcMetrics" ($null -ne $m.rpcHealth.rpcMetrics) ""
    } catch {
        Assert-Check "GET /metrics" $false "Error: $_"
    }

    # /audit/stats
    try {
        $as = Invoke-RestMethod -Uri "$apiBase/audit/stats" -TimeoutSec 5
        Assert-Check "GET /audit/stats ok" ($as.ok -eq $true) ""
        Assert-Check "/audit/stats has totalEvents" ($as.total -gt 0) "total=$($as.total)"
        Assert-Check "/audit/stats has system.startup" ($as.byAction.'system.startup' -gt 0) ""
    } catch {
        Assert-Check "GET /audit/stats" $false "Error: $_"
    }

    # /audit/events
    try {
        $ae = Invoke-RestMethod -Uri "$apiBase/audit/events" -TimeoutSec 5
        Assert-Check "GET /audit/events ok" ($ae.ok -eq $true) "count=$($ae.count)"
    } catch {
        Assert-Check "GET /audit/events" $false "Error: $_"
    }

    # Security headers check
    try {
        $resp = Invoke-WebRequest -Uri "$apiBase/health" -TimeoutSec 5 -UseBasicParsing
        $headers = $resp.Headers
        Assert-Check "X-Request-Id header present" ($null -ne $headers['X-Request-Id']) ""
        Assert-Check "X-Content-Type-Options: nosniff" ($headers['X-Content-Type-Options'] -eq 'nosniff') ""
        Assert-Check "X-Frame-Options: DENY" ($headers['X-Frame-Options'] -eq 'DENY') ""
        Assert-Check "Cache-Control: no-store" ($headers['Cache-Control'] -match 'no-store') ""
        Assert-Check "Strict-Transport-Security set" ($null -ne $headers['Strict-Transport-Security']) ""
    } catch {
        Assert-Check "Security headers" $false "Error: $_"
    }

    # Zod validation: POST /auth/login with empty body
    try {
        $valResp = Invoke-WebRequest -Uri "$apiBase/auth/login" -Method POST -Body '{}' -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing
        Assert-Check "Zod validation returns 400" $false "Expected 400 but got $($valResp.StatusCode)"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Assert-Check "Zod validation returns 400" ($statusCode -eq 400) "status=$statusCode"
    }

    # /admin/circuit-breaker/reset
    try {
        $cbr = Invoke-RestMethod -Uri "$apiBase/admin/circuit-breaker/reset" -Method POST -TimeoutSec 5
        Assert-Check "POST /admin/circuit-breaker/reset" ($cbr.ok -eq $true) ""
    } catch {
        Assert-Check "POST /admin/circuit-breaker/reset" $false "Error: $_"
    }

} else {
    Info-Check "API not running" "Skipping live Phase 15 endpoint tests (start API on port $ApiPort)"
}

# =========================================================================
# Summary
# =========================================================================

Write-Host ""
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host "  PHASE 15 ENTERPRISE HARDENING VERIFICATION SUMMARY" -ForegroundColor Magenta
Write-Host ("=" * 70) -ForegroundColor Magenta
Write-Host ""
Write-Host "  PASS: $($script:pass)" -ForegroundColor Green
$failColor = $(if ($script:fail -gt 0) { "Red" } else { "Green" })
Write-Host "  FAIL: $($script:fail)" -ForegroundColor $failColor
$warnColor = $(if ($script:warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "  WARN: $($script:warn)" -ForegroundColor $warnColor
Write-Host "  INFO: $($script:info)" -ForegroundColor Cyan
$total = $script:pass + $script:fail + $script:warn + $script:info
Write-Host "  TOTAL: $total"
Write-Host ""

if ($script:fail -eq 0 -and $script:warn -eq 0) {
    Write-Host "  *** ALL CHECKS PASSED - 0 WARN ***" -ForegroundColor Green
    if ($script:info -gt 0) {
        Write-Host "  (INFO items are documented expected states)" -ForegroundColor Cyan
    }
} elseif ($script:fail -eq 0) {
    Write-Host "  *** NO FAILURES but $($script:warn) WARN(s) remain ***" -ForegroundColor Yellow
} else {
    Write-Host "  *** $($script:fail) CHECK(S) FAILED - review above ***" -ForegroundColor Red
}

Write-Host ""
exit $script:fail
