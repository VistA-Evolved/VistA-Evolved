<#
.SYNOPSIS
  Phase 72 -- Dead-Click Audit via Playwright
.DESCRIPTION
  Runs the click-audit.spec.ts Playwright suite against the running web app.
  Requires: web app on localhost:3000, API on localhost:3001, VistA Docker.
  Outputs results to artifacts/verify/phase72/ and console summary.
.PARAMETER SkipDocker
  Skip Docker availability check.
.PARAMETER Headed
  Run Playwright in headed (visible) mode.
#>
param(
  [switch]$SkipDocker,
  [switch]$Headed
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$webDir = Join-Path (Join-Path $repoRoot "apps") "web"
$artifactDir = Join-Path (Join-Path (Join-Path $repoRoot "artifacts") "verify") "phase72"

# Ensure artifact directory exists
if (-not (Test-Path -LiteralPath $artifactDir)) {
  New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
}

Write-Host ""
Write-Host "=== Phase 72 -- Dead-Click Audit ===" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$fail = 0
$skip = 0

function Gate([string]$label, [bool]$condition) {
  if ($condition) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  FAIL  $label" -ForegroundColor Red
    $script:fail++
  }
}

function Skip([string]$label, [string]$reason) {
  Write-Host "  SKIP  $label ($reason)" -ForegroundColor Yellow
  $script:skip++
}

# -- Gate 1: click-audit.spec.ts exists
$specFile = Join-Path (Join-Path $webDir "e2e") "click-audit.spec.ts"
Gate "click-audit.spec.ts exists" (Test-Path -LiteralPath $specFile)

# -- Gate 2: Spec has network interception
$specContent = ""
if (Test-Path -LiteralPath $specFile) {
  $specContent = Get-Content -Raw $specFile
}
Gate "Spec intercepts network requests" ($specContent -match "page\.on\([`"']request")

# -- Gate 3: Spec covers chart screens
Gate "Spec covers chart tabs (cover/problems/meds/orders/notes)" `
  (($specContent -match "problems") -and ($specContent -match "orders") -and ($specContent -match "notes"))

# -- Gate 4: Spec checks for disabled-with-tooltip
Gate "Spec checks disabled-with-tooltip pattern" ($specContent -match "disabled.*tooltip|tooltip.*disabled|isDisabledWithTooltip")

# -- Gate 5: Spec reports dead-click selectors
Gate "Spec reports dead-click selectors on failure" ($specContent -match "selector.*dead|dead.*selector|DEAD.*selector")

# -- Gate 6: Spec covers admin screens
Gate "Spec covers admin screens" ($specContent -match "Admin.*Modules|Admin.*RCM|Admin.*Analytics")

# -- Gate 7: Spec covers navigation screens (inbox/messages)
Gate "Spec covers inbox/messages screens" (($specContent -match "Inbox") -and ($specContent -match "Messages"))

# -- Gate 8: Check if Playwright + web app are available for live run
$webAvailable = $false
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
  if ($r.StatusCode -eq 200) { $webAvailable = $true }
} catch {
  # Not available
}

if ($webAvailable) {
  Write-Host ""
  Write-Host "-- Running Playwright click-audit suite --" -ForegroundColor Cyan

  $pwArgs = @("exec", "playwright", "test", "click-audit.spec.ts", "--reporter=json")
  if ($Headed) { $pwArgs += "--headed" }

  Push-Location $webDir
  try {
    $result = & pnpm @pwArgs 2>&1 | Out-String
    $exitCode = $LASTEXITCODE

    # Save raw output
    $result | Out-File -FilePath (Join-Path $artifactDir "click-audit-output.txt") -Encoding utf8

    Gate "Playwright click-audit suite passes" ($exitCode -eq 0)

    # Parse results if JSON available
    $jsonFile = Join-Path $webDir "e2e-results.json"
    if (Test-Path -LiteralPath $jsonFile) {
      Copy-Item $jsonFile (Join-Path $artifactDir "click-audit-results.json") -Force
      try {
        $json = Get-Content -Raw $jsonFile | ConvertFrom-Json
        $totalTests = ($json.suites | ForEach-Object { $_.specs.Count } | Measure-Object -Sum).Sum
        $passedTests = ($json.suites | ForEach-Object { $_.specs | Where-Object { $_.ok } } | Measure-Object).Count
        Write-Host "  Playwright: $passedTests/$totalTests tests passed" -ForegroundColor Gray
      } catch {
        Write-Host "  (Could not parse JSON results)" -ForegroundColor Gray
      }
    }
  } catch {
    Write-Host "  Playwright execution error: $_" -ForegroundColor Yellow
    Gate "Playwright click-audit suite passes" $false
  } finally {
    Pop-Location
  }
} else {
  Skip "Playwright live run" "Web app not running on localhost:3000"
}

# -- Summary
Write-Host ""
Write-Host "=== Click-Audit Results: $pass passed, $fail failed, $skip skipped ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
Write-Host ""

# Save summary
@"
# Phase 72 Click-Audit Verification
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Passed: $pass
Failed: $fail
Skipped: $skip
"@ | Out-File -FilePath (Join-Path $artifactDir "click-audit-summary.txt") -Encoding utf8

exit $fail
