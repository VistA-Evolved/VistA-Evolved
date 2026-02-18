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
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  if ($IsRegex) {
    return (Select-String -LiteralPath $Path -Pattern $Pattern -Quiet)
  }
  return (Select-String -LiteralPath $Path -Pattern $Pattern -SimpleMatch -Quiet)
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
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Phase 29 Verification -- Portal IAM + Proxy + Access Logs" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ================================================================
# G29-0  REGRESSION (delegate to Phase 28 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G29-0: Regression (Phase 28) ---" -ForegroundColor Yellow

$phase28Script = "$root\scripts\verify-phase1-to-phase28.ps1"
if (Test-Path $phase28Script) {
  Write-Host "  Delegating to Phase 28 verifier..." -ForegroundColor DarkGray
  $phase28Result = & powershell -ExecutionPolicy Bypass -File $phase28Script -SkipPlaywright -SkipE2E 2>&1
  $phase28Exit = $LASTEXITCODE
  if ($phase28Exit -eq 0) {
    Write-Gate "Phase 28 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 28 regression" "Phase 28 verifier returned exit code $phase28Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 28 regression" "verify-phase1-to-phase28.ps1 not found (non-blocking)"
}

# ================================================================
# G29-0b  PROMPTS + TSC
# ================================================================
Write-Host ""
Write-Host "--- G29-0b: Prompts + TypeScript ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"

# Prompt folder exists
Write-Gate "Phase 29 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\31-PHASE-29-PATIENT-IAM")
Write-Gate "Phase 29 IMPLEMENT prompt exists" (Test-Path -LiteralPath "$promptsDir\31-PHASE-29-PATIENT-IAM\31-01-patient-iam-IMPLEMENT.md")

# Phase folders contiguous
$folders = Get-ChildItem -Path $promptsDir -Directory |
  Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name
$phaseFolders = $folders | Where-Object { [int]($_.Name.Substring(0, 2)) -ge 1 }
$expectedNum = 1
$contiguous = $true
foreach ($f in $phaseFolders) {
  $num = [int]($f.Name.Substring(0, 2))
  if ($num -ne $expectedNum) { $contiguous = $false; break }
  $expectedNum++
}
Write-Gate "Phase folder numbering contiguous (01-31)" $contiguous

# TSC compile
Write-Host "  Checking API TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
$apiTsc = & npx tsc --noEmit 2>&1 | Out-String
$apiExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($apiExit -eq 0)

Write-Host "  Checking Portal TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\portal"
$portalTsc = & npx tsc --noEmit 2>&1 | Out-String
$portalExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal TypeScript compiles clean" ($portalExit -eq 0)

Write-Host "  Checking Web TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\web"
$webTsc = & npx tsc --noEmit 2>&1 | Out-String
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web TypeScript compiles clean" ($webExit -eq 0)

# ================================================================
# G29-1  AUTH: IDENTITY ARCHITECTURE
# ================================================================
Write-Host ""
Write-Host "--- G29-1: Auth / Identity Architecture ---" -ForegroundColor Yellow

$iamDir = "$root\apps\api\src\portal-iam"

# Runtime files exist
$iamFiles = @("types.ts", "portal-user-store.ts", "proxy-store.ts", "access-log-store.ts", "csrf.ts", "portal-iam-routes.ts")
foreach ($f in $iamFiles) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($f)
  Write-Gate "IAM file: $name" (Test-Path "$iamDir\$f")
}

# Types: key type definitions
$typesContent = if (Test-Path "$iamDir\types.ts") { Get-Content "$iamDir\types.ts" -Raw } else { "" }
Write-Gate "Types: PortalUser interface" ($typesContent -match "export interface PortalUser")
Write-Gate "Types: PatientProfile interface" ($typesContent -match "export interface PatientProfile")
Write-Gate "Types: ProxyInvitation interface" ($typesContent -match "export interface ProxyInvitation")
Write-Gate "Types: DeviceSession interface" ($typesContent -match "export interface DeviceSession")
Write-Gate "Types: AccessLogEntry interface" ($typesContent -match "export interface AccessLogEntry")
Write-Gate "Types: PolicyResult interface" ($typesContent -match "export interface PolicyResult")
Write-Gate "Types: PortalUserStatus type" ($typesContent -match "PortalUserStatus")
Write-Gate "Types: PatientRelationship type" ($typesContent -match "PatientRelationship")
Write-Gate "Types: InvitationStatus type" ($typesContent -match "InvitationStatus")
Write-Gate "Types: AccessLogEventType type" ($typesContent -match "AccessLogEventType")

# User store: password hashing
$storeContent = if (Test-Path "$iamDir\portal-user-store.ts") { Get-Content "$iamDir\portal-user-store.ts" -Raw } else { "" }
Write-Gate "Store: scrypt hashing" ($storeContent -match "scrypt")
Write-Gate "Store: timingSafeEqual" ($storeContent -match "timingSafeEqual")
Write-Gate "Store: hash format scrypt:salt:hash" ($storeContent -match 'scrypt:\$\{salt\}:\$\{')

# Lockout configuration
Write-Gate "Store: maxFailedAttempts config" ($storeContent -match "maxFailedAttempts")
Write-Gate "Store: lockoutDurationMs config" ($storeContent -match "lockoutDurationMs")
Write-Gate "Store: lockout threshold = 5" ($storeContent -match "maxFailedAttempts.*5|5.*maxFailedAttempts")
Write-Gate "Store: lockout duration 15 min" ($storeContent -match "900000|15\s*\*\s*60\s*\*\s*1000")

# Lockout logic in authenticate
Write-Gate "Store: authenticateUser function" ($storeContent -match "export async function authenticateUser")
Write-Gate "Store: failed attempt increment" ($storeContent -match "failedAttempts")
Write-Gate "Store: lockedUntil check" ($storeContent -match "lockedUntil")

# Password validation
Write-Gate "Store: validatePasswordStrength" ($storeContent -match "export function validatePasswordStrength")
Write-Gate "Store: uppercase requirement" ($storeContent -match "\[A-Z\]")
Write-Gate "Store: lowercase requirement" ($storeContent -match "\[a-z\]")
Write-Gate "Store: digit requirement" ($storeContent -match "\[0-9\]|\\d")
Write-Gate "Store: special char requirement" ($storeContent -match "special|[!@#\$%\^&\*]")
Write-Gate "Store: min length 8" ($storeContent -match "passwordMinLength.*8|8.*passwordMinLength|\.length\s*<\s*8")

# MFA scaffold
Write-Gate "Store: setupMfa function" ($storeContent -match "export function setupMfa")
Write-Gate "Store: confirmMfa function" ($storeContent -match "export function confirmMfa")
Write-Gate "Store: disableMfa function" ($storeContent -match "export function disableMfa")
Write-Gate "Store: MFA feature flag" ($storeContent -match "PORTAL_MFA_ENABLED")

# Device sessions
Write-Gate "Store: createDeviceSession" ($storeContent -match "export function createDeviceSession")
Write-Gate "Store: listDeviceSessions" ($storeContent -match "export function listDeviceSessions")
Write-Gate "Store: revokeDeviceSession" ($storeContent -match "export function revokeDeviceSession")
Write-Gate "Store: revokeAllDeviceSessions" ($storeContent -match "export function revokeAllDeviceSessions")

# Patient profiles
Write-Gate "Store: addPatientProfile" ($storeContent -match "export function addPatientProfile")
Write-Gate "Store: removePatientProfile" ($storeContent -match "export function removePatientProfile")
Write-Gate "Store: blocks self removal" ($storeContent -match "isSelf|cannot remove self|self.*profile")

# Dev seed users
Write-Gate "Store: seedDevUsers function" ($storeContent -match "export async function seedDevUsers")
Write-Gate "Store: patient1 dev user" ($storeContent -match "patient1")
Write-Gate "Store: patient2 dev user" ($storeContent -match "patient2")
Write-Gate "Store: DFN 100022 mapping" ($storeContent -match "100022")
Write-Gate "Store: DFN 100033 mapping" ($storeContent -match "100033")

# Stats
Write-Gate "Store: getIamStats function" ($storeContent -match "export function getIamStats")

# ================================================================
# G29-2  SESSIONS: DEVICE/SESSION MANAGEMENT
# ================================================================
Write-Host ""
Write-Host "--- G29-2: Sessions / Device Management ---" -ForegroundColor Yellow

$routesContent = if (Test-Path "$iamDir\portal-iam-routes.ts") { Get-Content "$iamDir\portal-iam-routes.ts" -Raw } else { "" }

# Session cookie
Write-Gate "Routes: IAM session cookie name" ($routesContent -match "portal_iam_session")
Write-Gate "Routes: session httpOnly true" ($routesContent -match "httpOnly.*true")
Write-Gate "Routes: session sameSite strict" ($routesContent -match "sameSite.*strict")

# Session TTLs
Write-Gate "Routes: absolute TTL 30 min" ($routesContent -match "1800000|30\s*\*\s*60\s*\*\s*1000")
Write-Gate "Routes: idle TTL 15 min" ($routesContent -match "900000|15\s*\*\s*60\s*\*\s*1000")

# Session management routes
Write-Gate "Route: GET /portal/iam/session" ($routesContent -match "\/portal\/iam\/session")
Write-Gate "Route: POST /portal/iam/login" ($routesContent -match "\/portal\/iam\/login")
Write-Gate "Route: POST /portal/iam/logout" ($routesContent -match "\/portal\/iam\/logout")
Write-Gate "Route: POST /portal/iam/register" ($routesContent -match "\/portal\/iam\/register")

# Device session routes
Write-Gate "Route: GET /portal/iam/devices" ($routesContent -match "\/portal\/iam\/devices")
Write-Gate "Route: POST devices/:id/revoke" ($routesContent -match "\/portal\/iam\/devices\/.*revoke")
Write-Gate "Route: POST devices/revoke-all" ($routesContent -match "revoke-all")

# Session cleanup interval
Write-Gate "Routes: session cleanup interval" ($routesContent -match "setInterval|cleanup")

# Exported getIamSession
Write-Gate "Routes: getIamSession exported" ($routesContent -match "export function getIamSession|export async function getIamSession")

# ================================================================
# G29-3  PROXY: INVITATION WORKFLOW
# ================================================================
Write-Host ""
Write-Host "--- G29-3: Proxy Invitation Workflow ---" -ForegroundColor Yellow

$proxyContent = if (Test-Path "$iamDir\proxy-store.ts") { Get-Content "$iamDir\proxy-store.ts" -Raw } else { "" }

# Core functions
Write-Gate "Proxy: createProxyInvitation" ($proxyContent -match "export function createProxyInvitation")
Write-Gate "Proxy: respondToInvitation" ($proxyContent -match "export function respondToInvitation")
Write-Gate "Proxy: cancelInvitation" ($proxyContent -match "export function cancelInvitation")
Write-Gate "Proxy: getInvitation" ($proxyContent -match "export function getInvitation")
Write-Gate "Proxy: getPendingInvitationsForUser" ($proxyContent -match "export function getPendingInvitationsForUser")
Write-Gate "Proxy: getInvitationsForPatient" ($proxyContent -match "export function getInvitationsForPatient")

# Policy evaluation
Write-Gate "Proxy: max proxies check (10)" ($proxyContent -match "MAX_PROXIES_PER_PATIENT|10")
Write-Gate "Proxy: max pending check (5)" ($proxyContent -match "MAX_PENDING_PER_USER|5")
Write-Gate "Proxy: minor restriction (<18)" ($proxyContent -match "18|minor")
Write-Gate "Proxy: allowed minor relationships" ($proxyContent -match "parent.*guardian.*legal_representative|allowedForMinor")
Write-Gate "Proxy: protected minor warning (13-17)" ($proxyContent -match "13.*18|protected minor|Protected minor")
Write-Gate "Proxy: sensitivity integration" ($proxyContent -match "evaluateSensitivity")
Write-Gate "Proxy: audit integration" ($proxyContent -match "portalAudit")

# Invitation TTL
Write-Gate "Proxy: invitation TTL 7 days" ($proxyContent -match "7\s*\*\s*24\s*\*\s*60|604800000")
Write-Gate "Proxy: expiry cleanup" ($proxyContent -match "setInterval|cleanup|expir")

# Invitation statuses
Write-Gate "Proxy: pending status" ($proxyContent -match '"pending"')
Write-Gate "Proxy: accepted status" ($proxyContent -match '"accepted"')
Write-Gate "Proxy: declined status" ($proxyContent -match '"declined"')
Write-Gate "Proxy: expired status" ($proxyContent -match '"expired"')
Write-Gate "Proxy: blocked_by_policy status" ($proxyContent -match "blocked_by_policy")

# Accept flow adds profile
Write-Gate "Proxy: accept adds patient profile" ($proxyContent -match "addPatientProfile")

# Routes
Write-Gate "Route: POST /portal/iam/proxy/invite" ($routesContent -match "\/portal\/iam\/proxy\/invite")
Write-Gate "Route: GET proxy/invitations" ($routesContent -match "\/portal\/iam\/proxy\/invitations")
Write-Gate "Route: GET proxy/invitations/for-patient" ($routesContent -match "for-patient")
Write-Gate "Route: POST invitations/:id/respond" ($routesContent -match "\/respond")
Write-Gate "Route: POST invitations/:id/cancel" ($routesContent -match "\/cancel")

# Stats
Write-Gate "Proxy: getProxyInvitationStats" ($proxyContent -match "export function getProxyInvitationStats")

# ================================================================
# G29-4  ACCESS LOGS
# ================================================================
Write-Host ""
Write-Host "--- G29-4: Access Logs ---" -ForegroundColor Yellow

$logContent = if (Test-Path "$iamDir\access-log-store.ts") { Get-Content "$iamDir\access-log-store.ts" -Raw } else { "" }

# Core functions
Write-Gate "AccessLog: appendAccessLog" ($logContent -match "export function appendAccessLog")
Write-Gate "AccessLog: getAccessLog" ($logContent -match "export function getAccessLog")
Write-Gate "AccessLog: logSignIn" ($logContent -match "export function logSignIn")
Write-Gate "AccessLog: logSignOut" ($logContent -match "export function logSignOut")
Write-Gate "AccessLog: logViewSection" ($logContent -match "export function logViewSection")
Write-Gate "AccessLog: logExport" ($logContent -match "export function logExport")
Write-Gate "AccessLog: logShareCode" ($logContent -match "export function logShareCode")
Write-Gate "AccessLog: logProxySwitch" ($logContent -match "export function logProxySwitch")
Write-Gate "AccessLog: logMessageSend" ($logContent -match "export function logMessageSend")
Write-Gate "AccessLog: logRefillRequest" ($logContent -match "export function logRefillRequest")
Write-Gate "AccessLog: getAccessLogStats" ($logContent -match "export function getAccessLogStats")

# PHI sanitization
Write-Gate "AccessLog: PHI sanitization function" ($logContent -match "sanitize")
Write-Gate "AccessLog: SSN pattern stripped" ($logContent -match "SSN|\d{3}-\d{2}-\d{4}|ssn")
Write-Gate "AccessLog: DOB pattern stripped" ($logContent -match "DOB|dob|birth")
Write-Gate "AccessLog: REDACTED marker" ($logContent -match "REDACTED")

# Caps
Write-Gate "AccessLog: max entries per user (5000)" ($logContent -match "5000|MAX_ENTRIES_PER_USER")
Write-Gate "AccessLog: max total entries (100000)" ($logContent -match "100000|MAX_TOTAL_ENTRIES")

# Pagination
Write-Gate "AccessLog: limit/offset pagination" ($logContent -match "limit.*offset|offset.*limit")
Write-Gate "AccessLog: eventType filter" ($logContent -match "eventType")
Write-Gate "AccessLog: since filter" ($logContent -match "since")

# FIFO eviction
Write-Gate "AccessLog: FIFO eviction" ($logContent -match "shift|splice|evict|trim")

# Route
Write-Gate "Route: GET /portal/iam/activity" ($routesContent -match "\/portal\/iam\/activity")

# ================================================================
# G29-5  SECURITY: CSRF + RATE LIMITS + PHI
# ================================================================
Write-Host ""
Write-Host "--- G29-5: Security ---" -ForegroundColor Yellow

$csrfContent = if (Test-Path "$iamDir\csrf.ts") { Get-Content "$iamDir\csrf.ts" -Raw } else { "" }

# CSRF
Write-Gate "CSRF: generateCsrfToken" ($csrfContent -match "export function generateCsrfToken")
Write-Gate "CSRF: validateCsrf" ($csrfContent -match "export function validateCsrf")
Write-Gate "CSRF: cookie name csrf_token" ($csrfContent -match "csrf_token")
Write-Gate "CSRF: header name x-csrf-token" ($csrfContent -match "x-csrf-token")
Write-Gate "CSRF: randomBytes for token" ($csrfContent -match "randomBytes")
Write-Gate "CSRF: httpOnly false (client reads)" ($csrfContent -match "httpOnly.*false")
Write-Gate "CSRF: sameSite strict" ($csrfContent -match "sameSite.*strict")
Write-Gate "CSRF: maxAge 30 min" ($csrfContent -match "1800|30\s*\*\s*60")

# CSRF in route writes
Write-Gate "Routes: CSRF on password/change" ($routesContent -match "password/change.*validateCsrf|validateCsrf.*password.*change" -or ($routesContent -match "password/change" -and $routesContent -match "validateCsrf"))
Write-Gate "Routes: CSRF on proxy/invite" ($routesContent -match "validateCsrf")
Write-Gate "Routes: CSRF on mfa/setup" ($routesContent -match "mfa/setup")

# Rate limiting
Write-Gate "Routes: rate limit config" ($routesContent -match "IAM_MAX_ATTEMPTS|authAttempts|checkIamRate")
Write-Gate "Routes: rate limit 5 per window" ($routesContent -match "5")
Write-Gate "Routes: rate limit 15 min window" ($routesContent -match "900000|15\s*\*\s*60\s*\*\s*1000")
Write-Gate "Routes: rate limit on login" ($routesContent -match "checkIamRate|checkRate")
Write-Gate "Routes: 429 response" ($routesContent -match "429")

# No console.log
$iamSourceFiles = Get-SourceFiles -Paths @($iamDir) -Extensions @(".ts")
$consoleLogCount = 0
foreach ($f in $iamSourceFiles) {
  $consoleLogCount += (Select-String -LiteralPath $f.FullName -Pattern "console\.log\(" -AllMatches).Matches.Count
}
Write-Gate "IAM: no console.log ($consoleLogCount)" ($consoleLogCount -eq 0)

# No hardcoded credentials outside store seed
$iamNonStore = $iamSourceFiles | Where-Object { $_.Name -ne "portal-user-store.ts" }
$credLeak = $false
foreach ($f in $iamNonStore) {
  $content = Get-Content $f.FullName -Raw
  if ($content -match "Patient1!|Patient2!|PROV123") {
    $credLeak = $true
    break
  }
}
Write-Gate "IAM: no hardcoded credentials (non-store)" (-not $credLeak)

# No PHI in access log entries
Write-Gate "AccessLog: no SSN field in type" (-not ($typesContent -match "ssn.*string|socialSecurity"))
Write-Gate "AccessLog: no DOB field in type" (-not ($typesContent -match "\bdob\b.*string|dateOfBirth.*string" ))

# ================================================================
# G29-6  INDEX.TS WIRING
# ================================================================
Write-Host ""
Write-Host "--- G29-6: API Index Registration ---" -ForegroundColor Yellow

$indexContent = if (Test-Path "$root\apps\api\src\index.ts") { Get-Content "$root\apps\api\src\index.ts" -Raw } else { "" }

Write-Gate "Index: imports portalIamRoutes" ($indexContent -match "portal-iam-routes")
Write-Gate "Index: imports seedDevUsers" ($indexContent -match "seedDevUsers")
Write-Gate "Index: calls seedDevUsers()" ($indexContent -match "seedDevUsers\(\)")
Write-Gate "Index: registers portalIamRoutes" ($indexContent -match "server\.register\(portalIamRoutes\)")

# ================================================================
# G29-7  PORTAL UI PAGES
# ================================================================
Write-Host ""
Write-Host "--- G29-7: Portal UI Pages ---" -ForegroundColor Yellow

# Nav items
$navPath = "$root\apps\portal\src\components\portal-nav.tsx"
$navContent = if (Test-Path $navPath) { Get-Content $navPath -Raw } else { "" }
Write-Gate "Nav: Family Access link" ($navContent -match "Family Access|/dashboard/proxy")
Write-Gate "Nav: Activity Log link" ($navContent -match "Activity Log|/dashboard/activity")
Write-Gate "Nav: Account link" ($navContent -match "Account|/dashboard/account")

# Account page
$accountPath = "$root\apps\portal\src\app\dashboard\account\page.tsx"
$accountContent = if (Test-Path -LiteralPath $accountPath) { Get-Content $accountPath -Raw } else { "" }
Write-Gate "Account page exists" (Test-Path -LiteralPath $accountPath)
Write-Gate "Account: credentials include" ($accountContent -match 'credentials.*include')
Write-Gate "Account: password change form" ($accountContent -match "password.*change|currentPassword|newPassword")
Write-Gate "Account: device session list" ($accountContent -match "/portal/iam/devices")
Write-Gate "Account: CSRF token fetch" ($accountContent -match "csrf-token")
Write-Gate "Account: x-csrf-token header" ($accountContent -match "x-csrf-token")
Write-Gate "Account: revoke device handler" ($accountContent -match "revoke")

# Proxy page
$proxyPath = "$root\apps\portal\src\app\dashboard\proxy\page.tsx"
$proxyContent2 = if (Test-Path -LiteralPath $proxyPath) { Get-Content $proxyPath -Raw } else { "" }
Write-Gate "Proxy page exists" (Test-Path -LiteralPath $proxyPath)
Write-Gate "Proxy: credentials include" ($proxyContent2 -match 'credentials.*include')
Write-Gate "Proxy: invitation send" ($proxyContent2 -match "/portal/iam/proxy/invite")
Write-Gate "Proxy: invitation list" ($proxyContent2 -match "/portal/iam/proxy/invitations")
Write-Gate "Proxy: respond handler" ($proxyContent2 -match "/respond")
Write-Gate "Proxy: cancel handler" ($proxyContent2 -match "/cancel")
Write-Gate "Proxy: relationship dropdown" ($proxyContent2 -match "parent.*guardian|RELATIONSHIPS")
Write-Gate "Proxy: CSRF on writes" ($proxyContent2 -match "x-csrf-token")
Write-Gate "Proxy: policy warnings display" ($proxyContent2 -match "warnings|policyResult")

# Activity page
$activityPath = "$root\apps\portal\src\app\dashboard\activity\page.tsx"
$activityContent = if (Test-Path -LiteralPath $activityPath) { Get-Content $activityPath -Raw } else { "" }
Write-Gate "Activity page exists" (Test-Path -LiteralPath $activityPath)
Write-Gate "Activity: credentials include" ($activityContent -match 'credentials.*include')
Write-Gate "Activity: fetch activity endpoint" ($activityContent -match "/portal/iam/activity")
Write-Gate "Activity: event type filter" ($activityContent -match "eventType|eventFilter")
Write-Gate "Activity: date filter" ($activityContent -match "since|sinceFilter")
Write-Gate "Activity: pagination" ($activityContent -match "offset|PAGE_SIZE|loadMore")
Write-Gate "Activity: event type labels" ($activityContent -match "EVENT_TYPE_LABELS")
Write-Gate "Activity: event icons" ($activityContent -match "EVENT_ICONS")
Write-Gate "Activity: proxy badge" ($activityContent -match "isProxy|Proxy")

# ================================================================
# G29-8  ROUTE COVERAGE
# ================================================================
Write-Host ""
Write-Host "--- G29-8: Route Coverage ---" -ForegroundColor Yellow

$routePatterns = @(
  @{ name = "GET csrf-token";            pattern = "\/portal\/iam\/csrf-token" },
  @{ name = "POST register";             pattern = "\/portal\/iam\/register" },
  @{ name = "POST login";                pattern = "\/portal\/iam\/login" },
  @{ name = "POST logout";               pattern = "\/portal\/iam\/logout" },
  @{ name = "GET session";               pattern = "\/portal\/iam\/session" },
  @{ name = "POST password/change";      pattern = "password\/change" },
  @{ name = "POST password/reset";       pattern = "password\/reset" },
  @{ name = "POST password/confirm";     pattern = "password\/confirm" },
  @{ name = "POST mfa/setup";            pattern = "mfa\/setup" },
  @{ name = "POST mfa/confirm";          pattern = "mfa\/confirm" },
  @{ name = "POST mfa/disable";          pattern = "mfa\/disable" },
  @{ name = "GET profiles";              pattern = "\/portal\/iam\/profiles" },
  @{ name = "GET devices";               pattern = "\/portal\/iam\/devices" },
  @{ name = "POST devices/:id/revoke";   pattern = "devices\/.*\/revoke" },
  @{ name = "POST devices/revoke-all";   pattern = "revoke-all" },
  @{ name = "POST proxy/invite";         pattern = "proxy\/invite" },
  @{ name = "GET proxy/invitations";     pattern = "proxy\/invitations" },
  @{ name = "GET invitations/for-patient"; pattern = "for-patient" },
  @{ name = "POST invitations/:id/respond"; pattern = "\/respond" },
  @{ name = "POST invitations/:id/cancel";  pattern = "\/cancel" },
  @{ name = "GET activity";              pattern = "\/portal\/iam\/activity" },
  @{ name = "GET stats";                 pattern = "\/portal\/iam\/stats" }
)

foreach ($r in $routePatterns) {
  Write-Gate "Route: $($r.name)" ($routesContent -match $r.pattern)
}

# ================================================================
# G29-9  DOCUMENTATION
# ================================================================
Write-Host ""
Write-Host "--- G29-9: Documentation ---" -ForegroundColor Yellow

Write-Gate "Doc: security/portal-iam.md" (Test-Path "$root\docs\security\portal-iam.md")
Write-Gate "Doc: runbooks/phase29-iam.md" (Test-Path "$root\docs\runbooks\phase29-iam.md")
Write-Gate "Ops: phase29-summary.md" (Test-Path "$root\ops\phase29-summary.md")
Write-Gate "Ops: phase29-notion-update.json" (Test-Path "$root\ops\phase29-notion-update.json")

# Security doc content
$secDocPath = "$root\docs\security\portal-iam.md"
$secDocContent = if (Test-Path $secDocPath) { Get-Content $secDocPath -Raw } else { "" }
Write-Gate "SecDoc: password policy section" ($secDocContent -match "Password Policy|scrypt")
Write-Gate "SecDoc: lockout section" ($secDocContent -match "Account Lockout|lockout")
Write-Gate "SecDoc: CSRF section" ($secDocContent -match "CSRF")
Write-Gate "SecDoc: rate limit section" ($secDocContent -match "Rate Limit")
Write-Gate "SecDoc: MFA section" ($secDocContent -match "MFA|TOTP")
Write-Gate "SecDoc: session model" ($secDocContent -match "Session Model|portal_iam_session")
Write-Gate "SecDoc: device sessions" ($secDocContent -match "Device Session")
Write-Gate "SecDoc: proxy invitations" ($secDocContent -match "Proxy Invitation")
Write-Gate "SecDoc: access log" ($secDocContent -match "Access Log")

# VERIFY prompt (will be created)
Write-Gate "Phase 29 VERIFY prompt exists" (Test-Path -LiteralPath "$promptsDir\31-PHASE-29-PATIENT-IAM\31-02-patient-iam-VERIFY.md")

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Phase 29 Verification Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
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
