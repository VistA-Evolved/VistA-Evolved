# scripts/perf/run-soak.ps1
# Phase 504 -- Performance Smoke / Soak Test Runner
# ASCII only (BUG-055). PowerShell 5.1 compatible.
#
# Usage:
#   powershell -File scripts\perf\run-soak.ps1 -Mode smoke

param(
  [ValidateSet("smoke","full")]
  [string]$Mode = "smoke"
)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Write-Host "Performance $Mode Test (Phase 504)"
Write-Host "  Root: $root"
Write-Host ""

$allResults = New-Object System.Collections.ArrayList
$totalFail = 0

function RunBench([string]$label, [string]$cmd, [int]$budgetMs) {
  Write-Host "  Measuring: $label (budget: ${budgetMs}ms)"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $ec = 0
  try {
    Push-Location $root
    Invoke-Expression "$cmd 2>&1" | Out-Null
    $ec = $LASTEXITCODE
    Pop-Location
  } catch {
    $ec = 1
    Pop-Location
  }
  $sw.Stop()
  $ms = $sw.ElapsedMilliseconds
  $ok = ($ms -le $budgetMs) -and ($ec -eq 0)
  $tag = if ($ok) { "PASS" } else { "FAIL" }
  Write-Host "    [$tag] ${ms}ms (exit=$ec)"
  return @{ label = $label; status = $tag; budgetMs = $budgetMs; actualMs = [int]$ms; exitCode = $ec }
}

if ($Mode -eq "smoke") {
  $r = RunBench "TypeScript API compile" "pnpm -C apps/api exec tsc --noEmit" 60000
  [void]$allResults.Add($r)
  if ($r.status -eq "FAIL") { $totalFail++ }

  $r = RunBench "TypeScript Web compile" "pnpm -C apps/web exec tsc --noEmit" 30000
  [void]$allResults.Add($r)
  if ($r.status -eq "FAIL") { $totalFail++ }

  $r = RunBench "Phase index build" "node scripts/build-phase-index.mjs" 15000
  [void]$allResults.Add($r)
  if ($r.status -eq "FAIL") { $totalFail++ }

  $r = RunBench "Prompts tree health" "node scripts/qa-gates/prompts-tree-health.mjs" 5000
  [void]$allResults.Add($r)
  if ($r.status -eq "FAIL") { $totalFail++ }

  $r = RunBench "RPC trace compare" "node scripts/qa-gates/rpc-trace-compare.mjs" 5000
  [void]$allResults.Add($r)
  if ($r.status -eq "FAIL") { $totalFail++ }

  $r = RunBench "Production posture" "node scripts/qa-gates/prod-posture.mjs" 5000
  [void]$allResults.Add($r)
  if ($r.status -eq "FAIL") { $totalFail++ }
}

if ($Mode -eq "full") {
  Write-Host "  Full mode requires running API + k6. NEEDS-RUN-IN-ENV."
  [void]$allResults.Add(@{ label = "Full soak"; status = "SKIP"; budgetMs = 0; actualMs = 0; exitCode = 0 })
}

$passN = @($allResults | Where-Object { $_.status -eq "PASS" }).Count
$skipN = @($allResults | Where-Object { $_.status -eq "SKIP" }).Count

Write-Host ""
Write-Host "  === Summary ==="
Write-Host "  PASS: $passN  FAIL: $totalFail  SKIP: $skipN"

$evDir = Join-Path $root "evidence\wave-35\504-W35-P5-PERF-BUDGETS"
if (-not (Test-Path -LiteralPath $evDir)) {
  New-Item -ItemType Directory -Path $evDir -Force | Out-Null
}

$report = @{
  generatedAt = (Get-Date -Format 'o')
  mode        = $Mode
  pass        = $passN
  fail        = $totalFail
  skip        = $skipN
  results     = [object[]]$allResults.ToArray()
}

$jsonText = $report | ConvertTo-Json -Depth 5
$reportFile = Join-Path $evDir "perf-smoke-report.json"
[System.IO.File]::WriteAllText($reportFile, $jsonText, [System.Text.Encoding]::ASCII)
Write-Host "  Report: $reportFile"

if ($totalFail -gt 0) { exit 1 } else { exit 0 }
