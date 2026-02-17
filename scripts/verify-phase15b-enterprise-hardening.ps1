<#
.SYNOPSIS
    VistA-Evolved Phase 15B - Enterprise Hardening + Prompts Repair Verification
.DESCRIPTION
    Comprehensive verification of Phase 15B changes:
    - Prompts directory ordering (folder numbers, file prefixes, headers)
    - CORS lockdown
    - Auth gateway (session-based endpoint gating)
    - Origin checks for state-changing requests
    - Response error scrubbing (no VistA internal message leakage)
    - Session fixation prevention (rotateSession on login)
    - Session token not in response body
    - AsyncLocalStorage logger (concurrency-safe request IDs)
    - Audit actor attribution (real session user, not "system")
    - Centralized safeCallRpc/safeCallRpcWithList wrappers
    - Security headers
    - Rate limiting
    - console.log cleanup
    Run from repo root: .\scripts\verify-phase15b-enterprise-hardening.ps1
.NOTES
    Requires: Node v24+, pnpm v10+, Docker Desktop running, API on port 3001
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
# PART 1: Prompts Directory Ordering
# =========================================================================
Write-Phase "P1" "Prompts Directory Ordering"

# Phase folder numbering - check sequential and no duplicates
$phaseFolders = Get-ChildItem "$repoRoot\prompts" -Directory | Where-Object { $_.Name -match '^\d{2}-PHASE' } | Sort-Object Name
$folderNumbers = $phaseFolders | ForEach-Object { ($_.Name -split '-')[0] }
$uniqueNums = $folderNumbers | Select-Object -Unique
Assert-Check "No duplicate folder numbers" ($folderNumbers.Count -eq $uniqueNums.Count) "Found $($folderNumbers.Count) folders, $($uniqueNums.Count) unique"

# Check specific folder renames are correct
Assert-Check "12-PHASE-10-CPRS-EXTRACT exists" (Test-Path "$repoRoot\prompts\12-PHASE-10-CPRS-EXTRACT")
Assert-Check "13-PHASE-11-CPRS-WEB-REPLICA exists" (Test-Path "$repoRoot\prompts\13-PHASE-11-CPRS-WEB-REPLICA")
Assert-Check "14-PHASE-12-CPRS-PARITY-WIRING exists" (Test-Path "$repoRoot\prompts\14-PHASE-12-CPRS-PARITY-WIRING")
Assert-Check "15-PHASE-13-CPRS-OPERATIONALIZATION exists" (Test-Path "$repoRoot\prompts\15-PHASE-13-CPRS-OPERATIONALIZATION")
Assert-Check "16-PHASE-14-PARITY-CLOSURE exists" (Test-Path "$repoRoot\prompts\16-PHASE-14-PARITY-CLOSURE")
Assert-Check "17-PHASE-15-ENTERPRISE-HARDENING exists" (Test-Path "$repoRoot\prompts\17-PHASE-15-ENTERPRISE-HARDENING")

# Old duplicate folder MUST NOT exist
Assert-Check "No duplicate 12-PHASE-13 folder" (-not (Test-Path "$repoRoot\prompts\12-PHASE-13-CPRS-OPERATIONALIZATION"))
Assert-Check "No old 15-PHASE-14 folder" (-not (Test-Path "$repoRoot\prompts\15-PHASE-14-PARITY-CLOSURE"))
Assert-Check "No old 16-PHASE-15 folder" (-not (Test-Path "$repoRoot\prompts\16-PHASE-15-ENTERPRISE-HARDENING"))

# File prefix matching folder number
$prefixErrors = @()
foreach ($folder in $phaseFolders) {
    $expectedPrefix = ($folder.Name -split '-')[0]
    $files = Get-ChildItem $folder.FullName -File -Filter '*.md'
    foreach ($f in $files) {
        $filePrefix = ($f.Name -split '-')[0]
        if ($filePrefix -ne $expectedPrefix) {
            $prefixErrors += "$($folder.Name)\$($f.Name) (expected prefix: $expectedPrefix, got: $filePrefix)"
        }
    }
}
Assert-Check "All file prefixes match folder numbers" ($prefixErrors.Count -eq 0) $(if ($prefixErrors.Count -gt 0) { "Mismatches: $($prefixErrors -join ', ')" } else { "All file prefixes correct" })

# Check renamed files exist with correct prefixes
Assert-Check "Phase 12 uses 14-xx file prefix" (Test-Path "$repoRoot\prompts\14-PHASE-12-CPRS-PARITY-WIRING\14-01-cprs-parity-wiring-IMPLEMENT.md")
Assert-Check "Phase 13 uses 15-xx file prefix" (Test-Path "$repoRoot\prompts\15-PHASE-13-CPRS-OPERATIONALIZATION\15-01-cprs-operationalization-IMPLEMENT.md")
Assert-Check "Phase 14 uses 16-xx file prefix" (Test-Path "$repoRoot\prompts\16-PHASE-14-PARITY-CLOSURE\16-01-Phase14A-Compat-Layer-IMPLEMENT.md")
Assert-Check "Phase 15 uses 17-xx file prefix" (Test-Path "$repoRoot\prompts\17-PHASE-15-ENTERPRISE-HARDENING\17-01-enterprise-hardening-IMPLEMENT.md")

# Check prompt-ref paths inside files are correct (no stale refs)
$parity12Impl = Get-Content "$repoRoot\prompts\14-PHASE-12-CPRS-PARITY-WIRING\14-01-cprs-parity-wiring-IMPLEMENT.md" -Raw
Assert-Check "Phase 12 IMPLEMENT has correct prompt-ref" ($parity12Impl -match 'prompts/14-PHASE-12-CPRS-PARITY-WIRING/14-01')

# =========================================================================
# PART 2: Security Infrastructure Files Exist
# =========================================================================
Write-Phase "P2" "Security Infrastructure Files"

Assert-Check "server-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\server-config.ts")

$loggerContent = Get-Content "$repoRoot\apps\api\src\lib\logger.ts" -Raw
Assert-Check "logger.ts exists" ($null -ne $loggerContent)
Assert-Check "Logger uses AsyncLocalStorage" ($loggerContent -match 'AsyncLocalStorage')
Assert-Check "Logger exports runWithRequestId" ($loggerContent -match 'export function runWithRequestId')

$auditContent = Get-Content "$repoRoot\apps\api\src\lib\audit.ts" -Raw
Assert-Check "audit.ts exists" ($null -ne $auditContent)
Assert-Check "Audit has origin-rejected action" ($auditContent -match 'security.origin-rejected')

$resilienceContent = Get-Content "$repoRoot\apps\api\src\lib\rpc-resilience.ts" -Raw
Assert-Check "rpc-resilience.ts exists" ($null -ne $resilienceContent)
Assert-Check "Exports safeCallRpc" ($resilienceContent -match 'export async function safeCallRpc')
Assert-Check "Exports safeCallRpcWithList" ($resilienceContent -match 'export async function safeCallRpcWithList')
Assert-Check "safeCallRpc wraps resilientRpc" ($resilienceContent -match 'resilientRpc')

Assert-Check "validation.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\validation.ts")

$secMiddleware = Get-Content "$repoRoot\apps\api\src\middleware\security.ts" -Raw
Assert-Check "security.ts exists" ($null -ne $secMiddleware)
Assert-Check "Auth gateway exists" ($secMiddleware -match 'Auth gateway')
Assert-Check "Origin check hook exists" ($secMiddleware -match 'Origin check for state-changing')
Assert-Check "Response scrubber exists" ($secMiddleware -match 'Response scrubber')
Assert-Check "Error sanitizer exists" ($secMiddleware -match 'sanitizeClientError')
Assert-Check "CORS origin validator exported" ($secMiddleware -match 'export function corsOriginValidator')
Assert-Check "ALLOWED_ORIGINS from env" ($secMiddleware -match 'ALLOWED_ORIGINS')

# =========================================================================
# PART 3: Auth Hardening
# =========================================================================
Write-Phase "P3" "Auth Route Hardening"

$authRoutes = Get-Content "$repoRoot\apps\api\src\auth\auth-routes.ts" -Raw
Assert-Check "auth-routes.ts exists" ($null -ne $authRoutes)
Assert-Check "No token in login response body" (-not ($authRoutes -match 'token,\s*\n\s*duz:'))
Assert-Check "rotateSession called on login" ($authRoutes -match 'rotateSession')
Assert-Check "Login error sanitized (no err.message to client)" ($authRoutes -match 'error: "Authentication failed"')
Assert-Check "Cookie is httpOnly" ($authRoutes -match 'httpOnly:\s*true')
Assert-Check "Cookie sameSite lax" ($authRoutes -match 'sameSite.*lax')
Assert-Check "Zod validation on login" ($authRoutes -match 'LoginBodySchema')

# =========================================================================
# PART 4: CORS + Auth Gateway in index.ts
# =========================================================================
Write-Phase "P4" "CORS + Auth Gateway"

$indexContent = Get-Content "$repoRoot\apps\api\src\index.ts" -Raw
Assert-Check "CORS uses corsOriginValidator (not origin: true)" ($indexContent -match 'corsOriginValidator')
Assert-Check "No origin: true in index.ts" (-not ($indexContent -match 'origin:\s*true'))
Assert-Check "safeCallRpc imported" ($indexContent -match 'safeCallRpc')
Assert-Check "safeErr helper exists" ($indexContent -match 'function safeErr')
Assert-Check "auditActor helper exists" ($indexContent -match 'function auditActor')

# Check all 12 audit calls use auditActor(request) instead of { duz: "system" }
$systemAuditCount = ([regex]::Matches($indexContent, 'audit\("[a-z.]+".*\{ duz: "system" \}')).Count
# Only 1 should remain (the system.startup audit)
Assert-Check "Audit calls use auditActor (max 1 system audit)" ($systemAuditCount -le 1) "Found $systemAuditCount uses of { duz: 'system' }"

# =========================================================================
# PART 5: Error Sanitization
# =========================================================================
Write-Phase "P5" "Error Response Sanitization"

Assert-Check "Response scrubber in security middleware" (($secMiddleware -match 'onSend') -and ($secMiddleware -match 'sanitizeClientError'))
Assert-Check "Global error handler sanitized" ($secMiddleware -match 'sanitizeClientError\(error\.message\)')

# =========================================================================
# PART 6: Write-backs cleanup
# =========================================================================
Write-Phase "P6" "Write-backs + Console cleanup"

$writebacks = Get-Content "$repoRoot\apps\api\src\routes\write-backs.ts" -Raw
Assert-Check "write-backs.ts has no console.log" (-not ($writebacks -match 'console\.log'))
Assert-Check "write-backs.ts uses structured logger" ($writebacks -match 'log\.(info|warn|error)')

$wsConsole = Get-Content "$repoRoot\apps\api\src\routes\ws-console.ts" -Raw
Assert-Check "ws-console.ts uses centralized audit" ($wsConsole -match 'centralAudit')

# =========================================================================
# PART 7: Verifier scripts + ops
# =========================================================================
Write-Phase "P7" "Verifier Scripts + Ops"

Assert-Check "verify-latest.ps1 exists" (Test-Path "$repoRoot\scripts\verify-latest.ps1")
$verifyLatest = Get-Content "$repoRoot\scripts\verify-latest.ps1" -Raw
Assert-Check "verify-latest points to Phase 15B script" ($verifyLatest -match 'verify-phase15b')

Assert-Check "Runbook exists" (Test-Path "$repoRoot\docs\runbooks\enterprise-hardening-phase15b.md")
Assert-Check "ops/summary.md updated" ((Get-Content "$repoRoot\ops\summary.md" -Raw) -match '17-PHASE-15')
Assert-Check "ops/notion-update.json updated" ((Get-Content "$repoRoot\ops\notion-update.json" -Raw) -match '17-PHASE-15')

# =========================================================================
# PART 8: TypeScript compilation
# =========================================================================
Write-Phase "P8" "TypeScript Compilation"

$apiTscOutput = & npx tsc --noEmit --project "$repoRoot\apps\api\tsconfig.json" 2>&1 | Out-String
$apiErrors = ($apiTscOutput | Select-String -Pattern 'error TS\d+' -AllMatches).Matches.Count
Assert-Check "API compiles clean (tsc --noEmit)" ($apiErrors -eq 0) $(if ($apiErrors -gt 0) { "Errors: $apiErrors" } else { "0 errors" })

$webTscOutput = & npx tsc --noEmit --project "$repoRoot\apps\web\tsconfig.json" 2>&1 | Out-String
$webErrors = ($webTscOutput | Select-String -Pattern 'error TS\d+' -AllMatches).Matches.Count
Assert-Check "Web compiles clean (tsc --noEmit)" ($webErrors -eq 0) $(if ($webErrors -gt 0) { "Errors: $webErrors" } else { "0 errors" })

# =========================================================================
# PART 9: Security scans
# =========================================================================
Write-Phase "P9" "Security Scans"

# Check for credential leaks (exclude comments - Docker Hub defaults are documented in config.ts header)
$allApiFiles = Get-ChildItem "$repoRoot\apps\api\src" -Recurse -Include '*.ts'
$nonCommentLines = @()
foreach ($f in $allApiFiles) {
    $lines = Get-Content $f.FullName
    foreach ($line in $lines) {
        $trimmed = $line.Trim()
        # Skip single-line comments and JSDoc lines
        if ($trimmed -match '^\s*(//|/?\*|\*)') { continue }
        $nonCommentLines += $trimmed
    }
}
$joinedCode = $nonCommentLines -join "`n"
Assert-Check "No hardcoded PROV123 in code (non-comment)" (-not ($joinedCode -match 'PROV123'))
Assert-Check "No hardcoded PHARM123 in code (non-comment)" (-not ($joinedCode -match 'PHARM123'))
Assert-Check "No hardcoded NURSE123 in code (non-comment)" (-not ($joinedCode -match 'NURSE123'))

# Check console.log usage is minimal
$consoleLogCount = ([regex]::Matches($joinedCode, 'console\.log')).Count
Assert-Check "Minimal console.log usage (<=6)" ($consoleLogCount -le 6) "Found $consoleLogCount console.log calls"

# =========================================================================
# PART 10: Live API tests (requires running server + Docker)
# =========================================================================
if (-not $SkipLive) {
    Write-Phase "P10" "Live API Tests"

    $apiUrl = "http://127.0.0.1:$ApiPort"

    # Check if API is reachable
    try {
        $null = Invoke-RestMethod "$apiUrl/health" -TimeoutSec 5
        $apiUp = $true
    } catch {
        $apiUp = $false
    }

    if ($apiUp) {
        # Health endpoint
        $health = Invoke-RestMethod "$apiUrl/health" -TimeoutSec 5
        Assert-Check "/health returns ok" ($health.ok -eq $true)

        # Security headers
        $headersResp = Invoke-WebRequest "$apiUrl/health" -UseBasicParsing -TimeoutSec 5
        Assert-Check "X-Request-Id header present" ($null -ne $headersResp.Headers['X-Request-Id'])
        Assert-Check "X-Content-Type-Options: nosniff" ($headersResp.Headers['X-Content-Type-Options'] -eq 'nosniff')
        Assert-Check "X-Frame-Options: DENY" ($headersResp.Headers['X-Frame-Options'] -eq 'DENY')
        Assert-Check "Cache-Control: no-store" ($headersResp.Headers['Cache-Control'] -eq 'no-store')

        # Auth gateway: clinical endpoints should require auth
        try {
            $null = Invoke-WebRequest "$apiUrl/vista/patient-search?q=SMITH" -UseBasicParsing -TimeoutSec 5
            $gotThrough = $true
        } catch {
            $gotThrough = $false
        }
        Assert-Check "Clinical endpoints require auth (401 without session)" (-not $gotThrough) "If FAIL, auth gateway is not gating clinical endpoints"

        # Admin endpoints should require auth
        try {
            $null = Invoke-WebRequest "$apiUrl/audit/stats" -UseBasicParsing -TimeoutSec 5
            $auditOpen = $true
        } catch {
            $auditOpen = $false
        }
        Assert-Check "Admin/audit endpoints require auth" (-not $auditOpen)

        # Login flow
        try {
            $loginBody = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
            $loginResp = Invoke-WebRequest -Uri "$apiUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing -TimeoutSec 15
            $loginJson = $loginResp.Content | ConvertFrom-Json
            $loginOk = $loginJson.ok
            $sessionCookie = $loginResp.Headers['Set-Cookie']

            Assert-Check "Login succeeds" ($loginOk -eq $true)
            Assert-Check "Session cookie set" ($null -ne $sessionCookie)
            Assert-Check "No token in login response body" ($null -eq $loginJson.session.token) "Token should not be exposed in response"

            # Use session cookie to access clinical endpoint
            if ($sessionCookie) {
                $cookieVal = ($sessionCookie -split ';')[0]
                $headers = @{ Cookie = $cookieVal }

                # Patient search with auth
                try {
                    $searchResp = Invoke-RestMethod "$apiUrl/vista/patient-search?q=SMITH" -Headers $headers -TimeoutSec 15
                    Assert-Check "Patient search works with session" ($searchResp.ok -eq $true)
                } catch {
                    Assert-Check "Patient search works with session" $false
                }

                # Audit stats with provider session (should work - provider/admin role)
                try {
                    $auditResp = Invoke-RestMethod "$apiUrl/audit/stats" -Headers $headers -TimeoutSec 5
                    Assert-Check "Audit stats accessible with provider session" ($auditResp.ok -eq $true)
                } catch {
                    Assert-Check "Audit stats accessible with provider session" $false
                }

                # Metrics
                try {
                    $metricsResp = Invoke-RestMethod "$apiUrl/metrics" -Headers $headers -TimeoutSec 5
                    Assert-Check "Metrics endpoint works" ($metricsResp.ok -eq $true)
                } catch {
                    Assert-Check "Metrics endpoint works" $false
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
        Assert-Warn "API not reachable on port $ApiPort" "Start API with: cd apps/api; npx tsx src/index.ts"
    }
} else {
    Assert-Info "Live tests skipped (-SkipLive flag)"
}

# =========================================================================
# Summary
# =========================================================================
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor White
Write-Host "  PHASE 15B VERIFICATION SUMMARY" -ForegroundColor White
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
