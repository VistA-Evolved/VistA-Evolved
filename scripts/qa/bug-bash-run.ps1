# scripts/qa/bug-bash-run.ps1
# Phase 502 -- Bug Bash Harness + Defect Registry Generator
# Scans BUG-TRACKER.md + codebase for defects, produces a registry,
# and checks against the defect budget.
#
# Usage:
#   .\scripts\qa\bug-bash-run.ps1          # Generate registry
#   .\scripts\qa\bug-bash-run.ps1 -Check   # Generate + check budget
#
# ASCII only (BUG-055). PowerShell 5.1 compatible.

param(
  [switch]$Check
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$artifactsDir = Join-Path $root "artifacts"
if (-not (Test-Path -LiteralPath $artifactsDir)) {
  New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
}
$registryFile = Join-Path $artifactsDir "defect-registry.json"
$budgetFile   = Join-Path $root "docs\qa\defect-budget.json"
$bugTrackerFile = Join-Path $root "docs\BUG-TRACKER.md"

Write-Host "Bug Bash Harness (Phase 502)"
Write-Host ""

# ---- 1. Parse BUG-TRACKER.md ----
$trackerBugs = @()
if (Test-Path -LiteralPath $bugTrackerFile) {
  $lines = Get-Content -Path $bugTrackerFile
  $currentBug = $null
  foreach ($line in $lines) {
    # Match BUG-NNN headings
    if ($line -match '##\s+(BUG-(\d+))') {
      if ($currentBug) { $trackerBugs += $currentBug }
      $currentBug = @{
        id       = $Matches[1]
        number   = [int]$Matches[2]
        severity = "P3"
        status   = "unknown"
        title    = $line -replace '##\s+BUG-\d+\s*[-:]*\s*', ''
      }
    }
    if ($currentBug) {
      # Infer severity from keywords in the bug section
      if ($line -match 'crash|data loss|security|credential|injection') {
        $currentBug.severity = "P0"
      } elseif ($line -match 'hang|block|silent fail|no-op|wrong result') {
        if ($currentBug.severity -ne "P0") { $currentBug.severity = "P1" }
      } elseif ($line -match 'regression|workaround|degraded') {
        if ($currentBug.severity -notin @("P0","P1")) { $currentBug.severity = "P2" }
      }
      # Check if fixed
      if ($line -match '\*\*Fix\*\*|\*\*Fixed\*\*|Status:\s*fixed|resolved') {
        $currentBug.status = "fixed"
      }
    }
  }
  if ($currentBug) { $trackerBugs += $currentBug }
}

Write-Host "  BUG-TRACKER.md: $($trackerBugs.Count) bugs found"

# ---- 2. Scan codebase for TODO/FIXME/HACK/BUG ----
$codeDefects = @()
$scanDirs = @("apps/api/src", "apps/web/src", "apps/portal/src")
foreach ($dir in $scanDirs) {
  $fullDir = Join-Path $root $dir
  if (-not (Test-Path -LiteralPath $fullDir)) { continue }
  $files = Get-ChildItem -Path $fullDir -Recurse -Include "*.ts","*.tsx" -File
  foreach ($f in $files) {
    $lineNum = 0
    foreach ($fline in (Get-Content -LiteralPath $f.FullName)) {
      $lineNum++
      if ($fline -match '(TODO|FIXME|HACK|BUG-\d+)') {
        $tag = $Matches[1]
        $sev = "P3"
        if ($tag -eq "FIXME") { $sev = "P2" }
        if ($tag -eq "HACK")  { $sev = "P2" }
        $relPath = $f.FullName.Substring($root.Length + 1) -replace '\\','/'
        $codeDefects += @{
          file     = $relPath
          line     = $lineNum
          tag      = $tag
          severity = $sev
          text     = $fline.Trim().Substring(0, [Math]::Min($fline.Trim().Length, 120))
        }
      }
    }
  }
}

Write-Host "  Code scan: $($codeDefects.Count) TODO/FIXME/HACK/BUG markers"

# ---- 3. Build severity counts ----
$counts = @{ P0 = 0; P1 = 0; P2 = 0; P3 = 0 }

# Count open tracker bugs (not fixed)
foreach ($b in $trackerBugs) {
  if ($b.status -ne "fixed") {
    $counts[$b.severity]++
  }
}

# Count code defects
foreach ($d in $codeDefects) {
  $counts[$d.severity]++
}

Write-Host ""
Write-Host "  Severity counts:"
Write-Host "    P0: $($counts.P0)"
Write-Host "    P1: $($counts.P1)"
Write-Host "    P2: $($counts.P2)"
Write-Host "    P3: $($counts.P3)"

# ---- 4. Write registry ----
$registry = @{
  generatedAt   = (Get-Date -Format 'o')
  trackerBugs   = $trackerBugs.Count
  codeMarkers   = $codeDefects.Count
  openBySeverity = $counts
  trackerEntries = $trackerBugs | ForEach-Object {
    @{ id = $_.id; severity = $_.severity; status = $_.status; title = $_.title }
  }
}

$jsonText = $registry | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($registryFile, $jsonText, [System.Text.Encoding]::ASCII)
Write-Host ""
Write-Host "  Registry: $registryFile"

# ---- 5. Budget check (if -Check) ----
if ($Check) {
  Write-Host ""
  Write-Host "  --- Budget Check ---"

  if (-not (Test-Path -LiteralPath $budgetFile)) {
    Write-Host "  FAIL: Budget file not found: $budgetFile"
    exit 1
  }

  $budgetRaw = [System.IO.File]::ReadAllText($budgetFile, [System.Text.Encoding]::UTF8)
  if ($budgetRaw[0] -eq [char]0xFEFF) { $budgetRaw = $budgetRaw.Substring(1) }
  $budget = $budgetRaw | ConvertFrom-Json

  $failures = 0
  foreach ($sev in @("P0","P1","P2","P3")) {
    $threshold = $budget.thresholds.$sev
    $actual = $counts[$sev]
    $ok = $actual -le $threshold
    $tag = if ($ok) { "PASS" } else { "FAIL" }
    Write-Host "    [$tag] $sev : $actual / $threshold"
    if (-not $ok) { $failures++ }
  }

  if ($failures -gt 0) {
    Write-Host ""
    Write-Host "  FAIL: $failures severity thresholds exceeded"
    exit 1
  } else {
    Write-Host ""
    Write-Host "  PASS: All severity thresholds within budget"
    exit 0
  }
} else {
  exit 0
}
