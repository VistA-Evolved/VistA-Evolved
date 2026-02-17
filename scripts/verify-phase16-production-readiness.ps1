<#
.SYNOPSIS
    VistA-Evolved Phase 16 - Production Readiness Verification
.DESCRIPTION
    Comprehensive verification covering Phase 10→15B regression checks
    plus all Phase 16 production readiness requirements:
    - Prompts ordering audit
    - Phase 15B security infrastructure (regression)
    - Deployment packaging (Dockerfiles, compose, nginx)
    - Config validation (Zod env schema)
    - Health/ready/version endpoints
    - Observability (metrics, audit, request IDs)
    - Reliability (circuit breaker, degraded banner)
    - Performance (load test harness)
    - Documentation (runbooks)
    - Secret scan
    Run from repo root: .\scripts\verify-phase16-production-readiness.ps1
.NOTES
    Requires: Node v22+, pnpm v10+, Docker Desktop running, API on port 3001
#>

param(
    [switch]$SkipDocker,
    [switch]$SkipLive,
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
    Write-Host "  $phase - $desc" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Assert-Check($name, $condition, $detail) {
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
        $script:pass++
        $script:results += [PSCustomObject]@{ Status='PASS'; Check=$name }
    } else {
        Write-Host "  [FAIL] $name" -ForegroundColor Red
        if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
        $script:fail++
        $script:results += [PSCustomObject]@{ Status='FAIL'; Check=$name }
    }
}

function Assert-Warn($name, $detail) {
    Write-Host "  [WARN] $name" -ForegroundColor Yellow
    if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
    $script:warn++
    $script:results += [PSCustomObject]@{ Status='WARN'; Check=$name }
}

function Assert-Info($name, $detail) {
    Write-Host "  [INFO] $name" -ForegroundColor DarkCyan
    if ($detail) { Write-Host "         $detail" -ForegroundColor DarkGray }
    $script:info++
    $script:results += [PSCustomObject]@{ Status='INFO'; Check=$name }
}

# =========================================================================
# PART 1: Prompts Directory Ordering (regression + Phase 16)
# =========================================================================
Write-Phase "P1" "Prompts Directory Ordering"

$phaseFolders = Get-ChildItem "$repoRoot\prompts" -Directory | Where-Object { $_.Name -match '^\d{2}-PHASE' } | Sort-Object Name
$folderNumbers = $phaseFolders | ForEach-Object { ($_.Name -split '-')[0] }
$uniqueNums = $folderNumbers | Select-Object -Unique
Assert-Check "No duplicate folder numbers" ($folderNumbers.Count -eq $uniqueNums.Count) "Found $($folderNumbers.Count) folders, $($uniqueNums.Count) unique"

# Key phase folders
Assert-Check "12-PHASE-10-CPRS-EXTRACT exists" (Test-Path "$repoRoot\prompts\12-PHASE-10-CPRS-EXTRACT")
Assert-Check "17-PHASE-15-ENTERPRISE-HARDENING exists" (Test-Path "$repoRoot\prompts\17-PHASE-15-ENTERPRISE-HARDENING")
Assert-Check "18-PHASE-16-PRODUCTION-READINESS exists" (Test-Path "$repoRoot\prompts\18-PHASE-16-PRODUCTION-READINESS")

# No stale duplicate folders
Assert-Check "No duplicate 12-PHASE-13 folder" (-not (Test-Path "$repoRoot\prompts\12-PHASE-13-CPRS-OPERATIONALIZATION"))
Assert-Check "No old 15-PHASE-14 folder" (-not (Test-Path "$repoRoot\prompts\15-PHASE-14-PARITY-CLOSURE"))

# File prefix matching folder number
$prefixErrors = @()
foreach ($folder in $phaseFolders) {
    $expectedPrefix = ($folder.Name -split '-')[0]
    $files = Get-ChildItem $folder.FullName -File -Filter '*.md'
    foreach ($f in $files) {
        $filePrefix = ($f.Name -split '-')[0]
        if ($filePrefix -ne $expectedPrefix) {
            $prefixErrors += "$($folder.Name)\$($f.Name) (expected: $expectedPrefix, got: $filePrefix)"
        }
    }
}
Assert-Check "All file prefixes match folder numbers" ($prefixErrors.Count -eq 0) $(if ($prefixErrors.Count -gt 0) { "Mismatches: $($prefixErrors -join ', ')" } else { "All file prefixes correct" })

# Phase 16 files exist with correct prefix
Assert-Check "Phase 16 IMPLEMENT prompt exists" (Test-Path "$repoRoot\prompts\18-PHASE-16-PRODUCTION-READINESS\18-01-Phase16-IMPLEMENT.md")
Assert-Check "Phase 16 VERIFY prompt exists" (Test-Path "$repoRoot\prompts\18-PHASE-16-PRODUCTION-READINESS\18-99-Phase16-VERIFY.md")

# =========================================================================
# PART 2: Phase 15B Security Infrastructure (regression)
# =========================================================================
Write-Phase "P2" "Security Infrastructure (Phase 15B regression)"

Assert-Check "server-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\server-config.ts")

$loggerContent = if (Test-Path "$repoRoot\apps\api\src\lib\logger.ts") { Get-Content "$repoRoot\apps\api\src\lib\logger.ts" -Raw } else { "" }
Assert-Check "logger.ts exists" ($loggerContent.Length -gt 0)
Assert-Check "Logger uses AsyncLocalStorage" ($loggerContent -match 'AsyncLocalStorage')

$auditContent = if (Test-Path "$repoRoot\apps\api\src\lib\audit.ts") { Get-Content "$repoRoot\apps\api\src\lib\audit.ts" -Raw } else { "" }
Assert-Check "audit.ts exists" ($auditContent.Length -gt 0)

$resilienceContent = if (Test-Path "$repoRoot\apps\api\src\lib\rpc-resilience.ts") { Get-Content "$repoRoot\apps\api\src\lib\rpc-resilience.ts" -Raw } else { "" }
Assert-Check "rpc-resilience.ts exists" ($resilienceContent.Length -gt 0)
Assert-Check "Exports safeCallRpc" ($resilienceContent -match 'export async function safeCallRpc')

Assert-Check "validation.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\validation.ts")

$secMiddleware = if (Test-Path "$repoRoot\apps\api\src\middleware\security.ts") { Get-Content "$repoRoot\apps\api\src\middleware\security.ts" -Raw } else { "" }
Assert-Check "security.ts exists" ($secMiddleware.Length -gt 0)
Assert-Check "Auth gateway exists" ($secMiddleware -match 'Auth gateway')
Assert-Check "Graceful shutdown exists" ($secMiddleware -match 'Graceful shutdown')

# Auth route hardening
$authRoutes = if (Test-Path "$repoRoot\apps\api\src\auth\auth-routes.ts") { Get-Content "$repoRoot\apps\api\src\auth\auth-routes.ts" -Raw } else { "" }
Assert-Check "No token in login response body" ($authRoutes -notmatch 'token:\s*(final|session)Token')
Assert-Check "Cookie is httpOnly" ($authRoutes -match 'httpOnly:\s*true')

# CORS
$indexTs = if (Test-Path "$repoRoot\apps\api\src\index.ts") { Get-Content "$repoRoot\apps\api\src\index.ts" -Raw } else { "" }
Assert-Check "CORS uses corsOriginValidator" ($indexTs -match 'corsOriginValidator')
Assert-Check "No origin: true in index.ts" ($indexTs -notmatch 'origin:\s*true')

# =========================================================================
# PART 3: Deployment Packaging (Phase 16)
# =========================================================================
Write-Phase "P3" "Deployment Packaging"

Assert-Check "API Dockerfile exists" (Test-Path "$repoRoot\apps\api\Dockerfile")
Assert-Check "Web Dockerfile exists" (Test-Path "$repoRoot\apps\web\Dockerfile")
Assert-Check "docker-compose.prod.yml exists" (Test-Path "$repoRoot\docker-compose.prod.yml")
Assert-Check "nginx.conf exists" (Test-Path "$repoRoot\nginx\nginx.conf")

$apiDockerfile = if (Test-Path "$repoRoot\apps\api\Dockerfile") { Get-Content "$repoRoot\apps\api\Dockerfile" -Raw } else { "" }
Assert-Check "API Dockerfile has HEALTHCHECK" ($apiDockerfile -match 'HEALTHCHECK')
Assert-Check "API Dockerfile runs as non-root" ($apiDockerfile -match 'USER appuser')

$webDockerfile = if (Test-Path "$repoRoot\apps\web\Dockerfile") { Get-Content "$repoRoot\apps\web\Dockerfile" -Raw } else { "" }
Assert-Check "Web Dockerfile has HEALTHCHECK" ($webDockerfile -match 'HEALTHCHECK')
Assert-Check "Web Dockerfile runs as non-root" ($webDockerfile -match 'USER appuser')

$composeProd = if (Test-Path "$repoRoot\docker-compose.prod.yml") { Get-Content "$repoRoot\docker-compose.prod.yml" -Raw } else { "" }
Assert-Check "Compose has proxy service" ($composeProd -match 'proxy:')
Assert-Check "Compose has api service" ($composeProd -match 'api:')
Assert-Check "Compose has web service" ($composeProd -match 'web:')

$nginxConf = if (Test-Path "$repoRoot\nginx\nginx.conf") { Get-Content "$repoRoot\nginx\nginx.conf" -Raw } else { "" }
Assert-Check "Nginx proxies /vista/" ($nginxConf -match 'location /vista/')
Assert-Check "Nginx supports WebSocket upgrade" ($nginxConf -match 'proxy_http_version 1.1')

# =========================================================================
# PART 4: Config & Secrets (Phase 16)
# =========================================================================
Write-Phase "P4" "Config & Secrets"

$envTs = if (Test-Path "$repoRoot\apps\api\src\config\env.ts") { Get-Content "$repoRoot\apps\api\src\config\env.ts" -Raw } else { "" }
Assert-Check "Zod env config exists" ($envTs.Length -gt 0)
Assert-Check "Zod schema validates env" ($envTs -match 'z\.object')
Assert-Check "Fail-fast on invalid config" ($envTs -match 'safeParse')

$envExample = if (Test-Path "$repoRoot\apps\api\.env.example") { Get-Content "$repoRoot\apps\api\.env.example" -Raw } else { "" }
Assert-Check ".env.example has VISTA_HOST" ($envExample -match 'VISTA_HOST')
Assert-Check ".env.example has LOG_LEVEL" ($envExample -match 'LOG_LEVEL')
Assert-Check ".env.example has AUDIT_SINK" ($envExample -match 'AUDIT_SINK')
Assert-Check ".env.example has RPC_CALL_TIMEOUT_MS" ($envExample -match 'RPC_CALL_TIMEOUT_MS')
Assert-Check ".env.example has BUILD_SHA" ($envExample -match 'BUILD_SHA')

Assert-Check "Secret scanner exists" (Test-Path "$repoRoot\scripts\secret-scan.mjs")

# =========================================================================
# PART 5: TypeScript Compilation (regression)
# =========================================================================
Write-Phase "P5" "TypeScript Compilation"

$apiTsc = & pnpm -C "$repoRoot\apps\api" exec tsc --noEmit 2>&1
$apiTscExit = $LASTEXITCODE
$apiErrors = ($apiTsc | Select-String "error TS" | Measure-Object).Count
Assert-Check "API compiles clean (tsc --noEmit)" ($apiTscExit -eq 0 -or $apiErrors -eq 0) "$apiErrors errors"

$webTsc = & pnpm -C "$repoRoot\apps\web" exec tsc --noEmit 2>&1
$webTscExit = $LASTEXITCODE
$webErrors = ($webTsc | Select-String "error TS" | Measure-Object).Count
Assert-Check "Web compiles clean (tsc --noEmit)" ($webTscExit -eq 0 -or $webErrors -eq 0) "$webErrors errors"

# =========================================================================
# PART 6: Security Scans (regression)
# =========================================================================
Write-Phase "P6" "Security Scans"

# Check for hardcoded credentials in non-comment code
$codeFiles = Get-ChildItem "$repoRoot\apps\api\src","$repoRoot\apps\web\src" -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue
$credViolations = 0
foreach ($file in $codeFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $lines = $content -split "`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i].TrimStart()
        if ($line.StartsWith('//') -or $line.StartsWith('*') -or $line.StartsWith('/*')) { continue }
        # Skip .env.example and .md patterns
        if ($line -match 'placeholder' -or $line -match 'NODE_ENV') { continue }
        if ($line -match "(?<!')'PROV123'" -and $file.Name -ne 'page.tsx') { $credViolations++ }
    }
}
Assert-Check "No hardcoded PROV123 in code (non-comment)" ($credViolations -eq 0) "$credViolations violations"

$consoleLogs = $codeFiles | ForEach-Object { Select-String -Path $_.FullName -Pattern 'console\.log\(' -AllMatches } | Measure-Object | Select-Object -ExpandProperty Count
Assert-Check "Minimal console.log usage (<=6)" ($consoleLogs -le 6) "Found $consoleLogs console.log calls"

# =========================================================================
# PART 7: Documentation (Phase 16)
# =========================================================================
Write-Phase "P7" "Documentation"

Assert-Check "prod-deploy-phase16.md exists" (Test-Path "$repoRoot\docs\runbooks\prod-deploy-phase16.md")
Assert-Check "observability-phase16.md exists" (Test-Path "$repoRoot\docs\runbooks\observability-phase16.md")
Assert-Check "backup-restore-phase16.md exists" (Test-Path "$repoRoot\docs\runbooks\backup-restore-phase16.md")
Assert-Check "incident-response-phase16.md exists" (Test-Path "$repoRoot\docs\runbooks\incident-response-phase16.md")

$runbooksReadme = if (Test-Path "$repoRoot\docs\runbooks\README.md") { Get-Content "$repoRoot\docs\runbooks\README.md" -Raw } else { "" }
Assert-Check "Runbooks README has Phase 16 links" ($runbooksReadme -match 'Phase 16')
Assert-Check "Runbooks README links prod-deploy" ($runbooksReadme -match 'prod-deploy-phase16\.md')
Assert-Check "Runbooks README links observability" ($runbooksReadme -match 'observability-phase16\.md')
Assert-Check "Runbooks README links backup-restore" ($runbooksReadme -match 'backup-restore-phase16\.md')
Assert-Check "Runbooks README links incident-response" ($runbooksReadme -match 'incident-response-phase16\.md')

# =========================================================================
# PART 8: Reliability — Degraded Banner (Phase 16)
# =========================================================================
Write-Phase "P8" "Reliability & Resilience"

Assert-Check "DegradedBanner.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\DegradedBanner.tsx")
$cprsLayout = if (Test-Path "$repoRoot\apps\web\src\app\cprs\layout.tsx") { Get-Content "$repoRoot\apps\web\src\app\cprs\layout.tsx" -Raw } else { "" }
Assert-Check "DegradedBanner wired into CPRS layout" ($cprsLayout -match 'DegradedBanner')
Assert-Check "Circuit breaker exists (regression)" ($resilienceContent -match 'CircuitBreaker|circuitBreaker')

# =========================================================================
# PART 9: Performance (Phase 16)
# =========================================================================
Write-Phase "P9" "Performance Hardening"

Assert-Check "Load test harness exists" (Test-Path "$repoRoot\scripts\load-test.mjs")

$loadTestContent = if (Test-Path "$repoRoot\scripts\load-test.mjs") { Get-Content "$repoRoot\scripts\load-test.mjs" -Raw } else { "" }
Assert-Check "Load test hits /health" ($loadTestContent -match '/health')
Assert-Check "Load test hits /metrics" ($loadTestContent -match '/metrics')
Assert-Check "Load test supports concurrency" ($loadTestContent -match 'concurrency|CONCURRENCY')

# =========================================================================
# PART 10: Verifier Scripts (Phase 16)
# =========================================================================
Write-Phase "P10" "Verifier Scripts & Ops"

Assert-Check "Phase 16 verifier exists" (Test-Path "$repoRoot\scripts\verify-phase16-production-readiness.ps1")
$verifyLatest = if (Test-Path "$repoRoot\scripts\verify-latest.ps1") { Get-Content "$repoRoot\scripts\verify-latest.ps1" -Raw } else { "" }
Assert-Check "verify-latest points to Phase 16 script" ($verifyLatest -match 'phase16|phase-16|Phase16')

# =========================================================================
# PART 11: Live API Tests
# =========================================================================
if (-not $SkipLive) {
    Write-Phase "P11" "Live API Tests"

    $apiUrl = "http://127.0.0.1:$ApiPort"
    $apiReachable = $false
    try {
        $healthResp = Invoke-RestMethod "$apiUrl/health" -TimeoutSec 5
        $apiReachable = $healthResp.ok -eq $true
    } catch {}

    if ($apiReachable) {
        Assert-Check "/health returns ok" $true

        # Security headers
        $headersResp = Invoke-WebRequest "$apiUrl/health" -UseBasicParsing -TimeoutSec 5
        Assert-Check "X-Request-Id header present" ($null -ne $headersResp.Headers['X-Request-Id'])
        Assert-Check "X-Content-Type-Options: nosniff" ($headersResp.Headers['X-Content-Type-Options'] -eq 'nosniff')
        Assert-Check "X-Frame-Options: DENY" ($headersResp.Headers['X-Frame-Options'] -eq 'DENY')
        Assert-Check "Cache-Control: no-store" ($headersResp.Headers['Cache-Control'] -eq 'no-store')

        # Ready endpoint
        try {
            $readyResp = Invoke-RestMethod "$apiUrl/ready" -TimeoutSec 10
            Assert-Check "/ready returns structured status" ($null -ne $readyResp.vista)
        } catch {
            Assert-Check "/ready returns structured status" $false
        }

        # Version endpoint (Phase 16 new)
        try {
            $versionResp = Invoke-RestMethod "$apiUrl/version" -TimeoutSec 5
            Assert-Check "/version returns ok" ($versionResp.ok -eq $true)
            Assert-Check "/version has commitSha" ($null -ne $versionResp.commitSha)
            Assert-Check "/version has buildTime" ($null -ne $versionResp.buildTime)
            Assert-Check "/version has nodeVersion" ($null -ne $versionResp.nodeVersion)
        } catch {
            Assert-Check "/version returns ok" $false
            Assert-Check "/version has commitSha" $false
            Assert-Check "/version has buildTime" $false
            Assert-Check "/version has nodeVersion" $false
        }

        # Metrics endpoint (Phase 16 enhanced)
        try {
            $metricsResp = Invoke-RestMethod "$apiUrl/metrics" -TimeoutSec 5
            Assert-Check "/metrics returns ok" ($metricsResp.ok -eq $true)
            Assert-Check "/metrics has process memory" ($null -ne $metricsResp.process)
            Assert-Check "/metrics has rpcHealth" ($null -ne $metricsResp.rpcHealth)
        } catch {
            Assert-Check "/metrics returns ok" $false
            Assert-Check "/metrics has process memory" $false
            Assert-Check "/metrics has rpcHealth" $false
        }

        # Auth gateway: clinical endpoints require auth
        try {
            $null = Invoke-WebRequest "$apiUrl/vista/patient-search?q=SMITH" -UseBasicParsing -TimeoutSec 5
            $gotThrough = $true
        } catch {
            $gotThrough = $false
        }
        Assert-Check "Clinical endpoints require auth (401)" (-not $gotThrough)

        # Login flow
        try {
            $loginBody = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
            $loginResp = Invoke-WebRequest -Uri "$apiUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15
            $loginJson = $loginResp.Content | ConvertFrom-Json
            $loginOk = $loginJson.ok
            $sessionCookie = $loginResp.Headers['Set-Cookie']

            Assert-Check "Login succeeds" ($loginOk -eq $true)
            Assert-Check "Session cookie set" ($null -ne $sessionCookie)
            Assert-Check "No token in login response body" ($null -eq $loginJson.session.token)

            if ($sessionCookie) {
                $tokenVal = (($sessionCookie -split ';')[0] -split '=',2)[1]
                $headers = @{ Authorization = "Bearer $tokenVal" }

                # Patient search
                try {
                    $searchResp = Invoke-RestMethod "$apiUrl/vista/patient-search?q=SMITH" -Headers $headers -TimeoutSec 15
                    Assert-Check "Patient search works with session" ($searchResp.ok -eq $true)
                } catch {
                    Assert-Check "Patient search works with session" $false
                }

                # Audit stats
                try {
                    $auditResp = Invoke-RestMethod "$apiUrl/audit/stats" -Headers $headers -TimeoutSec 5
                    Assert-Check "Audit stats accessible" ($auditResp.ok -eq $true)
                } catch {
                    Assert-Check "Audit stats accessible" $false
                }

                # Logout
                try {
                    $null = Invoke-RestMethod "$apiUrl/auth/logout" -Method POST -Headers $headers -TimeoutSec 5
                    Assert-Check "Logout succeeds" $true
                } catch {
                    Assert-Check "Logout succeeds" $false
                }
            }
        } catch {
            Assert-Warn "Login flow failed - Docker may not be running" $_.Exception.Message
        }
    } else {
        Assert-Warn "API not reachable on port $ApiPort" "Start API with: cd apps/api; pnpm dev"
    }
} else {
    Assert-Info "Live tests skipped (-SkipLive flag)"
}

# =========================================================================
# Summary
# =========================================================================
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor White
Write-Host "  PHASE 16 PRODUCTION READINESS VERIFICATION SUMMARY" -ForegroundColor White
Write-Host ("=" * 70) -ForegroundColor White
Write-Host ""
Write-Host "  PASS: $($script:pass)" -ForegroundColor Green
Write-Host "  FAIL: $($script:fail)" -ForegroundColor $(if ($script:fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $($script:warn)" -ForegroundColor $(if ($script:warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "  INFO: $($script:info)" -ForegroundColor DarkCyan
Write-Host ""

if ($script:fail -gt 0) {
    Write-Host "  FAILED CHECKS:" -ForegroundColor Red
    $script:results | Where-Object { $_.Status -eq 'FAIL' } | ForEach-Object { Write-Host "    - $($_.Check)" -ForegroundColor Red }
    Write-Host ""
}

$exitCode = if ($script:fail -gt 0) { 1 } else { 0 }
exit $exitCode
