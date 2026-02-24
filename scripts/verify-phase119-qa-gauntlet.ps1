# Phase 119 -- QA Gauntlet Verifier
# Runs the gauntlet framework in the requested suite mode.
# Usage: .\scripts\verify-phase119-qa-gauntlet.ps1 [-Suite fast|rc|full]

param(
    [ValidateSet("fast","rc","full")]
    [string]$Suite = "fast"
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Phase 119 -- QA Gauntlet Verifier (Suite: $Suite)" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$pass = 0
$fail = 0
$warn = 0

function Gate-Pass($name) {
    $script:pass++
    Write-Host "  PASS  $name" -ForegroundColor Green
}
function Gate-Fail($name, $detail) {
    $script:fail++
    Write-Host "  FAIL  $name -- $detail" -ForegroundColor Red
}
function Gate-Warn($name, $detail) {
    $script:warn++
    Write-Host "  WARN  $name -- $detail" -ForegroundColor Yellow
}

# ---- Gate 1: QA framework files exist ----
Write-Host "Gate 1: Framework Files" -ForegroundColor Yellow
$frameworkFiles = @(
    "qa/gauntlet/cli.mjs",
    "qa/gauntlet/build-manifest.mjs",
    "qa/gauntlet/phase-manifest.overrides.json",
    "qa/gauntlet/gates/g0-prompts-integrity.mjs",
    "qa/gauntlet/gates/g1-build-typecheck.mjs",
    "qa/gauntlet/gates/g2-unit-tests.mjs",
    "qa/gauntlet/gates/g3-security-scans.mjs",
    "qa/gauntlet/gates/g4-contract-alignment.mjs",
    "qa/gauntlet/gates/g5-api-smoke.mjs",
    "qa/gauntlet/gates/g6-vista-probe.mjs",
    "qa/gauntlet/gates/g7-restart-durability.mjs",
    "qa/gauntlet/gates/g8-ui-dead-click.mjs",
    "qa/gauntlet/gates/g9-performance-budget.mjs"
)

foreach ($f in $frameworkFiles) {
    $fullPath = Join-Path $root $f
    if (Test-Path -LiteralPath $fullPath) {
        Gate-Pass "File exists: $f"
    } else {
        Gate-Fail "File exists: $f" "not found"
    }
}

# ---- Gate 2: Manifest generation ----
Write-Host "`nGate 2: Manifest Generation" -ForegroundColor Yellow
try {
    Push-Location $root
    $null = node qa/gauntlet/build-manifest.mjs 2>&1
    Pop-Location
    $manifestPath = Join-Path $root "qa/gauntlet/phase-manifest.json"
    if (Test-Path -LiteralPath $manifestPath) {
        $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
        if ($manifest.phaseCount -gt 100) {
            Gate-Pass "Manifest generated ($($manifest.phaseCount) phases)"
        } else {
            Gate-Warn "Manifest phase count low" "$($manifest.phaseCount) phases"
        }
    } else {
        Gate-Fail "Manifest generation" "phase-manifest.json not created"
    }
} catch {
    Gate-Fail "Manifest generation" $_.Exception.Message
}

# ---- Gate 3: Package scripts ----
Write-Host "`nGate 3: Package Scripts" -ForegroundColor Yellow
$pkgPath = Join-Path $root "package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$requiredScripts = @("qa:gauntlet:fast", "qa:gauntlet:rc", "qa:gauntlet:full")
foreach ($s in $requiredScripts) {
    if ($pkg.scripts.PSObject.Properties[$s]) {
        Gate-Pass "Script: $s"
    } else {
        Gate-Fail "Script: $s" "not in package.json"
    }
}

# ---- Gate 4: Prompt files ----
Write-Host "`nGate 4: Prompt Files" -ForegroundColor Yellow
$promptDir = Join-Path $root "prompts/122-PHASE-119-QA-GAUNTLET"
if (Test-Path -LiteralPath (Join-Path $promptDir "119-01-IMPLEMENT.md")) {
    Gate-Pass "119-01-IMPLEMENT.md exists"
} else {
    Gate-Fail "119-01-IMPLEMENT.md" "not found"
}
if (Test-Path -LiteralPath (Join-Path $promptDir "119-99-VERIFY.md")) {
    Gate-Pass "119-99-VERIFY.md exists"
} else {
    Gate-Fail "119-99-VERIFY.md" "not found"
}

# ---- Gate 5: verify-latest points to Phase 119 ----
Write-Host "`nGate 5: verify-latest.ps1" -ForegroundColor Yellow
$verifyLatest = Get-Content (Join-Path $root "scripts/verify-latest.ps1") -Raw
if ($verifyLatest -match "119") {
    Gate-Pass "verify-latest.ps1 references Phase 119"
} else {
    Gate-Fail "verify-latest.ps1" "does not reference Phase 119"
}

# ---- Gate 6: No reports/ folder ----
Write-Host "`nGate 6: Anti-Sprawl" -ForegroundColor Yellow
if (-not (Test-Path -LiteralPath (Join-Path $root "reports"))) {
    Gate-Pass "No reports/ folder"
} else {
    Gate-Fail "No reports/ folder" "reports/ exists"
}

# ---- Gate 7: artifacts/ is gitignored ----
$gitignore = Get-Content (Join-Path $root ".gitignore") -Raw -ErrorAction SilentlyContinue
if ($gitignore -match "artifacts") {
    Gate-Pass "artifacts/ is gitignored"
} else {
    Gate-Fail "artifacts/ is gitignored" "not in .gitignore"
}

# ---- Gate 8: GitHub Actions workflow exists ----
Write-Host "`nGate 8: GitHub Actions" -ForegroundColor Yellow
$workflowPath = Join-Path $root ".github/workflows/qa-gauntlet.yml"
if (Test-Path -LiteralPath $workflowPath) {
    $wf = Get-Content $workflowPath -Raw
    if ($wf -match "gauntlet:fast" -or $wf -match "qa:gauntlet") {
        Gate-Pass "qa-gauntlet.yml references gauntlet"
    } else {
        Gate-Warn "qa-gauntlet.yml" "no gauntlet references found"
    }
} else {
    Gate-Fail "qa-gauntlet.yml" "not found"
}

# ---- Gate 9: Runbook exists ----
Write-Host "`nGate 9: Runbook" -ForegroundColor Yellow
$runbookPath = Join-Path $root "docs/runbooks/qa-gauntlet.md"
if (Test-Path -LiteralPath $runbookPath) {
    Gate-Pass "Runbook: qa-gauntlet.md"
} else {
    Gate-Fail "Runbook: qa-gauntlet.md" "not found"
}

# ---- Gate 10: Run FAST suite (if requested) ----
Write-Host "`nGate 10: Gauntlet FAST Run" -ForegroundColor Yellow
try {
    Push-Location $root
    $gauntletOutput = node qa/gauntlet/cli.mjs --suite fast --ci 2>&1
    $exitCode = $LASTEXITCODE
    Pop-Location
    if ($exitCode -eq 0) {
        Gate-Pass "Gauntlet FAST suite passed"
    } else {
        Gate-Fail "Gauntlet FAST suite" "exit code $exitCode"
        # Show last few lines
        $lines = ($gauntletOutput -split "`n") | Select-Object -Last 5
        foreach ($l in $lines) { Write-Host "        $l" -ForegroundColor DarkGray }
    }
} catch {
    Gate-Fail "Gauntlet FAST suite" $_.Exception.Message
}

# ---- Summary ----
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "  Phase 119 QA Gauntlet Verifier -- Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "============================================================`n" -ForegroundColor Cyan

if ($fail -gt 0) { exit 1 } else { exit 0 }
