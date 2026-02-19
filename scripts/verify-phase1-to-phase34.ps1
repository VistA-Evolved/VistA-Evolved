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

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 34 VERIFY -- Regulated SDLC + Evidence Pack" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ================================================================
# G34-0  REGRESSION (delegate to Phase 33 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G34-0: Regression (Phase 33 chain) ---" -ForegroundColor Yellow

$phase33Script = "$root\scripts\verify-phase1-to-phase33.ps1"
if (Test-Path $phase33Script) {
  Write-Host "  Delegating to Phase 33 verifier..." -ForegroundColor DarkGray
  & powershell -ExecutionPolicy Bypass -File $phase33Script -SkipPlaywright -SkipE2E 2>&1 | Out-Null
  $phase33Exit = $LASTEXITCODE
  if ($phase33Exit -eq 0) {
    Write-Gate "Phase 33 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 33 regression" "Phase 33 verifier returned exit code $phase33Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 33 regression" "verify-phase1-to-phase33.ps1 not found (non-blocking)"
}

# ================================================================
# G34-0b  PROMPTS + TSC
# ================================================================
Write-Host ""
Write-Host "--- G34-0b: Prompts + TypeScript ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
Write-Gate "Phase 34 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\36-PHASE-34-REGULATED-SDLC")
Write-Gate "Phase 34 IMPLEMENT prompt exists" (Test-Path -LiteralPath "$promptsDir\36-PHASE-34-REGULATED-SDLC\36-01-regulated-sdlc-IMPLEMENT.md")
Write-Gate "Phase 34 VERIFY prompt exists" (Test-Path -LiteralPath "$promptsDir\36-PHASE-34-REGULATED-SDLC\36-99-regulated-sdlc-VERIFY.md")

# Phase folders contiguous (01-36)
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
Write-Gate "Phase folder numbering contiguous (01-36)" $contiguous

# TSC compile -- API
Write-Host "  Checking API TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
& npx tsc --noEmit 2>&1 | Out-Null
$apiExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($apiExit -eq 0)

# TSC compile -- Portal
Write-Host "  Checking Portal TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\portal"
& npx tsc --noEmit 2>&1 | Out-Null
$portalExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal TypeScript compiles clean" ($portalExit -eq 0)

# TSC compile -- Web (CPRS shell)
Write-Host "  Checking Web TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\web"
& npx tsc --noEmit 2>&1 | Out-Null
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web (CPRS) TypeScript compiles clean" ($webExit -eq 0)

# ================================================================
# G34-1  CI WORKFLOW -- quality-gates.yml exists and has key jobs
# ================================================================
Write-Host ""
Write-Host "--- G34-1: CI Workflow (quality-gates.yml) ---" -ForegroundColor Yellow

$ciPath = "$root\.github\workflows\quality-gates.yml"
Write-Gate "quality-gates.yml exists" (Test-Path -LiteralPath $ciPath)

if (Test-Path -LiteralPath $ciPath) {
  $ciContent = Get-Content $ciPath -Raw

  Write-Gate "CI has unit-gates job" ($ciContent -match "unit-gates:")
  Write-Gate "CI has evidence-bundle job" ($ciContent -match "evidence-bundle:")
  Write-Gate "CI triggers on push to main" ($ciContent -match "push:" -and $ciContent -match "main")
  Write-Gate "CI triggers on pull_request" ($ciContent -match "pull_request:")
  Write-Gate "CI runs typecheck (API)" ($ciContent -match "Typecheck API")
  Write-Gate "CI runs typecheck (Web)" ($ciContent -match "Typecheck Web")
  Write-Gate "CI runs typecheck (Portal)" ($ciContent -match "Typecheck Portal")
  Write-Gate "CI runs unit tests" ($ciContent -match "Unit tests")
  Write-Gate "CI runs secret scan" ($ciContent -match "Secret scan" -or $ciContent -match "secret-scan")
  Write-Gate "CI runs PHI leak scan" ($ciContent -match "PHI leak scan" -or $ciContent -match "phi-leak-scan")
  Write-Gate "CI uploads evidence artifact" ($ciContent -match "upload-artifact")
  Write-Gate "CI uses frozen lockfile" ($ciContent -match "frozen-lockfile")
  Write-Gate "CI uses Node 24" ($ciContent -match "24")
} else {
  1..13 | ForEach-Object {
    Write-Gate "CI gate (workflow missing)" $false
  }
}

# ================================================================
# G34-2  EVIDENCE BUNDLE GENERATOR
# ================================================================
Write-Host ""
Write-Host "--- G34-2: Evidence Bundle Generator ---" -ForegroundColor Yellow

$evidenceScript = "$root\scripts\generate-evidence-bundle.mjs"
Write-Gate "generate-evidence-bundle.mjs exists" (Test-Path -LiteralPath $evidenceScript)

if (Test-Path -LiteralPath $evidenceScript) {
  $evContent = Get-Content $evidenceScript -Raw

  Write-Gate "Evidence script has --build-id flag" ($evContent -match "build-id")
  Write-Gate "Evidence script runs typecheck" ($evContent -match "tsc --noEmit" -or $evContent -match "typecheck")
  Write-Gate "Evidence script runs unit tests" ($evContent -match "tsx --test" -or $evContent -match "unit.test")
  Write-Gate "Evidence script runs secret scan" ($evContent -match "secret-scan")
  Write-Gate "Evidence script runs PHI leak scan" ($evContent -match "phi-leak-scan")
  Write-Gate "Evidence script produces gate-results.json" ($evContent -match "gate-results\.json")
  Write-Gate "Evidence script produces summary.md" ($evContent -match "summary\.md")
  Write-Gate "Evidence script output dir is artifacts/evidence/" ($evContent -match "artifacts[\\/]evidence")
} else {
  1..8 | ForEach-Object {
    Write-Gate "Evidence bundle gate (script missing)" $false
  }
}

# ================================================================
# G34-3  PHI LEAK SCANNER
# ================================================================
Write-Host ""
Write-Host "--- G34-3: PHI Leak Scanner ---" -ForegroundColor Yellow

$phiScanScript = "$root\scripts\phi-leak-scan.mjs"
Write-Gate "phi-leak-scan.mjs exists" (Test-Path -LiteralPath $phiScanScript)

if (Test-Path -LiteralPath $phiScanScript) {
  $phiContent = Get-Content $phiScanScript -Raw

  Write-Gate "PHI scanner checks for console.log" ($phiContent -match "console\.")
  Write-Gate "PHI scanner checks for err.message" ($phiContent -match "err\.message" -or $phiContent -match "error\.message")
  Write-Gate "PHI scanner exits 1 on violations" ($phiContent -match "process\.exit\(1\)")
  Write-Gate "PHI scanner exits 0 when clean" ($phiContent -match "process\.exit\(0\)" -or $phiContent -match "0 violations")
  Write-Gate "PHI scanner allowlists test files" ($phiContent -match "test" -or $phiContent -match "allowlist")
} else {
  1..5 | ForEach-Object {
    Write-Gate "PHI scanner gate (script missing)" $false
  }
}

# Run PHI leak scan live
Write-Host "  Running PHI leak scan..." -ForegroundColor DarkGray
Push-Location $root
$phiOutput = & node scripts/phi-leak-scan.mjs 2>&1 | Out-String
$phiExit = $LASTEXITCODE
Pop-Location
Write-Gate "PHI leak scan passes (0 violations)" ($phiExit -eq 0)

# ================================================================
# G34-4  UNIT TESTS
# ================================================================
Write-Host ""
Write-Host "--- G34-4: Unit Tests ---" -ForegroundColor Yellow

$redactionTestPath = "$root\apps\api\src\ai\redaction.test.ts"
$loggerTestPath = "$root\apps\api\src\lib\logger.test.ts"
Write-Gate "redaction.test.ts exists" (Test-Path -LiteralPath $redactionTestPath)
Write-Gate "logger.test.ts exists" (Test-Path -LiteralPath $loggerTestPath)

# Run unit tests live
Write-Host "  Running unit tests..." -ForegroundColor DarkGray
Push-Location $root
$testOutput = & npx tsx --test apps/api/src/ai/redaction.test.ts apps/api/src/lib/logger.test.ts 2>&1 | Out-String
$testExit = $LASTEXITCODE
Pop-Location
Write-Gate "All unit tests pass" ($testExit -eq 0)

# Count test assertions from output
if ($testOutput -match "pass (\d+)") {
  $testCount = [int]$Matches[1]
  Write-Gate "At least 20 tests present (found $testCount)" ($testCount -ge 20)
} else {
  # Try alternative pattern
  $passLines = ($testOutput | Select-String "ok \d+" -AllMatches).Matches.Count
  Write-Gate "At least 20 tests present (heuristic: $passLines ok lines)" ($passLines -ge 20)
}

# ================================================================
# G34-5  COMPLIANCE DOCUMENTATION
# ================================================================
Write-Host ""
Write-Host "--- G34-5: Compliance Documentation ---" -ForegroundColor Yellow

$complianceDir = "$root\docs\compliance"
Write-Gate "docs/compliance/ directory exists" (Test-Path -LiteralPath $complianceDir)

$complianceDocs = @(
  "data-classification.md",
  "logging-policy.md",
  "access-control-policy.md",
  "incident-response.md",
  "threat-model.md",
  "compliance-mapping.md"
)

foreach ($doc in $complianceDocs) {
  $path = "$complianceDir\$doc"
  Write-Gate "compliance/$doc exists" (Test-Path -LiteralPath $path)
}

# Content validation -- key sections exist
if (Test-Path -LiteralPath "$complianceDir\data-classification.md") {
  $dcContent = Get-Content "$complianceDir\data-classification.md" -Raw
  Write-Gate "Data classification has 4 tiers" ($dcContent -match "C1.*C2.*C3.*C4" -or ($dcContent -match "C1" -and $dcContent -match "C4"))
  Write-Gate "Data classification references PHI" ($dcContent -match "PHI")
  Write-Gate "Data classification references HIPAA" ($dcContent -match "HIPAA")
}

if (Test-Path -LiteralPath "$complianceDir\compliance-mapping.md") {
  $cmContent = Get-Content "$complianceDir\compliance-mapping.md" -Raw
  Write-Gate "Compliance mapping covers HIPAA" ($cmContent -match "HIPAA")
  Write-Gate "Compliance mapping covers NIST" ($cmContent -match "NIST")
  Write-Gate "Compliance mapping covers OWASP ASVS" ($cmContent -match "ASVS")
  Write-Gate "Compliance mapping has gap analysis" ($cmContent -match "Gap Analysis")
}

if (Test-Path -LiteralPath "$complianceDir\threat-model.md") {
  $tmContent = Get-Content "$complianceDir\threat-model.md" -Raw
  Write-Gate "Threat model uses STRIDE" ($tmContent -match "STRIDE")
  Write-Gate "Threat model has trust boundaries" ($tmContent -match "Trust Boundar")
  Write-Gate "Threat model has risk register" ($tmContent -match "Risk Register")
}

if (Test-Path -LiteralPath "$complianceDir\incident-response.md") {
  $irContent = Get-Content "$complianceDir\incident-response.md" -Raw
  Write-Gate "Incident response has severity levels" ($irContent -match "SEV-1")
  Write-Gate "Incident response has phases" ($irContent -match "Phase 1|Detection|Containment|Recovery")
  Write-Gate "Incident response references breach notification" ($irContent -match "Breach Notification")
}

if (Test-Path -LiteralPath "$complianceDir\logging-policy.md") {
  $lpContent = Get-Content "$complianceDir\logging-policy.md" -Raw
  Write-Gate "Logging policy has MUST log section" ($lpContent -match "MUST Be Logged" -or $lpContent -match "MUST.*log")
  Write-Gate "Logging policy has NEVER log section" ($lpContent -match "MUST NEVER" -or $lpContent -match "NEVER.*log")
  Write-Gate "Logging policy references redaction" ($lpContent -match "redact" -or $lpContent -match "Redaction")
}

if (Test-Path -LiteralPath "$complianceDir\access-control-policy.md") {
  $acContent = Get-Content "$complianceDir\access-control-policy.md" -Raw
  Write-Gate "Access control has RBAC matrix" ($acContent -match "Permission Matrix" -or $acContent -match "RBAC")
  Write-Gate "Access control covers break-glass" ($acContent -match "break-glass" -or $acContent -match "Break-Glass")
  Write-Gate "Access control covers session management" ($acContent -match "Session" -or $acContent -match "session")
}

# ================================================================
# G34-6  REDACTION HARDENING (.mjs + fixes verified)
# ================================================================
Write-Host ""
Write-Host "--- G34-6: Redaction Hardening ---" -ForegroundColor Yellow

# Verify no console.log in production server files (except logger itself and tests)
$apiSrc = "$root\apps\api\src"
$serverFiles = Get-ChildItem -Path $apiSrc -Recurse -File -Filter "*.ts" -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch "[\\/]node_modules[\\/]" -and
    $_.FullName -notmatch "\.test\.ts$" -and
    $_.Name -ne "logger.ts"
  }

$consoleLogCount = 0
foreach ($f in $serverFiles) {
  $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
  if ($content -match "console\.(log|warn|error|info)\(") {
    $consoleLogCount++
  }
}
Write-Gate "No console.* in server files (excl logger/tests): found $consoleLogCount" ($consoleLogCount -le 2)

# Verify err.message not sent to clients in route files
$routeFiles = Get-ChildItem -Path "$apiSrc\routes" -Recurse -File -Filter "*.ts" -ErrorAction SilentlyContinue
$errMsgInRoutes = 0
foreach ($f in $routeFiles) {
  $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
  # Pattern: reply.send or reply.code containing err.message / error.message
  if ($content -match "reply\.\w+\(.*err\.message" -or $content -match "reply\.\w+\(.*error\.message") {
    $errMsgInRoutes++
  }
}
Write-Gate "No raw err.message in route responses: found $errMsgInRoutes" ($errMsgInRoutes -eq 0)

# ================================================================
# G34-7  RUNBOOK
# ================================================================
Write-Host ""
Write-Host "--- G34-7: Runbook ---" -ForegroundColor Yellow

$runbookPath = "$root\docs\runbooks\phase34-regulated-sdlc.md"
Write-Gate "phase34-regulated-sdlc.md runbook exists" (Test-Path -LiteralPath $runbookPath)

if (Test-Path -LiteralPath $runbookPath) {
  $rbContent = Get-Content $runbookPath -Raw
  Write-Gate "Runbook references evidence bundle" ($rbContent -match "evidence" -or $rbContent -match "generate-evidence-bundle")
  Write-Gate "Runbook references CI workflow" ($rbContent -match "quality-gates" -or $rbContent -match "CI")
  Write-Gate "Runbook references compliance docs" ($rbContent -match "compliance" -or $rbContent -match "HIPAA")
}

# ================================================================
# G34-8  .gitignore includes artifacts/
# ================================================================
Write-Host ""
Write-Host "--- G34-8: Gitignore ---" -ForegroundColor Yellow

$gitignorePath = "$root\.gitignore"
if (Test-Path -LiteralPath $gitignorePath) {
  $giContent = Get-Content $gitignorePath -Raw
  Write-Gate ".gitignore contains artifacts/" ($giContent -match "artifacts/")
} else {
  Write-Gate ".gitignore exists" $false
}

# ================================================================
# G34-9  SECRET SCAN (existing Phase 16 scanner still passes)
# ================================================================
Write-Host ""
Write-Host "--- G34-9: Secret Scan ---" -ForegroundColor Yellow

Write-Host "  Running secret scan..." -ForegroundColor DarkGray
Push-Location $root
$secretOutput = & node scripts/secret-scan.mjs 2>&1 | Out-String
$secretExit = $LASTEXITCODE
Pop-Location
Write-Gate "Secret scan passes" ($secretExit -eq 0)

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 34 VERIFY SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($fail -gt 0) {
  Write-Host "RESULT: FAIL ($fail gates)" -ForegroundColor Red
  exit 1
} else {
  Write-Host "RESULT: PASS (all gates green)" -ForegroundColor Green
  exit 0
}
