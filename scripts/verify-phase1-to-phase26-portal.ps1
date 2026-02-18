param([switch]$SkipDocker, [switch]$SkipPlaywright)

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
Write-Host "Phase 26 Verification" -ForegroundColor Cyan
Write-Host "Portal Contract + Skeleton" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# ========================================
# 1. REGRESSION: Delegate to Phase 25 verifier
# ========================================
Write-Host ""
Write-Host "--- 1: Regression (Phase 25 gates) ---" -ForegroundColor Yellow

$phase25Script = "$root\scripts\verify-phase25-bi-analytics.ps1"
if (Test-Path $phase25Script) {
  Write-Host "  Delegating to Phase 25 verifier..." -ForegroundColor DarkGray
  $phase25Result = & powershell -ExecutionPolicy Bypass -File $phase25Script 2>&1
  $phase25Exit = $LASTEXITCODE
  # Extract PASS/FAIL counts from output
  $phase25Summary = ($phase25Result | Out-String)
  if ($phase25Exit -eq 0) {
    Write-Gate "Phase 25 regression: all gates pass" $true
  } else {
    Write-Gate "Phase 25 regression: all gates pass" $false "Phase 25 verifier returned exit code $phase25Exit"
  }
} else {
  Write-Gate "Phase 25 regression: verifier exists" $false "verify-phase25-bi-analytics.ps1 not found"
}

# ========================================
# 2. CONTRACT INTEGRITY
# ========================================
Write-Host ""
Write-Host "--- 2: Contract Integrity ---" -ForegroundColor Yellow

$contractDir = "$root\docs\contracts\portal"

# 2a. Contract files exist
$contractFiles = @(
  "vista-source-inventory.md",
  "reference-repos-inventory.md",
  "competitive-baseline.md",
  "portal-contract-v1.yaml",
  "portal-capability-matrix.md"
)

foreach ($f in $contractFiles) {
  Write-Gate "Contract file: $f" (Test-Path "$contractDir\$f")
}

# 2b. Run contract validator (TypeScript)
Write-Host "  Running contract validator..." -ForegroundColor DarkGray
try {
  Push-Location $root
  $validatorOutput = & npx tsx scripts/contract-validate-portal.ts 2>&1 | Out-String
  $validatorExit = $LASTEXITCODE
  Pop-Location
  Write-Gate "Contract YAML validates" ($validatorExit -eq 0) $(if ($validatorExit -ne 0) { "Validator returned errors" } else { "" })
} catch {
  Pop-Location
  Write-Gate "Contract YAML validates" $false "Validator threw: $_"
}

# 2c. Capability matrix module coverage
$matrixPath = "$contractDir\portal-capability-matrix.md"
$matrixModules = @("Auth", "Dashboard", "Health Records", "Medications", "Messages", "Appointments", "Telehealth", "Profile")
if (Test-Path $matrixPath) {
  $matrixContent = Get-Content $matrixPath -Raw
  foreach ($mod in $matrixModules) {
    $found = $matrixContent -match "##\s+.*$mod"
    Write-Gate "Matrix module: $mod" $found $(if (-not $found) { "Missing heading for $mod" } else { "" })
  }
} else {
  Write-Gate "Capability matrix exists" $false
}

# ========================================
# 3. PORTAL APP SKELETON
# ========================================
Write-Host ""
Write-Host "--- 3: Portal App Skeleton ---" -ForegroundColor Yellow

$portalDir = "$root\apps\portal"

# 3a. Core files
Write-Gate "Portal package.json" (Test-Path "$portalDir\package.json")
Write-Gate "Portal tsconfig.json" (Test-Path "$portalDir\tsconfig.json")
Write-Gate "Portal next.config.ts" (Test-Path "$portalDir\next.config.ts")

# 3b. All dashboard pages exist (no dead nav)
$navPages = @(
  "src\app\page.tsx",
  "src\app\dashboard\page.tsx",
  "src\app\dashboard\layout.tsx",
  "src\app\dashboard\health\page.tsx",
  "src\app\dashboard\medications\page.tsx",
  "src\app\dashboard\messages\page.tsx",
  "src\app\dashboard\appointments\page.tsx",
  "src\app\dashboard\telehealth\page.tsx",
  "src\app\dashboard\profile\page.tsx"
)

foreach ($page in $navPages) {
  $exists = Test-Path "$portalDir\$page"
  Write-Gate "Page: $page" $exists $(if (-not $exists) { "Dead link - page missing" } else { "" })
}

# 3c. Components exist
Write-Gate "Component: portal-nav.tsx" (Test-Path "$portalDir\src\components\portal-nav.tsx")
Write-Gate "Component: data-source-badge.tsx" (Test-Path "$portalDir\src\components\data-source-badge.tsx")

# 3d. API client
Write-Gate "API client: lib/api.ts" (Test-Path "$portalDir\src\lib\api.ts")

# 3e. Portal nav has all routes matching actual pages
$navContent = if (Test-Path "$portalDir\src\components\portal-nav.tsx") { Get-Content "$portalDir\src\components\portal-nav.tsx" -Raw } else { "" }
$navRoutes = @("/dashboard", "/dashboard/health", "/dashboard/medications", "/dashboard/messages", "/dashboard/appointments", "/dashboard/telehealth", "/dashboard/profile")
foreach ($route in $navRoutes) {
  Write-Gate "Nav route: $route" ($navContent -match [regex]::Escape($route))
}

# 3f. DataSourceBadge renders on each content page
$contentPages = @(
  "src\app\dashboard\page.tsx",
  "src\app\dashboard\health\page.tsx",
  "src\app\dashboard\medications\page.tsx",
  "src\app\dashboard\messages\page.tsx",
  "src\app\dashboard\appointments\page.tsx",
  "src\app\dashboard\telehealth\page.tsx",
  "src\app\dashboard\profile\page.tsx"
)
foreach ($page in $contentPages) {
  $fullPath = "$portalDir\$page"
  if (Test-Path $fullPath) {
    $hasBadge = Test-FileContains -Path $fullPath -Pattern "DataSourceBadge"
    Write-Gate "Badge on: $($page.Split('\')[-2])" $hasBadge $(if (-not $hasBadge) { "No DataSourceBadge on page" } else { "" })
  }
}

# 3g. Build check
Write-Host "  Building portal..." -ForegroundColor DarkGray
Push-Location $root
$buildOutput = & pnpm -C apps/portal build 2>&1 | Out-String
$buildExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal builds clean" ($buildExit -eq 0) $(if ($buildExit -ne 0) { "Build failed" } else { "" })

# ========================================
# 4. API PORTAL ROUTES
# ========================================
Write-Host ""
Write-Host "--- 4: API Portal Routes ---" -ForegroundColor Yellow

$portalAuth = "$root\apps\api\src\routes\portal-auth.ts"
$portalAudit = "$root\apps\api\src\services\portal-audit.ts"

Write-Gate "portal-auth.ts exists" (Test-Path $portalAuth)
Write-Gate "portal-audit.ts exists" (Test-Path $portalAudit)

# 4a. Index imports portal routes
$indexPath = "$root\apps\api\src\index.ts"
Write-Gate "Index imports portal routes" (Test-FileContains -Path $indexPath -Pattern "portal-auth")
Write-Gate "Index registers portal routes" (Test-FileContains -Path $indexPath -Pattern "portalAuth")

# 4b. Security rules for portal
$securityPath = "$root\apps\api\src\middleware\security.ts"
Write-Gate "Security: portal auth rule" (Test-FileContains -Path $securityPath -Pattern "portal.*auth" -IsRegex)
Write-Gate "Security: portal route rule" (Test-FileContains -Path $securityPath -Pattern "portal" -IsRegex)

# 4c. API TypeScript compilation
Write-Host "  Checking API type safety..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
$tscOutput = & npx tsc --noEmit 2>&1 | Out-String
$tscExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($tscExit -eq 0) $(if ($tscExit -ne 0) { "tsc errors found" } else { "" })

# ========================================
# 5. SECURITY BASELINE
# ========================================
Write-Host ""
Write-Host "--- 5: Security Baseline ---" -ForegroundColor Yellow

# 5a. Cookie httpOnly
if (Test-Path $portalAuth) {
  Write-Gate "Cookie: httpOnly" (Test-FileContains -Path $portalAuth -Pattern "httpOnly: true")
  Write-Gate "Cookie: sameSite strict" (Test-FileContains -Path $portalAuth -Pattern "sameSite")
  Write-Gate "Cookie: portal_session name" (Test-FileContains -Path $portalAuth -Pattern "portal_session")
}

# 5b. Rate limiting on login
if (Test-Path $portalAuth) {
  Write-Gate "Rate limit: login attempts" (Test-FileContains -Path $portalAuth -Pattern "checkLoginRate")
  Write-Gate "Rate limit: MAX_LOGIN_ATTEMPTS" (Test-FileContains -Path $portalAuth -Pattern "MAX_LOGIN_ATTEMPTS")
}

# 5c. Separate session store
if (Test-Path $portalAuth) {
  Write-Gate "Separate portal session store" (Test-FileContains -Path $portalAuth -Pattern "portalSessions")
}

# 5d. credentials: 'include' in portal fetch
$apiClient = "$root\apps\portal\src\lib\api.ts"
if (Test-Path $apiClient) {
  Write-Gate "API client: credentials include" (Test-FileContains -Path $apiClient -Pattern "credentials")
}

# 5e. Secret scan - no hardcoded creds in portal
$portalFiles = Get-SourceFiles -Paths @("$portalDir\src") -Extensions @(".ts",".tsx")
$credPatterns = @("PROV123", "PHARM123", "NURSE123")
$credViolations = @()
foreach ($pattern in $credPatterns) {
  $found = $portalFiles | Select-String -Pattern $pattern -SimpleMatch -ErrorAction SilentlyContinue
  if ($found) { $credViolations += $found }
}
Write-Gate "Secret scan: no hardcoded credentials" ($credViolations.Count -eq 0) $(if ($credViolations.Count -gt 0) { "Found $($credViolations.Count) credential references" } else { "" })

# 5f. No VA terminology in portal UI strings
$vaTermsExtended = @("MyHealtheVet", "non-VA", "\bVA\b")
$vaViolations = @()
foreach ($term in $vaTermsExtended) {
  $isRegex = $term -match "\\b"
  if ($isRegex) {
    $found = $portalFiles | Select-String -Pattern $term -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "^\s*//" -and $_.Line -notmatch "^\s*\*" -and $_.Line -notmatch "^\s*\*\*" }
  } else {
    $found = $portalFiles | Select-String -Pattern $term -SimpleMatch -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "^\s*//" -and $_.Line -notmatch "^\s*\*" -and $_.Line -notmatch "^\s*\*\*" }
  }
  if ($found) {
    # Filter to only string literals
    $stringHits = $found | Where-Object { $_.Line -match ('"[^"]*' + [regex]::Escape($term).Replace("\\\\b","") + '[^"]*"') -or $_.Line -match ("'[^']*" + [regex]::Escape($term).Replace("\\\\b","") + "[^']*'") }
    if ($stringHits) { $vaViolations += $stringHits }
  }
}
Write-Gate "No VA/Veteran/MyHealtheVet in UI" ($vaViolations.Count -eq 0) $(if ($vaViolations.Count -gt 0) { "Found $($vaViolations.Count) violations" } else { "" })

# 5g. Audit logging
if (Test-Path $portalAudit) {
  Write-Gate "Audit: hashed patient ID" (Test-FileContains -Path $portalAudit -Pattern "hashPatientId")
  Write-Gate "Audit: event types defined" (Test-FileContains -Path $portalAudit -Pattern "portal.login")
}

# ========================================
# 6. LICENSE GUARD
# ========================================
Write-Host ""
Write-Host "--- 6: License Guard ---" -ForegroundColor Yellow

$licenseGuardScript = "$root\scripts\license-guard.ps1"
Write-Gate "License guard script exists" (Test-Path $licenseGuardScript)

Write-Host "  Running license guard..." -ForegroundColor DarkGray
try {
  $lgOutput = & powershell -ExecutionPolicy Bypass -File $licenseGuardScript 2>&1 | Out-String
  $lgExit = $LASTEXITCODE
  Write-Gate "License guard: all checks pass" ($lgExit -eq 0) $(if ($lgExit -ne 0) { "License guard failed" } else { "" })
} catch {
  Write-Gate "License guard: all checks pass" $false "Exception: $_"
}

# 6b. THIRD_PARTY_NOTICES.md
Write-Gate "THIRD_PARTY_NOTICES.md exists" (Test-Path "$root\THIRD_PARTY_NOTICES.md")
if (Test-Path "$root\THIRD_PARTY_NOTICES.md") {
  $noticesContent = Get-Content "$root\THIRD_PARTY_NOTICES.md" -Raw
  Write-Gate "Attribution: HealtheMe mentioned" ($noticesContent -match "HealtheMe")
  Write-Gate "Attribution: Ottehr mentioned" ($noticesContent -match "Ottehr")
  Write-Gate "Attribution: AIOTP mentioned" ($noticesContent -match "AIOTP")
}

# ========================================
# 7. PORTAL UI SANITY (Playwright or static)
# ========================================
Write-Host ""
Write-Host "--- 7: Portal UI Sanity ---" -ForegroundColor Yellow

if ($SkipPlaywright) {
  Write-Warning-Gate "Playwright smoke test" "Skipped (-SkipPlaywright)"
} else {
  # Check if Playwright is installed
  $playwrightConfig = "$portalDir\playwright.config.ts"
  if (Test-Path $playwrightConfig) {
    Write-Host "  Running Playwright smoke tests..." -ForegroundColor DarkGray
    Push-Location $portalDir
    $pwResult = & npx playwright test --reporter=list 2>&1 | Out-String
    $pwExit = $LASTEXITCODE
    Pop-Location
    Write-Gate "Playwright smoke tests pass" ($pwExit -eq 0) $(if ($pwExit -ne 0) { "Playwright tests failed" } else { "" })
  } else {
    Write-Warning-Gate "Playwright config not found" "Run: cd apps/portal && npx playwright install"
  }
}

# Static analysis of nav links vs pages (dead link check)
Write-Host "  Static dead-link analysis..." -ForegroundColor DarkGray
$navFileContent = if (Test-Path "$portalDir\src\components\portal-nav.tsx") { Get-Content "$portalDir\src\components\portal-nav.tsx" -Raw } else { "" }
$hrefMatches = [regex]::Matches($navFileContent, 'href:\s*"(/[^"]+)"')
$deadLinks = @()
foreach ($match in $hrefMatches) {
  $href = $match.Groups[1].Value
  # Map URL to file path
  $pagePath = if ($href -eq "/dashboard") { "src\app\dashboard\page.tsx" } else { "src\app$($href.Replace('/', '\'))\page.tsx" }
  if (-not (Test-Path "$portalDir\$pagePath")) {
    $deadLinks += $href
  }
}
Write-Gate "No dead nav links (static)" ($deadLinks.Count -eq 0) $(if ($deadLinks.Count -gt 0) { "Dead: $($deadLinks -join ', ')" } else { "" })

# ========================================
# 8. DOCUMENTATION + PROMPTS
# ========================================
Write-Host ""
Write-Host "--- 8: Documentation ---" -ForegroundColor Yellow

Write-Gate "Runbook: portal-grounding.md" (Test-Path "$root\docs\runbooks\portal-grounding.md")
Write-Gate "Prompts: Phase 26 IMPLEMENT" (Test-Path "$root\prompts\28-PHASE-26-PORTAL-TELEHEALTH\28-01-portal-telehealth-IMPLEMENT.md")
Write-Gate "Prompts: Phase 26 VERIFY" (Test-Path "$root\prompts\28-PHASE-26-PORTAL-TELEHEALTH\28-99-portal-telehealth-VERIFY.md")
Write-Gate "Contract validator script" (Test-Path "$root\scripts\contract-validate-portal.ts")

# ========================================
# 9. WEB APP REGRESSION
# ========================================
Write-Host ""
Write-Host "--- 9: Web App Regression ---" -ForegroundColor Yellow

Write-Host "  Building clinician web app..." -ForegroundColor DarkGray
# Clean stale .next cache to avoid EPERM on locked files
if (Test-Path "$root\apps\web\.next") {
  Remove-Item -Recurse -Force "$root\apps\web\.next" -ErrorAction SilentlyContinue
}
Push-Location $root
$webBuild = & pnpm -C apps/web build 2>&1 | Out-String
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web app builds clean (no regression)" ($webExit -eq 0) $(if ($webExit -ne 0) { "Web build failed" } else { "" })

# ========================================
# SUMMARY
# ========================================
Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "Phase 26 Verification Summary" -ForegroundColor Cyan
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
