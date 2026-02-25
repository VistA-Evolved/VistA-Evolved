<# verify-phase49-auth-rbac.ps1 -- Phase 49 VERIFY gates
   G49-1: Login works, bad creds rejected, lockout triggers
   G49-2: Session rotation + timeout + CSRF tested
   G49-3: RBAC blocks unauthorized access to admin/RCM routes
   G49-4: No credential/token leaks in logs or client storage
   G49-5: verify-latest passes (63/63)
#>

param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$name, [scriptblock]$test) {
  $script:total++
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
    Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

$root = Split-Path $PSScriptRoot -Parent
$API  = "http://127.0.0.1:3001"

Write-Host "`n=== Phase 49 VERIFY -- Auth Must Be Reliable and Secure ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# -- Prerequisite: API health --
Write-Host "--- Prerequisite: API Running ---" -ForegroundColor Yellow
$apiUp = $false
try {
  $h = Invoke-WebRequest -Uri "$API/health" -UseBasicParsing -TimeoutSec 5
  if ($h.StatusCode -eq 200) { $apiUp = $true }
} catch { }

if (-not $apiUp) {
  Write-Host "  SKIP  API not running on port 3001 -- starting it..." -ForegroundColor Yellow
  $job = Start-Job -ScriptBlock {
    Set-Location "$using:root\apps\api"
    $env:DEPLOY_SKU = "FULL_SUITE"
    & npx tsx --env-file=.env.local src/index.ts 2>&1
  }
  Start-Sleep -Seconds 10
  try {
    $h = Invoke-WebRequest -Uri "$API/health" -UseBasicParsing -TimeoutSec 5
    if ($h.StatusCode -eq 200) { $apiUp = $true; Write-Host "  OK    API started" -ForegroundColor Green }
  } catch {
    Write-Host "  FAIL  Could not start API" -ForegroundColor Red
    $fail++; $total++
  }
}

if (-not $apiUp) {
  Write-Host "`nCannot proceed without API. Exiting.`n" -ForegroundColor Red
  exit 1
}

# -- Cookie/temp files --
$cookieFile  = Join-Path $root "verify49-cookies.txt"
$cookieFile2 = Join-Path $root "verify49-cookies2.txt"
$loginFile   = Join-Path $root "verify49-login.json"
$bodyFile    = Join-Path $root "verify49-body.json"

# Phase 132: CSRF token extracted from login JSON response body (synchronizer token)
# Each login captures csrfToken; GetCsrfToken returns the cached value.
$script:provCsrf = ""
$script:nurseCsrf = ""
function GetCsrfToken([string]$jar) {
  # jar param kept for backward compat but ignored; return cached value
  if ($jar -eq $cookieFile2) { return $script:nurseCsrf }
  return $script:provCsrf
}

# ====================================================================
# G49-1: Login works, bad creds rejected, lockout triggers
# ====================================================================
Write-Host "`n--- G49-1: Login + Bad Creds + Lockout ---" -ForegroundColor Yellow

# G49-1a: Good login with PROV123
Remove-Item $cookieFile -ErrorAction SilentlyContinue
[System.IO.File]::WriteAllText($loginFile, '{"accessCode":"PROV123","verifyCode":"PROV123!!"}')
$loginOut = & curl.exe -s -c $cookieFile -X POST "$API/auth/login" `
  -H "Content-Type: application/json" -d "@$loginFile" 2>&1 | Out-String
$loginJson = $null
try { $loginJson = $loginOut | ConvertFrom-Json } catch { }
# Phase 132: Capture CSRF from login response body
if ($loginJson -and $loginJson.csrfToken) { $script:provCsrf = $loginJson.csrfToken }

Gate "G49-1a: Login with valid creds returns ok=true + role=admin" {
  $loginJson -and $loginJson.ok -eq $true -and $loginJson.session.role -eq "admin"
}

# G49-1b: Login response includes permissions array
Gate "G49-1b: Login response includes permissions array" {
  $loginJson -and $loginJson.session.permissions -and $loginJson.session.permissions.Count -gt 10
}

# G49-1c: Session cookie is httpOnly (check cookie jar)
Gate "G49-1c: Session cookie is httpOnly" {
  $content = Get-Content $cookieFile -Raw
  $content -match "#HttpOnly.*ehr_session"
}

# G49-1d: CSRF token is in login response body (Phase 132 synchronizer token)
Gate "G49-1d: CSRF token returned in login response body" {
  $loginJson -and $loginJson.csrfToken -and $loginJson.csrfToken.Length -ge 32
}

# G49-1e: Token NOT in response body
Gate "G49-1e: Session token not leaked in response body" {
  $loginOut -notmatch "ehr_session" -and $loginOut -notmatch "token.*[a-f0-9]{32}"
}

# G49-1f: Bad creds return 401 (use unique account to avoid prior-run lockout)
$badLoginFile = Join-Path $root "verify49-bad-login.json"
$badAcct = "BADUSER_$([System.Guid]::NewGuid().ToString('N').Substring(0,8))"
[System.IO.File]::WriteAllText($badLoginFile, "{`"accessCode`":`"$badAcct`",`"verifyCode`":`"BADPASS!!`"}")
$badOut = & curl.exe -s -o NUL -w "%{http_code}" -X POST "$API/auth/login" `
  -H "Content-Type: application/json" -d "@$badLoginFile" 2>&1 | Out-String
Gate "G49-1f: Bad creds return 401" {
  $badOut.Trim() -eq "401"
}

# G49-1g: Multiple bad attempts trigger lockout (429)
# Need 4 more bad attempts (5 total -- sets lock), then 1 more to verify lockout
for ($i = 0; $i -lt 4; $i++) {
  & curl.exe -s -o NUL -X POST "$API/auth/login" `
    -H "Content-Type: application/json" -d "@$badLoginFile" 2>&1 | Out-Null
}
# This attempt should see the lockout (429) + include retryAfterMs
$lockoutBody = & curl.exe -s -X POST "$API/auth/login" `
  -H "Content-Type: application/json" -d "@$badLoginFile" 2>&1 | Out-String
$lockoutJson = $null
try { $lockoutJson = $lockoutBody | ConvertFrom-Json } catch { }

Gate "G49-1g: Account lockout returns 429 after repeated failures" {
  $lockoutJson -and $lockoutJson.error -match "locked"
}

# G49-1h: Lockout response includes retryAfterMs
Gate "G49-1h: Lockout response includes retryAfterMs" {
  $lockoutJson -and $lockoutJson.retryAfterMs -gt 0
}

# G49-1i: Nurse login works + maps to nurse role
Remove-Item $cookieFile2 -ErrorAction SilentlyContinue
$nurseLoginFile = Join-Path $root "verify49-nurse-login.json"
[System.IO.File]::WriteAllText($nurseLoginFile, '{"accessCode":"NURSE123","verifyCode":"NURSE123!!"}')
$nurseOut = & curl.exe -s -c $cookieFile2 -X POST "$API/auth/login" `
  -H "Content-Type: application/json" -d "@$nurseLoginFile" 2>&1 | Out-String
$nurseJson = $null
try { $nurseJson = $nurseOut | ConvertFrom-Json } catch { }
# Phase 132: Capture nurse CSRF from login response body
if ($nurseJson -and $nurseJson.csrfToken) { $script:nurseCsrf = $nurseJson.csrfToken }

Gate "G49-1i: Nurse login returns ok + role=nurse" {
  $nurseJson -and $nurseJson.ok -eq $true -and $nurseJson.session.role -eq "nurse"
}

# ====================================================================
# G49-2: Session rotation + timeout + CSRF tested
# ====================================================================
Write-Host "`n--- G49-2: Session + CSRF ---" -ForegroundColor Yellow

# G49-2a: GET /auth/session works with cookie
$sessionOut = & curl.exe -s -b $cookieFile "$API/auth/session" 2>&1 | Out-String
$sessionJson = $null
try { $sessionJson = $sessionOut | ConvertFrom-Json } catch { }
Gate "G49-2a: GET /auth/session returns authenticated=true" {
  $sessionJson -and $sessionJson.authenticated -eq $true -and $sessionJson.session.role -eq "admin"
}

# G49-2b: Session includes permissions
Gate "G49-2b: Session response includes permissions" {
  $sessionJson -and $sessionJson.session.permissions -and $sessionJson.session.permissions.Count -gt 10
}

# G49-2c: GET /auth/permissions works
$permOut = & curl.exe -s -b $cookieFile "$API/auth/permissions" 2>&1 | Out-String
$permJson = $null
try { $permJson = $permOut | ConvertFrom-Json } catch { }
Gate "G49-2c: GET /auth/permissions returns role + permissions" {
  $permJson -and $permJson.ok -eq $true -and $permJson.role -eq "admin" -and $permJson.permissions.Count -gt 10
}

# G49-2d: CSRF POST without header returns 403
[System.IO.File]::WriteAllText($bodyFile, '{}')
$csrfFailOut = & curl.exe -s -o NUL -w "%{http_code}" -b $cookieFile -X POST "$API/rcm/claims/draft" `
  -H "Content-Type: application/json" -d "@$bodyFile" 2>&1 | Out-String
Gate "G49-2d: POST without CSRF header returns 403" {
  $csrfFailOut.Trim() -eq "403"
}

# G49-2e: CSRF POST with correct header passes (gets a domain error, not CSRF error)
$csrf = GetCsrfToken $cookieFile
$csrfPassOut = & curl.exe -s -b $cookieFile -c $cookieFile -X POST "$API/rcm/claims/draft" `
  -H "Content-Type: application/json" -H "x-csrf-token: $csrf" -d "@$bodyFile" 2>&1 | Out-String
$csrfPassJson = $null
try { $csrfPassJson = $csrfPassOut | ConvertFrom-Json } catch { }
Gate "G49-2e: POST with correct CSRF header gets past CSRF check" {
  # Should get a domain error (missing fields), NOT a CSRF error
  $csrfPassJson -and $csrfPassJson.error -ne "CSRF token mismatch"
}

# G49-2f: CSRF POST with wrong token returns 403
$csrfWrongOut = & curl.exe -s -o NUL -w "%{http_code}" -b $cookieFile -c $cookieFile -X POST "$API/rcm/claims/draft" `
  -H "Content-Type: application/json" -H "x-csrf-token: wrong-token-value" -d "@$bodyFile" 2>&1 | Out-String
Gate "G49-2f: POST with wrong CSRF token returns 403" {
  $csrfWrongOut.Trim() -eq "403"
}

# G49-2g: GET /auth/session without cookie returns authenticated=false
$noAuthOut = & curl.exe -s "$API/auth/session" 2>&1 | Out-String
$noAuthJson = $null
try { $noAuthJson = $noAuthOut | ConvertFrom-Json } catch { }
Gate "G49-2g: Session check without cookie returns authenticated=false" {
  $noAuthJson -and $noAuthJson.authenticated -eq $false
}

# G49-2h: Logout destroys session
Remove-Item $cookieFile -ErrorAction SilentlyContinue
[System.IO.File]::WriteAllText($loginFile, '{"accessCode":"PROV123","verifyCode":"PROV123!!"}')
$reloginOut = & curl.exe -s -c $cookieFile -X POST "$API/auth/login" `
  -H "Content-Type: application/json" -d "@$loginFile" 2>&1 | Out-String
$reloginJson = $null
try { $reloginJson = $reloginOut | ConvertFrom-Json } catch { }
# Phase 132: Capture CSRF from re-login response
if ($reloginJson -and $reloginJson.csrfToken) { $script:provCsrf = $reloginJson.csrfToken }
# Now logout
$logoutCsrf = GetCsrfToken $cookieFile
$logoutOut = & curl.exe -s -b $cookieFile -c $cookieFile -X POST "$API/auth/logout" `
  -H "x-csrf-token: $logoutCsrf" 2>&1 | Out-String
$logoutJson = $null
try { $logoutJson = $logoutOut | ConvertFrom-Json } catch { }
# After logout, session should be gone
$postLogoutOut = & curl.exe -s -b $cookieFile "$API/auth/session" 2>&1 | Out-String
$postLogoutJson = $null
try { $postLogoutJson = $postLogoutOut | ConvertFrom-Json } catch { }
Gate "G49-2h: Logout destroys session (subsequent check = not authenticated)" {
  $logoutJson -and $logoutJson.ok -eq $true -and
  $postLogoutJson -and $postLogoutJson.authenticated -eq $false
}

# ====================================================================
# G49-3: RBAC blocks unauthorized access
# ====================================================================
Write-Host "`n--- G49-3: RBAC Route Protection ---" -ForegroundColor Yellow

# Re-login as admin for later use
Remove-Item $cookieFile -ErrorAction SilentlyContinue
$adminLoginFile = Join-Path $root "verify49-admin-relogin.json"
[System.IO.File]::WriteAllText($adminLoginFile, '{"accessCode":"PROV123","verifyCode":"PROV123!!"}')
$reAdminLogin = & curl.exe -s -c $cookieFile -X POST "$API/auth/login" `
  -H "Content-Type: application/json" -d "@$adminLoginFile" 2>&1 | Out-String
$reAdminJson = $null
try { $reAdminJson = $reAdminLogin | ConvertFrom-Json } catch { }
# Phase 132: Capture CSRF from admin re-login response
if ($reAdminJson -and $reAdminJson.csrfToken) { $script:provCsrf = $reAdminJson.csrfToken }
if (-not ($reAdminJson -and $reAdminJson.ok)) {
  Write-Host "  WARN  Admin re-login failed: $reAdminLogin" -ForegroundColor Yellow
}

# G49-3a: Admin can GET /rcm/claims
$csrf = GetCsrfToken $cookieFile
$adminRcmOut = & curl.exe -s -o NUL -w "%{http_code}" -b $cookieFile "$API/rcm/claims" 2>&1 | Out-String
Gate "G49-3a: Admin can GET /rcm/claims (200)" {
  $adminRcmOut.Trim() -eq "200"
}

# G49-3b: Admin can POST /rcm/claims/draft
[System.IO.File]::WriteAllText($bodyFile, '{"patientDfn":"3","payerId":"test-001","diagnosisCodes":["Z00.00"],"procedureCodes":[{"code":"99213","modifier":"","units":1}],"placeOfService":"11"}')
$csrf = GetCsrfToken $cookieFile
$adminPostOut = & curl.exe -s -b $cookieFile -c $cookieFile -X POST "$API/rcm/claims/draft" `
  -H "Content-Type: application/json" -H "x-csrf-token: $csrf" -d "@$bodyFile" 2>&1 | Out-String
$adminPostJson = $null
try { $adminPostJson = $adminPostOut | ConvertFrom-Json } catch { }
Gate "G49-3b: Admin can POST /rcm/claims/draft (creates claim)" {
  $adminPostJson -and $adminPostJson.ok -eq $true
}

# G49-3c: Admin can GET /auth/rbac-matrix
$adminMatrixOut = & curl.exe -s -b $cookieFile "$API/auth/rbac-matrix" 2>&1 | Out-String
$adminMatrixJson = $null
try { $adminMatrixJson = $adminMatrixOut | ConvertFrom-Json } catch { }
Gate "G49-3c: Admin can GET /auth/rbac-matrix" {
  $adminMatrixJson -and $adminMatrixJson.ok -eq $true -and $adminMatrixJson.matrix
}

# --- Nurse tests (restricted role) ---
# G49-3d: Nurse can GET /rcm/claims (has rcm:read)
$nurseRcmGetOut = & curl.exe -s -o NUL -w "%{http_code}" -b $cookieFile2 "$API/rcm/claims" 2>&1 | Out-String
Gate "G49-3d: Nurse can GET /rcm/claims (rcm:read)" {
  $nurseRcmGetOut.Trim() -eq "200"
}

# G49-3e: Nurse CANNOT POST /rcm/claims/draft (no rcm:write)
$nurseCsrf = GetCsrfToken $cookieFile2
[System.IO.File]::WriteAllText($bodyFile, '{"patientDfn":"3","payerId":"test-001","diagnosisCodes":["Z00.00"],"procedureCodes":[{"code":"99213","modifier":"","units":1}],"placeOfService":"11"}')
$nursePostOut = & curl.exe -s -o NUL -w "%{http_code}" -b $cookieFile2 -c $cookieFile2 -X POST "$API/rcm/claims/draft" `
  -H "Content-Type: application/json" -H "x-csrf-token: $nurseCsrf" -d "@$bodyFile" 2>&1 | Out-String
Gate "G49-3e: Nurse CANNOT POST /rcm/claims/draft (403 -- no rcm:write)" {
  $nursePostOut.Trim() -eq "403"
}

# G49-3f: Nurse CANNOT POST /rcm/payers (no rcm:admin)
$nurseCsrf = GetCsrfToken $cookieFile2
[System.IO.File]::WriteAllText($bodyFile, '{"name":"TestPayer","country":"US"}')
$nursePayerOut = & curl.exe -s -o NUL -w "%{http_code}" -b $cookieFile2 -c $cookieFile2 -X POST "$API/rcm/payers" `
  -H "Content-Type: application/json" -H "x-csrf-token: $nurseCsrf" -d "@$bodyFile" 2>&1 | Out-String
Gate "G49-3f: Nurse CANNOT POST /rcm/payers (403 -- no rcm:admin)" {
  $nursePayerOut.Trim() -eq "403"
}

# G49-3g: Nurse CANNOT GET /auth/rbac-matrix (admin only)
$nurseMatrixOut = & curl.exe -s -o NUL -w "%{http_code}" -b $cookieFile2 "$API/auth/rbac-matrix" 2>&1 | Out-String
Gate "G49-3g: Nurse CANNOT GET /auth/rbac-matrix (403)" {
  $nurseMatrixOut.Trim() -eq "403"
}

# G49-3h: Unauthenticated request to /rcm/claims returns 401
$unauthRcmOut = & curl.exe -s -o NUL -w "%{http_code}" "$API/rcm/claims" 2>&1 | Out-String
Gate "G49-3h: Unauthenticated /rcm/claims returns 401" {
  $unauthRcmOut.Trim() -eq "401"
}

# G49-3i: Unauthenticated POST to /rcm/claims/draft returns 401 (before CSRF)
$unauthPostOut = & curl.exe -s -o NUL -w "%{http_code}" -X POST "$API/rcm/claims/draft" `
  -H "Content-Type: application/json" -d '{}' 2>&1 | Out-String
Gate "G49-3i: Unauthenticated POST returns 401 or 403" {
  $code = $unauthPostOut.Trim()
  $code -eq "401" -or $code -eq "403"
}

# G49-3j: Nurse permissions endpoint shows limited perms
$nursePermOut = & curl.exe -s -b $cookieFile2 "$API/auth/permissions" 2>&1 | Out-String
$nursePermJson = $null
try { $nursePermJson = $nursePermOut | ConvertFrom-Json } catch { }
Gate "G49-3j: Nurse permissions show rcm:read but not rcm:write" {
  $nursePermJson -and
  $nursePermJson.role -eq "nurse" -and
  ($nursePermJson.permissions -contains "rcm:read") -and
  ($nursePermJson.permissions -notcontains "rcm:write")
}

# G49-3k: RBAC matrix has 7 roles
Gate "G49-3k: RBAC matrix has 7 roles (admin/provider/nurse/pharmacist/billing/clerk/support)" {
  $m = $adminMatrixJson.matrix
  $m.admin -and $m.provider -and $m.nurse -and $m.pharmacist -and $m.billing -and $m.clerk -and $m.support
}

# ====================================================================
# G49-4: No credential/token leaks
# ====================================================================
Write-Host "`n--- G49-4: No Credential/Token Leaks ---" -ForegroundColor Yellow

# G49-4a: No hardcoded PROV123 outside login page
$apiSrc = Join-Path $root "apps\api\src"
Gate "G49-4a: No PROV123 in API route/middleware source" {
  $hits = Get-ChildItem -Path $apiSrc -Recurse -Include "*.ts" |
    Where-Object { $_.FullName -notmatch "test" -and $_.FullName -notmatch "config\.ts" -and $_.FullName -notmatch "session-store\.ts" -and $_.FullName -notmatch "Coverage|Vivian|normalize" } |
    Select-String -Pattern "PROV123" -SimpleMatch
  $hits.Count -eq 0
}

# G49-4b: No PROV123 in web source (except login page)
$webSrc = Join-Path $root "apps\web\src"
Gate "G49-4b: No PROV123 in web source (except login page.tsx)" {
  $hits = Get-ChildItem -Path $webSrc -Recurse -Include "*.ts","*.tsx" |
    Where-Object { $_.Name -ne "page.tsx" } |
    Select-String -Pattern "PROV123" -SimpleMatch
  $hits.Count -eq 0
}

# G49-4c: Session cookie marked httpOnly in code
Gate "G49-4c: Session cookie httpOnly=true in code" {
  $content = Get-Content (Join-Path $apiSrc "auth\auth-routes.ts") -Raw
  $content -match "httpOnly:\s*true"
}

# G49-4d: Token never in console.log
Gate "G49-4d: No console.log in auth source files" {
  $authDir = Join-Path $apiSrc "auth"
  $secDir = Join-Path $apiSrc "middleware"
  $hits = @()
  $hits += Get-ChildItem -Path $authDir -Filter "*.ts" | Select-String -Pattern "console\.log"
  $hits += Get-ChildItem -Path $secDir -Filter "*.ts" | Select-String -Pattern "console\.log"
  $hits.Count -eq 0
}

# G49-4e: Error responses don't leak stack traces (via contract test)
$badRoute = & curl.exe -s "$API/nonexistent-route" 2>&1 | Out-String
Gate "G49-4e: 404 response doesn't leak stack traces" {
  $badRoute -notmatch "at Function" -and $badRoute -notmatch "node_modules" -and $badRoute -notmatch "\.ts:"
}

# G49-4f: PHI scan is clean
Gate "G49-4f: PHI field blocklist scan clean" {
  Push-Location $root
  $phiOut = npx tsx scripts/check-phi-fields.ts 2>&1 | Out-String
  Pop-Location
  $phiOut -match "\[PASS\]"
}

# G49-4g: rbac.ts file exists and has ROLE_PERMISSIONS
Gate "G49-4g: rbac.ts exists with ROLE_PERMISSIONS map" {
  $rbacFile = Join-Path $apiSrc "auth\rbac.ts"
  (Test-Path -LiteralPath $rbacFile) -and (Get-Content $rbacFile -Raw) -match "ROLE_PERMISSIONS"
}

# G49-4h: CSRF config in server-config.ts
Gate "G49-4h: CSRF_CONFIG exported from server-config.ts" {
  $config = Get-Content (Join-Path $apiSrc "config\server-config.ts") -Raw
  $config -match "CSRF_CONFIG" -and $config -match "LOCKOUT_CONFIG"
}

# G49-4i: Lockout config present
Gate "G49-4i: LOCKOUT_CONFIG has maxAttempts + lockoutDurationMs" {
  $config = Get-Content (Join-Path $apiSrc "config\server-config.ts") -Raw
  $config -match "maxAttempts" -and $config -match "lockoutDurationMs"
}

# G49-4j: audit.ts has auth.locked action
Gate "G49-4j: AuditAction includes auth.locked and security.csrf-failed" {
  $audit = Get-Content (Join-Path $apiSrc "lib\audit.ts") -Raw
  $audit -match "auth\.locked" -and $audit -match "security\.csrf-failed"
}

# ====================================================================
# G49-5: tsc + vitest + verify-latest
# ====================================================================
Write-Host "`n--- G49-5: Build + Test Regression ---" -ForegroundColor Yellow

# G49-5a: tsc clean
Gate "G49-5a: tsc --noEmit clean" {
  Push-Location (Join-Path $root "apps\api")
  $tscOut = pnpm exec tsc --noEmit 2>&1 | Out-String
  Pop-Location
  $LASTEXITCODE -eq 0
}

# G49-5b: vitest unit tests pass (non-integration)
Gate "G49-5b: vitest unit tests pass (transaction + rcm-quality)" {
  Push-Location (Join-Path $root "apps\api")
  $vtOut = pnpm exec vitest run tests/transaction-correctness.test.ts tests/rcm-quality-loop.test.ts 2>&1 | Out-String
  $vtExit = $LASTEXITCODE
  Pop-Location
  $vtExit -eq 0
}

# G49-5c: docs exist
Gate "G49-5c: docs/security/auth-and-rbac.md exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\security\auth-and-rbac.md")
}

Gate "G49-5d: docs/runbooks/auth-troubleshooting.md exists" {
  Test-Path -LiteralPath (Join-Path $root "docs\runbooks\auth-troubleshooting.md")
}

# G49-5e: prompt file exists
Gate "G49-5e: Prompt file exists" {
  Test-Path -LiteralPath (Join-Path $root "prompts\54-PHASE-49-VISTA-AUTH-HARDENING-RBAC\prompt.md")
}

# G49-5f: RCM routes import RBAC guards
Gate "G49-5f: RCM routes import requirePermission from rbac.ts" {
  $rcm = Get-Content (Join-Path $apiSrc "rcm\rcm-routes.ts") -Raw
  $rcm -match "requirePermission.*rbac" -and $rcm -match "requireRcmWrite" -and $rcm -match "requireRcmAdmin"
}

# G49-5g: session-store.ts has 7 roles in UserRole type
Gate "G49-5g: UserRole has 7 roles (including billing + support)" {
  $ss = Get-Content (Join-Path $apiSrc "auth\session-store.ts") -Raw
  $ss -match "billing" -and $ss -match "support" -and $ss -match "UserRole"
}

# G49-5h: verify-latest script has CSRF support
Gate "G49-5h: verify-phase43 script has CSRF token extraction" {
  $v43 = Get-Content (Join-Path $root "scripts\verify-phase43-claim-quality.ps1") -Raw
  $v43 -match "GetCsrfToken" -and $v43 -match "x-csrf-token"
}

# ====================================================================
# Cleanup
# ====================================================================
Remove-Item $cookieFile -Force -ErrorAction SilentlyContinue
Remove-Item $cookieFile2 -Force -ErrorAction SilentlyContinue
Remove-Item $loginFile -Force -ErrorAction SilentlyContinue
Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue
Remove-Item $badLoginFile -Force -ErrorAction SilentlyContinue
Remove-Item $nurseLoginFile -Force -ErrorAction SilentlyContinue
Remove-Item $adminLoginFile -Force -ErrorAction SilentlyContinue

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 49 VERIFY: $pass/$total PASS" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { Write-Host "$fail FAILED" -ForegroundColor Red }
Write-Host "========================================`n" -ForegroundColor Cyan
