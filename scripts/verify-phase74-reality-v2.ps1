<#
.SYNOPSIS
  Phase 74 -- Reality Verification Pack v2 (E2E Evidence + Click Audit + Tripwires)
.DESCRIPTION
  Verifies all Phase 74 deliverables:
    1. Click audit v2 spec -- structure + extended coverage
    2. Network evidence helper -- structure + API patterns
    3. No-fake-success enhancements -- audit report + tripwire export
    4. Tripwire dead-click test -- executable + all pass
    5. Tripwire fake-success test -- executable + all pass
    6. index.ts integration -- new endpoint
    7. Prompts + verify-latest
    8. TypeScript compile clean
    9. Anti-pattern checks
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
Write-Host "=== Phase 74 -- Reality Verification Pack v2 ===" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0
$warn = 0

function Gate([string]$label, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $label" -ForegroundColor Red
    $script:fail++
  }
}

function Warn([string]$label) {
  Write-Host "  WARN  $label" -ForegroundColor Yellow
  $script:warn++
}

# ================================================================
# Section 1: File Existence
# ================================================================
Write-Host "-- File Existence --" -ForegroundColor Cyan

$files = @(
  (Join-Path (Join-Path $webDir "e2e") "click-audit-v2.spec.ts"),
  (Join-Path (Join-Path (Join-Path $webDir "e2e") "helpers") "network-evidence.ts"),
  (Join-Path (Join-Path $apiDir "src") (Join-Path "middleware" "no-fake-success.ts")),
  (Join-Path (Join-Path $repoRoot "tests") (Join-Path "tripwire" "tripwire-dead-click.test.ts")),
  (Join-Path (Join-Path $repoRoot "tests") (Join-Path "tripwire" "tripwire-fake-success.test.ts")),
  (Join-Path (Join-Path $repoRoot "prompts") (Join-Path "79-PHASE-74-REALITY-VERIFIER-V2" "79-01-IMPLEMENT.md")),
  (Join-Path (Join-Path $repoRoot "prompts") (Join-Path "79-PHASE-74-REALITY-VERIFIER-V2" "79-99-VERIFY.md")),
  (Join-Path (Join-Path $apiDir "src") "index.ts")
)

foreach ($f in $files) {
  $name = Split-Path $f -Leaf
  Gate "$name exists" (Test-Path -LiteralPath $f)
}

# ================================================================
# Section 2: Click Audit v2 Structure
# ================================================================
Write-Host ""
Write-Host "-- Click Audit v2 (spec structure) --" -ForegroundColor Cyan

$specFile = Join-Path (Join-Path $webDir "e2e") "click-audit-v2.spec.ts"
$spec = ""
if (Test-Path -LiteralPath $specFile) { $spec = Get-Content -Raw $specFile }

# Coverage: chart screens
Gate "Covers Cover Sheet" ($spec -match "Cover\s*Sheet.*cover")
Gate "Covers Problems tab" ($spec -match "Problems.*problems")
Gate "Covers Meds tab" ($spec -match "Meds.*meds")
Gate "Covers Orders tab" ($spec -match "Orders.*orders")
Gate "Covers Notes tab" ($spec -match "Notes.*notes")
Gate "Covers Labs tab" ($spec -match "Labs.*labs")
Gate "Covers Imaging tab" ($spec -match "Imaging.*imaging")
Gate "Covers Consults tab" ($spec -match "Consults.*consults")

# Coverage: navigation screens (extended in v2)
Gate "Covers Scheduling" ($spec -match "Scheduling.*scheduling")
Gate "Covers Messages" ($spec -match "Messages.*messages")
Gate "Covers Inbox" ($spec -match "Inbox.*inbox")
Gate "Covers Remote Data Viewer" ($spec -match "Remote\s*Data\s*Viewer")
Gate "Covers Order Sets" ($spec -match "Order\s*Sets")

# Coverage: admin screens (extended in v2)
Gate "Covers Admin Reports" ($spec -match "Admin\s*Reports")
Gate "Covers Admin Migration" ($spec -match "Admin\s*Migration")
Gate "Covers Admin Audit Viewer" ($spec -match "Admin\s*Audit\s*Viewer")

# Detection methods
Gate "Checks URL change (navigation)" ($spec -match "page\.url\(\)\s*!==\s*beforeUrl|navigated")
Gate "Checks network request fire" ($spec -match "networkFired|page\.on.*request")
Gate "Checks dialog/modal open" ($spec -match "DIALOG_SELECTOR|dialog")
Gate "Checks disabled-with-tooltip" ($spec -match "isDisabledWithTooltip")
Gate "Uses setupConsoleGate" ($spec -match "setupConsoleGate")

# Network evidence integration
Gate "Imports NetworkEvidence" ($spec -match "import.*NetworkEvidence.*network-evidence")
Gate "Writes network evidence artifact" ($spec -match "network\.json|flush")

# Tab content rendering
Gate "Tests all chart tab slugs" ($spec -match "tabSlugs")

# Pending label audit
Gate "Checks pending elements have target info" ($spec -match "integration.*pending|barePending")

# ================================================================
# Section 3: Network Evidence Helper
# ================================================================
Write-Host ""
Write-Host "-- Network Evidence Helper --" -ForegroundColor Cyan

$evidenceFile = Join-Path (Join-Path (Join-Path $webDir "e2e") "helpers") "network-evidence.ts"
$ev = ""
if (Test-Path -LiteralPath $evidenceFile) { $ev = Get-Content -Raw $evidenceFile }

Gate "Exports NetworkEvidence class" ($ev -match "export\s+class\s+NetworkEvidence")
Gate "Has start() method" ($ev -match "start\(\)")
Gate "Has flush() method" ($ev -match "flush\(")
Gate "Has buildReport() method" ($ev -match "buildReport\(\)")
Gate "Tracks API request patterns" ($ev -match "isApiRequest|API_PATTERNS")
Gate "Produces _meta + entries + summary structure" (($ev -match "_meta") -and ($ev -match "entries:") -and ($ev -match "summary:"))
Gate "Records method/status/duration" ($ev -match "method.*status.*durationMs|durationMs")

# ================================================================
# Section 4: No-Fake-Success Enhancements
# ================================================================
Write-Host ""
Write-Host "-- No-Fake-Success Enhancements --" -ForegroundColor Cyan

$mwFile = Join-Path (Join-Path (Join-Path $apiDir "src") "middleware") "no-fake-success.ts"
$mw = ""
if (Test-Path -LiteralPath $mwFile) { $mw = Get-Content -Raw $mwFile }

Gate "Has registerNoFakeSuccessHook" ($mw -match "export\s+function\s+registerNoFakeSuccessHook")
Gate "Has getNoFakeSuccessAuditReport" ($mw -match "export\s+function\s+getNoFakeSuccessAuditReport")
Gate "Has validateResponseForTripwire" ($mw -match "export\s+function\s+validateResponseForTripwire")
Gate "Audit report includes strictMode" ($mw -match "strictMode.*STRICT_MODE")
Gate "Audit report includes effectProofFieldCount" ($mw -match "effectProofFieldCount")
Gate "Tripwire returns pass/reason" ($mw -match "pass.*boolean.*reason.*string|pass:.*reason:")

# ================================================================
# Section 5: index.ts Integration
# ================================================================
Write-Host ""
Write-Host "-- index.ts Integration --" -ForegroundColor Cyan

$idx = ""
$idxFile = Join-Path (Join-Path $apiDir "src") "index.ts"
if (Test-Path -LiteralPath $idxFile) { $idx = Get-Content -Raw $idxFile }

Gate "Imports getNoFakeSuccessAuditReport" ($idx -match "getNoFakeSuccessAuditReport")
Gate "Has /admin/fake-success-audit endpoint" ($idx -match "fake-success-audit")

# ================================================================
# Section 6: Tripwire Tests -- Run them
# ================================================================
Write-Host ""
Write-Host "-- Tripwire Tests (execution) --" -ForegroundColor Cyan

# Dead-click tripwire
$dcFile = Join-Path (Join-Path $repoRoot "tests") (Join-Path "tripwire" "tripwire-dead-click.test.ts")
if (Test-Path -LiteralPath $dcFile) {
  try {
    $dcOutput = & npx tsx $dcFile 2>&1 | Out-String
    $dcPassed = ($LASTEXITCODE -eq 0)
    Gate "Tripwire dead-click: all tests pass" $dcPassed
    # Count tests
    $dcMatches = [regex]::Matches($dcOutput, "PASS")
    Gate "Tripwire dead-click: >= 10 test cases" ($dcMatches.Count -ge 10)
    if (-not $dcPassed) { Write-Host $dcOutput }
  } catch {
    Gate "Tripwire dead-click: executed without error" $false
    Gate "Tripwire dead-click: >= 10 test cases" $false
  }
} else {
  Gate "Tripwire dead-click: all tests pass" $false
  Gate "Tripwire dead-click: >= 10 test cases" $false
}

# Fake-success tripwire
$fsFile = Join-Path (Join-Path $repoRoot "tests") (Join-Path "tripwire" "tripwire-fake-success.test.ts")
if (Test-Path -LiteralPath $fsFile) {
  try {
    Push-Location $repoRoot
    $fsOutput = & npx tsx $fsFile 2>&1 | Out-String
    $fsPassed = ($LASTEXITCODE -eq 0)
    Pop-Location
    Gate "Tripwire fake-success: all tests pass" $fsPassed
    $fsMatches = [regex]::Matches($fsOutput, "PASS")
    Gate "Tripwire fake-success: >= 12 test cases" ($fsMatches.Count -ge 12)
    if (-not $fsPassed) { Write-Host $fsOutput }
  } catch {
    Pop-Location
    Gate "Tripwire fake-success: executed without error" $false
    Gate "Tripwire fake-success: >= 12 test cases" $false
  }
} else {
  Gate "Tripwire fake-success: all tests pass" $false
  Gate "Tripwire fake-success: >= 12 test cases" $false
}

# ================================================================
# Section 7: verify-latest.ps1
# ================================================================
Write-Host ""
Write-Host "-- verify-latest.ps1 --" -ForegroundColor Cyan

$latestFile = Join-Path (Join-Path $repoRoot "scripts") "verify-latest.ps1"
$latest = ""
if (Test-Path -LiteralPath $latestFile) { $latest = Get-Content -Raw $latestFile }
Gate "verify-latest.ps1 references Phase 74" ($latest -match "phase74|phase-74|Phase 74")

# ================================================================
# Section 8: TypeScript Compile
# ================================================================
Write-Host ""
Write-Host "-- TypeScript Compile --" -ForegroundColor Cyan

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
# Section 9: Anti-Pattern Checks
# ================================================================
Write-Host ""
Write-Host "-- Anti-Pattern Checks --" -ForegroundColor Cyan

# No console.log in middleware (use structured logger)
$mwNoConsole = -not ($mw -match "console\.log\(")
Gate "no-fake-success.ts has no console.log" $mwNoConsole

# No hardcoded credentials
$allNew = $spec + $ev + (Get-Content -Raw $dcFile -ErrorAction SilentlyContinue) + (Get-Content -Raw $fsFile -ErrorAction SilentlyContinue)
$noCreds = -not ($allNew -match "PROV123|NURSE123|PHARM123")
Gate "No hardcoded credentials in new files" $noCreds

# Tripwire tests are self-contained (no Playwright deps)
$dcContent = ""
if (Test-Path -LiteralPath $dcFile) { $dcContent = Get-Content -Raw $dcFile }
Gate "Dead-click tripwire has no @playwright/test import" (-not ($dcContent -match "@playwright/test"))

# Network evidence uses proper path construction
Gate "Network evidence uses path.resolve or path.join" ($ev -match "path\.(resolve|join|dirname)")

# ================================================================
# Summary
# ================================================================
$total = $pass + $fail
Write-Host ""
Write-Host "=== Phase 74 Results: $pass/$total passed, $warn warning(s) ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host ""

exit $fail
