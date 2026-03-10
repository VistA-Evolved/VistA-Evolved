# Restore Drill -- Phase 62

# USAGE:
#   .\scripts\ops\restore-drill.ps1 -ManifestPath <path-to-backup-manifest.json> [-SkipDocker]
#
# This script VALIDATES a backup manifest and tests restore of config files.
# For VistA Docker volumes, it verifies the archive is extractable but does
# NOT overwrite the running container's data (safety-first).
#
# PRODUCES:
#   restore-report.json next to the manifest

param(
  [Parameter(Mandatory=$true)]
  [string]$ManifestPath,
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ManifestPath)) {
  Write-Host "[FAIL] Manifest not found: $ManifestPath" -ForegroundColor Red
  exit 1
}

$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$outputDir = Split-Path $ManifestPath
$report = @{
  restoreTimestamp = (Get-Date).ToUniversalTime().ToString("o")
  sourceManifest   = $ManifestPath
  checks           = @()
  status           = "started"
  errors           = @()
}

function Add-Check($name, $pass, $detail) {
  $report.checks += @{ name = $name; pass = $pass; detail = $detail }
}

Write-Host "`n=== Restore Drill (Phase 62) ===" -ForegroundColor Cyan
Write-Host "  Manifest: $ManifestPath"
Write-Host "  Backup timestamp: $($manifest.drillTimestamp)`n"

# -------------------------------------------------------------------
# 1. Validate manifest integrity
# -------------------------------------------------------------------
Write-Host "[1/4] Validating manifest..." -ForegroundColor Yellow

if ($manifest.status -eq "success" -or $manifest.status -eq "partial") {
  Add-Check "manifest-readable" $true "Status: $($manifest.status)"
  Write-Host "  [PASS] Manifest is valid (status: $($manifest.status))" -ForegroundColor Green
} else {
  Add-Check "manifest-readable" $false "Unknown status: $($manifest.status)"
  Write-Host "  [FAIL] Unknown manifest status" -ForegroundColor Red
}

# -------------------------------------------------------------------
# 2. Verify config archive
# -------------------------------------------------------------------
Write-Host "[2/4] Verifying config archive..." -ForegroundColor Yellow

$configArtifact = $manifest.artifacts | Where-Object { $_.name -eq "app-config" } | Select-Object -First 1
if ($configArtifact -and $configArtifact.path -ne "(none)") {
  if (Test-Path -LiteralPath $configArtifact.path) {
    $tempRestore = Join-Path $env:TEMP "ve-restore-test-$(Get-Date -Format 'HHmmss')"
    New-Item -ItemType Directory -Path $tempRestore -Force | Out-Null
    try {
      tar -xzf $configArtifact.path -C $tempRestore 2>$null
      $restored = Get-ChildItem $tempRestore -Recurse -File
      Add-Check "config-extractable" $true "Extracted $($restored.Count) files"
      Write-Host "  [PASS] Config archive extractable ($($restored.Count) files)" -ForegroundColor Green
      
      # Verify key files exist
      $hasModules = $restored | Where-Object { $_.Name -eq "modules.json" }
      $hasNginx = $restored | Where-Object { $_.Name -eq "nginx.conf" }
      if ($hasModules) {
        Add-Check "config-has-modules" $true "modules.json present"
        Write-Host "  [PASS] modules.json found in archive" -ForegroundColor Green
      }
      if ($hasNginx) {
        Add-Check "config-has-nginx" $true "nginx.conf present"
        Write-Host "  [PASS] nginx.conf found in archive" -ForegroundColor Green
      }
    } catch {
      Add-Check "config-extractable" $false "Extract failed: $_"
      $report.errors += "Config extraction failed: $_"
      Write-Host "  [FAIL] Config extraction failed: $_" -ForegroundColor Red
    }
    Remove-Item $tempRestore -Recurse -Force -ErrorAction SilentlyContinue
  } else {
    Add-Check "config-extractable" $false "Archive file missing"
    $report.errors += "Config archive missing at: $($configArtifact.path)"
    Write-Host "  [FAIL] Archive file missing" -ForegroundColor Red
  }
} else {
  Add-Check "config-extractable" $false "No config artifact in manifest"
  Write-Host "  [SKIP] No config artifact" -ForegroundColor DarkYellow
}

# -------------------------------------------------------------------
# 3. Verify audit log archive
# -------------------------------------------------------------------
Write-Host "[3/4] Verifying audit log archive..." -ForegroundColor Yellow

$auditArtifact = $manifest.artifacts | Where-Object { $_.name -eq "audit-logs" } | Select-Object -First 1
if ($auditArtifact -and $auditArtifact.path -ne "(none)") {
  if (Test-Path -LiteralPath $auditArtifact.path) {
    $tempAudit = Join-Path $env:TEMP "ve-restore-audit-$(Get-Date -Format 'HHmmss')"
    New-Item -ItemType Directory -Path $tempAudit -Force | Out-Null
    try {
      tar -xzf $auditArtifact.path -C $tempAudit 2>$null
      $restored = Get-ChildItem $tempAudit -Filter "*.jsonl" -Recurse
      if ($restored.Count -gt 0) {
        # Validate JSONL: each line should be valid JSON
        $firstFile = $restored[0]
        $lines = Get-Content $firstFile.FullName -TotalCount 5
        $validLines = 0
        foreach ($line in $lines) {
          try {
            $null = $line | ConvertFrom-Json
            $validLines++
          } catch {}
        }
        Add-Check "audit-extractable" $true "Extracted $($restored.Count) JSONL files"
        Add-Check "audit-jsonl-valid" ($validLines -gt 0) "$validLines/5 sample lines are valid JSON"
        Write-Host "  [PASS] Audit archive extractable ($($restored.Count) files, $validLines valid sample lines)" -ForegroundColor Green
      } else {
        Add-Check "audit-extractable" $true "Archive extractable but no JSONL found"
        Write-Host "  [PASS] Archive extractable (no JSONL files)" -ForegroundColor DarkYellow
      }
    } catch {
      Add-Check "audit-extractable" $false "Extract failed: $_"
      $report.errors += "Audit extraction failed: $_"
      Write-Host "  [FAIL] Audit extraction failed: $_" -ForegroundColor Red
    }
    Remove-Item $tempAudit -Recurse -Force -ErrorAction SilentlyContinue
  } else {
    Add-Check "audit-extractable" $false "Archive file missing"
    Write-Host "  [FAIL] Archive file missing" -ForegroundColor Red
  }
} else {
  Add-Check "audit-extractable" $true "No audit logs to verify (none backed up)"
  Write-Host "  [SKIP] No audit archive (none were backed up)" -ForegroundColor DarkYellow
}

# -------------------------------------------------------------------
# 4. Verify VistA volume archive (structure only -- no overwrite!)
# -------------------------------------------------------------------
if (-not $SkipDocker) {
  Write-Host "[4/4] Verifying VistA volume archive..." -ForegroundColor Yellow

  $vistaArtifact = $manifest.artifacts | Where-Object { $_.name -eq "vista-globals" } | Select-Object -First 1
  if ($vistaArtifact -and $vistaArtifact.path -notin @("(none)", "(skipped)", "(no container)", "(failed)")) {
    if (Test-Path -LiteralPath $vistaArtifact.path) {
      try {
        # Just list contents -- do NOT extract over live data
        $listing = tar -tzf $vistaArtifact.path 2>$null | Select-Object -First 20
        $hasData = ($listing | Where-Object { $_ -match "data/" }).Count -gt 0
        Add-Check "vista-archive-readable" $true "Archive listing has $($listing.Count) entries"
        Add-Check "vista-has-data-dir" $hasData "data/ directory present: $hasData"
        Write-Host "  [PASS] VistA archive readable ($($listing.Count) entries listed)" -ForegroundColor Green
      } catch {
        Add-Check "vista-archive-readable" $false "Listing failed: $_"
        Write-Host "  [FAIL] VistA archive listing failed: $_" -ForegroundColor Red
      }
    } else {
      Add-Check "vista-archive-readable" $false "Archive file missing"
      Write-Host "  [FAIL] Archive file missing" -ForegroundColor Red
    }
  } else {
    Add-Check "vista-archive-readable" $true "No VistA archive to verify"
    Write-Host "  [SKIP] No VistA volume archive" -ForegroundColor DarkYellow
  }
} else {
  Write-Host "[4/4] Docker restore check skipped (-SkipDocker)" -ForegroundColor DarkYellow
  Add-Check "vista-archive-readable" $true "Skipped (no Docker)"
}

# -------------------------------------------------------------------
# Report
# -------------------------------------------------------------------
$passCount = ($report.checks | Where-Object { $_.pass }).Count
$totalCount = $report.checks.Count
$report.status = if ($report.errors.Count -eq 0) { "success" } else { "partial" }
$report.summary = "$passCount/$totalCount checks passed"

$reportPath = Join-Path $outputDir "restore-report.json"
$report | ConvertTo-Json -Depth 5 | Set-Content $reportPath -Encoding utf8

Write-Host "`n=== Restore Drill Complete ===" -ForegroundColor Cyan
Write-Host "  Status: $($report.status)"
Write-Host "  Checks: $passCount/$totalCount passed"
Write-Host "  Report: $reportPath`n"
