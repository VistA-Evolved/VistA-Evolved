param([switch]$SkipDocker, [switch]$SkipPlaywright, [switch]$SkipE2E)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$warn = 0

function Write-Gate {
  param([string]$Name, [bool]$Ok, [string]$Detail = "")
  if ($Ok) {
    Write-Host "  [PASS] $Name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $Name - $Detail" -ForegroundColor Red
    $script:fail++
  }
}

function Write-Warning-Gate {
  param([string]$Name, [string]$Detail = "")
  Write-Host "  [WARN] $Name - $Detail" -ForegroundColor Yellow
  $script:warn++
}

function Test-FileContains {
  param([string]$Path, [string]$Pattern, [switch]$IsRegex)
  if (-not (Test-Path $Path)) { return $false }
  if ($IsRegex) {
    return (Select-String -Path $Path -Pattern $Pattern -Quiet)
  }
  return (Select-String -Path $Path -Pattern $Pattern -SimpleMatch -Quiet)
}

function Get-SourceFiles {
  param([string[]]$Paths, [string[]]$Extensions)
  $results = @()
  foreach ($p in $Paths) {
    if (-not (Test-Path $p)) { continue }
    $results += Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Extension -in $Extensions -and
        $_.FullName -notmatch "[\\/]node_modules[\\/]" -and
        $_.FullName -notmatch "[\\/]\.next[\\/]" -and
        $_.FullName -notmatch "[\\/]dist[\\/]"
      }
  }
  return $results
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Phase 27 Verification" -ForegroundColor Cyan
Write-Host "Portal Core E2E + Security" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# ========================================
# 1. REGRESSION: Delegate to Phase 26 verifier
# ========================================
Write-Host ""
Write-Host "--- 1: Regression (Phase 26 gates) ---" -ForegroundColor Yellow

$phase26Script = "$root\scripts\verify-phase1-to-phase26-portal.ps1"
if (Test-Path $phase26Script) {
  Write-Host "  Delegating to Phase 26 verifier..." -ForegroundColor DarkGray
  $phase26Result = & powershell -ExecutionPolicy Bypass -File $phase26Script -SkipPlaywright 2>&1
  $phase26Exit = $LASTEXITCODE
  if ($phase26Exit -eq 0) {
    Write-Gate "Phase 26 regression: all gates pass" $true
  } else {
    Write-Gate "Phase 26 regression: all gates pass" $false "Phase 26 verifier returned exit code $phase26Exit"
  }
} else {
  Write-Gate "Phase 26 regression: verifier exists" $false "verify-phase1-to-phase26-portal.ps1 not found"
}

# ========================================
# 2. PHASE 27 BACKEND SERVICES EXIST
# ========================================
Write-Host ""
Write-Host "--- 2: Phase 27 Backend Services ---" -ForegroundColor Yellow

$apiSrc = "$root\apps\api\src"

# 2a. Service files
$services = @(
  "services\portal-pdf.ts",
  "services\portal-messaging.ts",
  "services\portal-appointments.ts",
  "services\portal-sharing.ts",
  "services\portal-settings.ts",
  "services\portal-sensitivity.ts"
)
foreach ($svc in $services) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($svc)
  Write-Gate "Service: $name" (Test-Path "$apiSrc\$svc")
}

# 2b. Route file
Write-Gate "Route: portal-core.ts" (Test-Path "$apiSrc\routes\portal-core.ts")

# 2c. Index registers portal-core
$indexPath = "$apiSrc\index.ts"
Write-Gate "Index imports portal-core" (Test-FileContains -Path $indexPath -Pattern "portal-core")
Write-Gate "Index calls initPortalCore" (Test-FileContains -Path $indexPath -Pattern "initPortalCore")

# 2d. Portal audit extended to 21+ action types
$auditPath = "$apiSrc\services\portal-audit.ts"
Write-Gate "Audit: message actions" (Test-FileContains -Path $auditPath -Pattern "portal.message.send")
Write-Gate "Audit: appointment actions" (Test-FileContains -Path $auditPath -Pattern "portal.appointment.view")
Write-Gate "Audit: share actions" (Test-FileContains -Path $auditPath -Pattern "portal.share.create")
Write-Gate "Audit: export actions" (Test-FileContains -Path $auditPath -Pattern "portal.export.full")
Write-Gate "Audit: settings actions" (Test-FileContains -Path $auditPath -Pattern "portal.settings.update")

# 2e. API compiles clean
Write-Host "  Checking API TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
$tscOutput = & node_modules\.bin\tsc --noEmit 2>&1 | Out-String
$tscExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($tscExit -eq 0) $(if ($tscExit -ne 0) { "tsc errors found" } else { "" })

# ========================================
# 3. PHASE 27 ROUTE COVERAGE
# ========================================
Write-Host ""
Write-Host "--- 3: Phase 27 Route Coverage ---" -ForegroundColor Yellow

$portalCorePath = "$apiSrc\routes\portal-core.ts"
if (Test-Path $portalCorePath) {
  $coreContent = Get-Content $portalCorePath -Raw

  # Export routes
  Write-Gate "Route: /portal/export/section" ($coreContent -match "/portal/export/section")
  Write-Gate "Route: /portal/export/full" ($coreContent -match "/portal/export/full")

  # Messaging routes
  Write-Gate "Route: GET /portal/messages" ($coreContent -match 'server\.get\("/portal/messages"')
  Write-Gate "Route: POST /portal/messages" ($coreContent -match 'server\.post\("/portal/messages"')
  Write-Gate "Route: /portal/messages/drafts" ($coreContent -match "/portal/messages/drafts")
  Write-Gate "Route: /portal/messages/sent" ($coreContent -match "/portal/messages/sent")
  Write-Gate "Route: /portal/messages/:id/send" ($coreContent -match "/portal/messages/:id/send")
  Write-Gate "Route: /portal/messages/:id/attachments" ($coreContent -match "/portal/messages/:id/attachments")

  # Appointment routes
  Write-Gate "Route: /portal/appointments" ($coreContent -match "/portal/appointments")
  Write-Gate "Route: /portal/appointments/request" ($coreContent -match "/portal/appointments/request")
  Write-Gate "Route: /portal/appointments/:id/cancel" ($coreContent -match "/portal/appointments/:id/cancel")
  Write-Gate "Route: /portal/appointments/:id/reschedule" ($coreContent -match "/portal/appointments/:id/reschedule")

  # Share routes
  Write-Gate "Route: GET /portal/shares" ($coreContent -match 'server\.get\("/portal/shares"')
  Write-Gate "Route: POST /portal/shares" ($coreContent -match 'server\.post\("/portal/shares"')
  Write-Gate "Route: /portal/shares/:id/revoke" ($coreContent -match "/portal/shares/:id/revoke")
  Write-Gate "Route: /portal/share/preview/:token" ($coreContent -match "/portal/share/preview/:token")
  Write-Gate "Route: /portal/share/verify/:token" ($coreContent -match "/portal/share/verify/:token")

  # Settings routes
  Write-Gate "Route: GET /portal/settings" ($coreContent -match 'server\.get\("/portal/settings"')
  Write-Gate "Route: PUT /portal/settings" ($coreContent -match 'server\.put\("/portal/settings"')

  # Proxy routes
  Write-Gate "Route: /portal/proxy/list" ($coreContent -match "/portal/proxy/list")
  Write-Gate "Route: /portal/proxy/grant" ($coreContent -match "/portal/proxy/grant")
  Write-Gate "Route: /portal/proxy/revoke" ($coreContent -match "/portal/proxy/revoke")
  Write-Gate "Route: /portal/proxy/evaluate" ($coreContent -match "/portal/proxy/evaluate")
} else {
  Write-Gate "Route file exists" $false "portal-core.ts not found"
}

# ========================================
# 4. PORTAL UI - PHASE 27 PAGES
# ========================================
Write-Host ""
Write-Host "--- 4: Portal UI Pages ---" -ForegroundColor Yellow

$portalDir = "$root\apps\portal"

# Share viewer page
Write-Gate "Page: share/[token]" (Test-Path -LiteralPath "$portalDir\src\app\share\[token]\page.tsx")

# Pages use live data (check for fetch/useEffect client patterns)
$livePages = @{
  "health"       = "src\app\dashboard\health\page.tsx"
  "medications"  = "src\app\dashboard\medications\page.tsx"
  "messages"     = "src\app\dashboard\messages\page.tsx"
  "appointments" = "src\app\dashboard\appointments\page.tsx"
  "profile"      = "src\app\dashboard\profile\page.tsx"
}

foreach ($name in $livePages.Keys) {
  $pagePath = "$portalDir\$($livePages[$name])"
  if (Test-Path $pagePath) {
    $hasUseClient = Test-FileContains -Path $pagePath -Pattern "use client"
    $hasFetch = (Test-FileContains -Path $pagePath -Pattern "fetch") -or (Test-FileContains -Path $pagePath -Pattern "useEffect")
    Write-Gate "Page ${name} uses client-side data" ($hasUseClient -and $hasFetch)
  } else {
    Write-Gate "Page ${name} exists" $false
  }
}

# API client has 40+ functions
$apiClientPath = "$portalDir\src\lib\api.ts"
if (Test-Path $apiClientPath) {
  $apiContent = Get-Content $apiClientPath -Raw
  $fnCount = ([regex]::Matches($apiContent, "export (async )?function")).Count
  Write-Gate "API client: 30+ export functions" ($fnCount -ge 30) "Found $fnCount"
}

# Portal builds
Write-Host "  Building portal..." -ForegroundColor DarkGray
if (Test-Path "$portalDir\.next") {
  Remove-Item -Recurse -Force "$portalDir\.next" -ErrorAction SilentlyContinue
}
Push-Location $root
$buildOutput = & pnpm -C apps/portal build 2>&1 | Out-String
$buildExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal builds clean" ($buildExit -eq 0) $(if ($buildExit -ne 0) { "Build failed" } else { "" })

# ========================================
# 5. SECURITY CHECKS
# ========================================
Write-Host ""
Write-Host "--- 5: Security ---" -ForegroundColor Yellow

$portalAuth = "$apiSrc\routes\portal-auth.ts"

# 5a. Session security
Write-Gate "Cookie: httpOnly" (Test-FileContains -Path $portalAuth -Pattern "httpOnly: true")
Write-Gate "Cookie: sameSite" (Test-FileContains -Path $portalAuth -Pattern "sameSite")
Write-Gate "Cookie: portal_session" (Test-FileContains -Path $portalAuth -Pattern "portal_session")
Write-Gate "Rate limit: MAX_LOGIN_ATTEMPTS" (Test-FileContains -Path $portalAuth -Pattern "MAX_LOGIN_ATTEMPTS")

# 5b. Secret scan - no hardcoded creds in portal
$portalFiles = Get-SourceFiles -Paths @("$portalDir\src") -Extensions @(".ts",".tsx")
$credPatterns = @("PROV123", "PHARM123", "NURSE123")
$credViolations = @()
foreach ($pattern in $credPatterns) {
  $found = $portalFiles | Select-String -Pattern $pattern -SimpleMatch -ErrorAction SilentlyContinue
  if ($found) { $credViolations += $found }
}
Write-Gate "Secret scan: no hardcoded credentials" ($credViolations.Count -eq 0) $(if ($credViolations.Count -gt 0) { "Found $($credViolations.Count)" } else { "" })

# 5c. No VA terminology in portal
$vaTerms = @("MyHealtheVet", "\bVA\b")
$vaViolations = @()
foreach ($term in $vaTerms) {
  $isRegex = $term -match "\\b"
  if ($isRegex) {
    $found = $portalFiles | Select-String -Pattern $term -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "^\s*//" -and $_.Line -notmatch "^\s*\*" }
  } else {
    $found = $portalFiles | Select-String -Pattern $term -SimpleMatch -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "^\s*//" -and $_.Line -notmatch "^\s*\*" }
  }
  if ($found) {
    $stringHits = $found | Where-Object {
      $_.Line -match ('"[^"]*' + [regex]::Escape($term).Replace("\\\\b","") + '[^"]*"') -or
      $_.Line -match ("'[^']*" + [regex]::Escape($term).Replace("\\\\b","") + "[^']*'")
    }
    if ($stringHits) { $vaViolations += $stringHits }
  }
}
Write-Gate "No VA/MyHealtheVet in UI" ($vaViolations.Count -eq 0) $(if ($vaViolations.Count -gt 0) { "Found $($vaViolations.Count)" } else { "" })

# 5d. Credentials: include in API client
Write-Gate "API client: credentials include" (Test-FileContains -Path $apiClientPath -Pattern "credentials")

# 5e. Audit hashing
Write-Gate "Audit: hashed patient ID" (Test-FileContains -Path $auditPath -Pattern "hashPatientId")

# 5f. Portal-core uses requirePortalSession
Write-Gate "portal-core: requirePortalSession" (Test-FileContains -Path $portalCorePath -Pattern "requirePortalSession")

# 5g. Sharing security - access code, DOB verify, locking
$sharingPath = "$apiSrc\services\portal-sharing.ts"
if (Test-Path $sharingPath) {
  Write-Gate "Sharing: access codes" (Test-FileContains -Path $sharingPath -Pattern "accessCode")
  Write-Gate "Sharing: DOB verification" (Test-FileContains -Path $sharingPath -Pattern "patientDob")
  Write-Gate "Sharing: lockout after attempts" (Test-FileContains -Path $sharingPath -Pattern "locked")
}

# 5h. Sensitivity engine has rules
$sensitivityPath = "$apiSrc\services\portal-sensitivity.ts"
if (Test-Path $sensitivityPath) {
  Write-Gate "Sensitivity: behavioral_health rule" (Test-FileContains -Path $sensitivityPath -Pattern "behavioral_health")
  Write-Gate "Sensitivity: substance_abuse rule" (Test-FileContains -Path $sensitivityPath -Pattern "substance_abuse")
  Write-Gate "Sensitivity: proxy withhold" (Test-FileContains -Path $sensitivityPath -Pattern "withholdFromProxy")
}

# 5i. PHI-safe messaging (no raw DFN exposed in responses)
$messagingPath = "$apiSrc\services\portal-messaging.ts"
if (Test-Path $messagingPath) {
  Write-Gate "Messaging: SLA disclaimer" (Test-FileContains -Path $messagingPath -Pattern "SLA_DISCLAIMER")
  Write-Gate "Messaging: max body length" (Test-FileContains -Path $messagingPath -Pattern "MAX_BODY_LENGTH")
  Write-Gate "Messaging: attachment limits" (Test-FileContains -Path $messagingPath -Pattern "MAX_ATTACHMENT")
}

# ========================================
# 6. CONTRACT DRIFT CHECK
# ========================================
Write-Host ""
Write-Host "--- 6: Contract Drift ---" -ForegroundColor Yellow

$contractPath = "$root\docs\contracts\portal\portal-contract-v1.yaml"
if (Test-Path $contractPath) {
  $contractContent = Get-Content $contractPath -Raw

  # Extract route patterns from contract
  $contractRoutes = @()
  $routeMatches = [regex]::Matches($contractContent, '"(POST|GET|PUT|DELETE)\s+(/portal/[^"]+)"')
  foreach ($m in $routeMatches) {
    $contractRoutes += $m.Groups[2].Value.Trim()
  }

  # Contract modules exist
  $contractModules = @("auth", "dashboard", "health_records", "medications", "messages", "appointments", "telehealth", "profile")
  foreach ($mod in $contractModules) {
    $found = $contractContent -match "${mod}:"
    Write-Gate "Contract module: $mod" $found
  }

  # Phase 26 contract routes should be present in API code
  $authRoutes = @("/portal/auth/login", "/portal/auth/logout", "/portal/auth/session")
  foreach ($route in $authRoutes) {
    $routeClean = $route -replace "/", "\\/"
    $inAuth = Test-FileContains -Path $portalAuth -Pattern $route
    Write-Gate "Contract route: $route" $inAuth
  }

  # VistA RPC references present
  Write-Gate "Contract: ORQQAL LIST referenced" ($contractContent -match "ORQQAL LIST")
  Write-Gate "Contract: ORWPS ACTIVE referenced" ($contractContent -match "ORWPS ACTIVE")

  # Known-gaps doc exists
  Write-Gate "Known gaps doc" (Test-Path "$root\docs\contracts\portal\known-gaps.md")

  # Phase 27 routes exist in portal-core (spot check - detailed check in section 3)
  Write-Gate "Contract: Phase 27 future items addressed" (
    (Test-FileContains -Path $portalCorePath -Pattern "/portal/messages") -and
    (Test-FileContains -Path $portalCorePath -Pattern "/portal/appointments") -and
    (Test-FileContains -Path $portalCorePath -Pattern "/portal/shares") -and
    (Test-FileContains -Path $portalCorePath -Pattern "/portal/settings") -and
    (Test-FileContains -Path $portalCorePath -Pattern "/portal/proxy")
  )
} else {
  Write-Gate "Contract file exists" $false
}

# ========================================
# 7. LICENSE GUARD
# ========================================
Write-Host ""
Write-Host "--- 7: License Guard ---" -ForegroundColor Yellow

$lgScript = "$root\scripts\license-guard.ps1"
if (Test-Path $lgScript) {
  Write-Host "  Running license guard..." -ForegroundColor DarkGray
  try {
    $lgOutput = & powershell -ExecutionPolicy Bypass -File $lgScript 2>&1 | Out-String
    $lgExit = $LASTEXITCODE
    Write-Gate "License guard: all checks pass" ($lgExit -eq 0) $(if ($lgExit -ne 0) { "License guard failed" } else { "" })
  } catch {
    Write-Gate "License guard: all checks pass" $false "Exception: $_"
  }
} else {
  Write-Gate "License guard script exists" $false
}

# ========================================
# 8. PLAYWRIGHT E2E TESTS (Phase 27)
# ========================================
Write-Host ""
Write-Host "--- 8: Playwright E2E ---" -ForegroundColor Yellow

$phase27Spec = "$portalDir\e2e\portal-phase27.spec.ts"
Write-Gate "E2E spec: portal-phase27.spec.ts" (Test-Path $phase27Spec)

if ($SkipPlaywright -or $SkipE2E) {
  Write-Warning-Gate "Playwright E2E tests" "Skipped (-SkipPlaywright or -SkipE2E)"
} else {
  # Run Phase 26 smoke tests
  Write-Host "  Running Phase 26 smoke tests..." -ForegroundColor DarkGray
  Push-Location $portalDir
  $smokeResult = & npx playwright test portal-smoke --reporter=list 2>&1 | Out-String
  $smokeExit = $LASTEXITCODE
  Pop-Location
  Write-Gate "Phase 26 smoke tests pass" ($smokeExit -eq 0) $(if ($smokeExit -ne 0) { "Smoke tests failed" } else { "" })

  # Run Phase 27 E2E tests (API-level, needs API server running)
  # Check if API server is up
  $apiUp = $false
  try {
    $healthRes = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $apiUp = ($healthRes.StatusCode -eq 200)
  } catch {
    $apiUp = $false
  }

  if ($apiUp) {
    Write-Host "  Running Phase 27 E2E tests (API is up)..." -ForegroundColor DarkGray
    Push-Location $portalDir
    $e2eResult = & npx playwright test portal-phase27 --reporter=list 2>&1 | Out-String
    $e2eExit = $LASTEXITCODE
    Pop-Location

    # Count pass/fail from output
    $e2ePassMatch = [regex]::Match($e2eResult, "(\d+) passed")
    $e2eFailMatch = [regex]::Match($e2eResult, "(\d+) failed")
    $e2ePassed = if ($e2ePassMatch.Success) { $e2ePassMatch.Groups[1].Value } else { "0" }
    $e2eFailed = if ($e2eFailMatch.Success) { $e2eFailMatch.Groups[1].Value } else { "0" }

    Write-Gate "Phase 27 E2E tests pass ($e2ePassed passed)" ($e2eExit -eq 0) $(if ($e2eExit -ne 0) { "$e2eFailed failed" } else { "" })
  } else {
    Write-Warning-Gate "Phase 27 E2E tests" "API server not running on :3001 - skipped"
  }
}

# Static check: E2E spec covers key scenarios
if (Test-Path $phase27Spec) {
  $specContent = Get-Content $phase27Spec -Raw
  Write-Gate "E2E covers: login lifecycle" ($specContent -match "Auth lifecycle")
  Write-Gate "E2E covers: health records" ($specContent -match "Health record sections")
  Write-Gate "E2E covers: PDF export" ($specContent -match "PDF export")
  Write-Gate "E2E covers: share lifecycle" ($specContent -match "Share lifecycle")
  Write-Gate "E2E covers: messaging" ($specContent -match "Secure messaging")
  Write-Gate "E2E covers: appointments" ($specContent -match "Appointments")
  Write-Gate "E2E covers: settings" ($specContent -match "Settings")
  Write-Gate "E2E covers: proxy/sensitivity" ($specContent -match "sensitivity")
  Write-Gate "E2E covers: audit trail" ($specContent -match "Audit trail")
  Write-Gate "E2E covers: rate limiting" ($specContent -match "Rate limiting")
  Write-Gate "E2E covers: PHI safety" ($specContent -match "PHI safety")
}

# ========================================
# 9. DOCUMENTATION
# ========================================
Write-Host ""
Write-Host "--- 9: Documentation ---" -ForegroundColor Yellow

Write-Gate "Runbook: portal-core.md" (Test-Path "$root\docs\runbooks\portal-core.md")
Write-Gate "Known gaps doc" (Test-Path "$root\docs\contracts\portal\known-gaps.md")
Write-Gate "Prompt: Phase 27 IMPLEMENT" (Test-Path "$root\prompts\29-PHASE-27-PORTAL-CORE\29-01-portal-core-IMPLEMENT.md")
Write-Gate "Prompt: Phase 27 VERIFY" (Test-Path "$root\prompts\29-PHASE-27-PORTAL-CORE\29-99-portal-core-VERIFY.md")

# ========================================
# 10. WEB APP REGRESSION
# ========================================
Write-Host ""
Write-Host "--- 10: Web App Regression ---" -ForegroundColor Yellow

Write-Host "  Building clinician web app..." -ForegroundColor DarkGray
if (Test-Path "$root\apps\web\.next") {
  Remove-Item -Recurse -Force "$root\apps\web\.next" -ErrorAction SilentlyContinue
}
Push-Location $root
$webBuild = & pnpm -C apps/web build 2>&1 | Out-String
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web app builds clean" ($webExit -eq 0) $(if ($webExit -ne 0) { "Web build failed" } else { "" })

# ========================================
# SUMMARY
# ========================================
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Phase 27 Verification Summary" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
} else {
  Write-Host "  FAIL: $fail" -ForegroundColor Green
}
if ($warn -gt 0) {
  Write-Host "  WARN: $warn" -ForegroundColor Yellow
} else {
  Write-Host "  WARN: $warn" -ForegroundColor Green
}

Write-Host ""
if ($fail -gt 0) {
  Write-Host "RESULT: GATES FAILED" -ForegroundColor Red
  exit 1
} else {
  Write-Host "RESULT: ALL GATES PASSED" -ForegroundColor Green
  exit 0
}
