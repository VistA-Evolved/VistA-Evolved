<#
.SYNOPSIS
  Phase 72 -- Reality Verifier Pack (Anti-False-Green)
.DESCRIPTION
  Verifies all Phase 72 deliverables:
    1. Dead-click audit spec (click-audit.spec.ts) structure + coverage
    2. No-fake-success middleware wired and compilable
    3. Verify-click-audit.ps1 orchestrator exists
    4. verify-latest.ps1 updated
    5. TypeScript compile clean
.PARAMETER SkipDocker
  Skip Docker and live VistA checks.
#>
param([switch]$SkipDocker)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot | Split-Path
$webDir = Join-Path (Join-Path $repoRoot "apps") "web"
$apiDir = Join-Path (Join-Path $repoRoot "apps") "api"

Write-Host ""
Write-Host "=== Phase 72 -- Reality Verifier Pack ===" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0

function Gate([string]$label, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $label" -ForegroundColor Red
    $script:fail++
  }
}

# ================================================================
# Section 1: click-audit.spec.ts structure
# ================================================================
Write-Host ""
Write-Host "-- click-audit.spec.ts (dead-click audit) --" -ForegroundColor Cyan

$specFile = Join-Path (Join-Path $webDir "e2e") "click-audit.spec.ts"
Gate "click-audit.spec.ts exists" (Test-Path -LiteralPath $specFile)

$spec = ""
if (Test-Path -LiteralPath $specFile) { $spec = Get-Content -Raw $specFile }

# Network interception (not just DOM checks)
Gate "Intercepts network requests (page.on request)" ($spec -match "page\.on\([`"']request")

# Covers all required chart screens
Gate "Covers Cover Sheet" ($spec -match "Cover\s*Sheet")
Gate "Covers Problems tab" ($spec -match "Problems.*problems")
Gate "Covers Meds tab" ($spec -match "Meds.*meds")
Gate "Covers Orders tab" ($spec -match "Orders.*orders")
Gate "Covers Notes tab" ($spec -match "Notes.*notes")
Gate "Covers Labs tab" ($spec -match "Labs.*labs")
Gate "Covers Imaging tab" ($spec -match "Imaging.*imaging")

# Navigation screens
Gate "Covers Inbox" ($spec -match "Inbox.*inbox")
Gate "Covers Messages" ($spec -match "Messages.*messages")

# Admin screens
Gate "Covers Admin Modules" ($spec -match "Admin\s*Modules")
Gate "Covers Admin RCM" ($spec -match "Admin\s*RCM")
Gate "Covers Admin Analytics" ($spec -match "Admin\s*Analytics")

# Detection methods
Gate "Checks URL change (navigation)" ($spec -match "afterUrl\s*!==\s*beforeUrl|URL.*changed|navigated")
Gate "Checks dialog/modal open" ($spec -match "DIALOG_SELECTOR|dialog.*opened|modal.*opened")
Gate "Checks popover/dropdown" ($spec -match "POPOVER_SELECTOR|popover|dropdown")
Gate "Checks toast/notification" ($spec -match "TOAST_SELECTOR|toast|notification")
Gate "Checks disabled-with-tooltip" ($spec -match "isDisabledWithTooltip|disabled.*tooltip")

# Failure reporting
Gate "Reports dead-click with selector" ($spec -match "DEAD.*selector|dead-click|dead.click.*selector")
Gate "Uses setupConsoleGate helper" ($spec -match "setupConsoleGate")

# Tab content rendering check
Gate "Tests all chart tab slugs render content" ($spec -match "cover.*problems.*meds.*orders.*notes|tabSlugs")

# Pending label check
Gate "Checks pending elements have target info" ($spec -match "pending.*target|integration.*pending.*RPC|barePending")

# ================================================================
# Section 2: no-fake-success middleware
# ================================================================
Write-Host ""
Write-Host "-- no-fake-success.ts (API tripwire) --" -ForegroundColor Cyan

$mwFile = Join-Path (Join-Path (Join-Path $apiDir "src") "middleware") "no-fake-success.ts"
Gate "no-fake-success.ts exists" (Test-Path -LiteralPath $mwFile)

$mw = ""
if (Test-Path -LiteralPath $mwFile) { $mw = Get-Content -Raw $mwFile }

Gate "Has registerNoFakeSuccessHook export" ($mw -match "export\s+function\s+registerNoFakeSuccessHook")
Gate "Checks ok: true responses" ($mw -match "parsed\.ok.*true")
Gate "Has effectProof field list" ($mw -match "effectProof|EFFECT_PROOF_FIELDS")
Gate "Has pendingTargets field" ($mw -match "pendingTargets")
Gate "Exempts health/ready/ping" ($mw -match "health|ready|ping")
Gate "Exempts auth endpoints" ($mw -match "\/auth")
Gate "Logs violations" ($mw -match "log\.warn.*violation|violation.*log")
Gate "Supports strict mode" ($mw -match "STRICT_MODE|NO_FAKE_SUCCESS_STRICT")
Gate "Exports violation query function" ($mw -match "export\s+function\s+getFakeSuccessViolation")

# ================================================================
# Section 3: index.ts integration
# ================================================================
Write-Host ""
Write-Host "-- index.ts (hook registration) --" -ForegroundColor Cyan

$indexFile = Join-Path (Join-Path $apiDir "src") "index.ts"
$idx = ""
if (Test-Path -LiteralPath $indexFile) { $idx = Get-Content -Raw $indexFile }

Gate "Imports registerNoFakeSuccessHook" ($idx -match "import.*registerNoFakeSuccessHook.*no-fake-success")
Gate "Calls registerNoFakeSuccessHook(server)" ($idx -match "registerNoFakeSuccessHook\(server\)")
Gate "Has /admin/fake-success-violations endpoint" ($idx -match "fake-success-violations")

# ================================================================
# Section 4: verify-click-audit.ps1 orchestrator
# ================================================================
Write-Host ""
Write-Host "-- verify-click-audit.ps1 (orchestrator) --" -ForegroundColor Cyan

$orchFile = Join-Path (Join-Path (Join-Path $repoRoot "scripts") "verify") "verify-click-audit.ps1"
Gate "verify-click-audit.ps1 exists" (Test-Path -LiteralPath $orchFile)

$orch = ""
if (Test-Path -LiteralPath $orchFile) { $orch = Get-Content -Raw $orchFile }

Gate "Orchestrator checks spec structure" ($orch -match "click-audit\.spec\.ts")
Gate "Orchestrator saves artifacts" ($orch -match "artifacts.*verify.*phase72|artifactDir")
Gate "Orchestrator can run Playwright" ($orch -match "playwright")

# ================================================================
# Section 5: verify-latest.ps1 updated
# ================================================================
Write-Host ""
Write-Host "-- verify-latest.ps1 --" -ForegroundColor Cyan

$latestFile = Join-Path (Join-Path $repoRoot "scripts") "verify-latest.ps1"
$latest = ""
if (Test-Path -LiteralPath $latestFile) { $latest = Get-Content -Raw $latestFile }

Gate "verify-latest.ps1 points to Phase 72" ($latest -match "phase72|phase-72|Phase 72")

# ================================================================
# Section 6: TypeScript compile
# ================================================================
Write-Host ""
Write-Host "-- TypeScript compile --" -ForegroundColor Cyan

Push-Location $apiDir
$tscApi = & pnpm exec tsc --noEmit 2>&1 | Out-String
$apiClean = ($LASTEXITCODE -eq 0)
Pop-Location
Gate "apps/api TSC clean" $apiClean

Push-Location $webDir
$tscWeb = & pnpm exec tsc --noEmit 2>&1 | Out-String
$webClean = ($LASTEXITCODE -eq 0)
Pop-Location
Gate "apps/web TSC clean" $webClean

# ================================================================
# Section 7: No forbidden patterns
# ================================================================
Write-Host ""
Write-Host "-- Anti-pattern checks --" -ForegroundColor Cyan

# No console.log in middleware
$mwNoConsole = -not ($mw -match "console\.log\(")
Gate "no-fake-success.ts has no console.log" $mwNoConsole

# Spec uses proper auth pattern
Gate "click-audit.spec.ts uses auth.setup dependency" ($spec -match "setupConsoleGate|auth\.setup")

# No hardcoded credentials in new files
$noCreds = -not (($spec + $mw) -match "PROV123|NURSE123|PHARM123")
Gate "No hardcoded credentials in new files" $noCreds

# ================================================================
# Summary
# ================================================================
$total = $pass + $fail
Write-Host ""
Write-Host "=== Phase 72 Results: $pass/$total passed ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host ""

exit $fail
