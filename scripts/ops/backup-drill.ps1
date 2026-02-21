# Backup & Restore Drill — Phase 62

# USAGE:
#   .\scripts\ops\backup-drill.ps1 [-OutputDir <path>] [-SkipDocker]
#
# PREREQUISITES:
#   - Docker Desktop running (unless -SkipDocker)
#   - WorldVistA container named "wv" running
#
# PRODUCES:
#   <OutputDir>/backup-manifest.json
#   <OutputDir>/app-config-<ts>.tar.gz   (env files, nginx config)
#   <OutputDir>/audit-logs-<ts>.tar.gz   (JSONL audit trails)
#   <OutputDir>/vista-globals-<ts>.tar.gz (Docker volume snapshot — dev only)
#
# This script is a DRILL — it runs a real backup cycle and validates the
# resulting artifacts without relying on any production infrastructure.

param(
  [string]$OutputDir = "artifacts/backups",
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$root = (git rev-parse --show-toplevel 2>$null) ?? $PSScriptRoot

# Resolve output directory relative to repo root
if (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
  $OutputDir = Join-Path $root $OutputDir
}

# Create output directory
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$manifest = @{
  drillTimestamp = (Get-Date).ToUniversalTime().ToString("o")
  artifacts      = @()
  status         = "started"
  errors         = @()
}

function Add-Artifact($name, $path, $sizeBytes, $ok) {
  $manifest.artifacts += @{
    name      = $name
    path      = $path
    sizeBytes = $sizeBytes
    valid     = $ok
  }
}

Write-Host "`n=== Backup Drill (Phase 62) ===" -ForegroundColor Cyan
Write-Host "  Output: $OutputDir"
Write-Host "  Timestamp: $ts`n"

# -------------------------------------------------------------------
# 1. Application config backup
# -------------------------------------------------------------------
Write-Host "[1/4] Backing up application config..." -ForegroundColor Yellow

$configArchive = Join-Path $OutputDir "app-config-$ts.tar.gz"
$tempConfigDir = Join-Path $env:TEMP "ve-backup-config-$ts"
New-Item -ItemType Directory -Path $tempConfigDir -Force | Out-Null

# Collect config files
$configFiles = @(
  "apps/api/.env.example",
  "nginx/nginx.conf",
  "config/modules.json",
  "config/skus.json",
  "config/capabilities.json",
  "config/performance-budgets.json",
  "docker-compose.prod.yml"
)

$copied = 0
foreach ($f in $configFiles) {
  $src = Join-Path $root $f
  if (Test-Path -LiteralPath $src) {
    $destDir = Join-Path $tempConfigDir (Split-Path $f)
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Copy-Item $src (Join-Path $tempConfigDir $f)
    $copied++
  }
}

# Also grab .env.local if it exists (credentials -- encrypt in production!)
$envLocal = Join-Path $root "apps/api/.env.local"
if (Test-Path -LiteralPath $envLocal) {
  $destDir = Join-Path $tempConfigDir "apps/api"
  New-Item -ItemType Directory -Path $destDir -Force | Out-Null
  Copy-Item $envLocal (Join-Path $tempConfigDir "apps/api/.env.local")
  $copied++
}

# Create archive using tar
try {
  Push-Location $tempConfigDir
  tar -czf $configArchive .
  Pop-Location
  $sz = (Get-Item $configArchive).Length
  Add-Artifact "app-config" $configArchive $sz $true
  Write-Host "  [PASS] Config backup ($copied files, $sz bytes)" -ForegroundColor Green
} catch {
  $manifest.errors += "Config backup failed: $_"
  Write-Host "  [FAIL] Config backup: $_" -ForegroundColor Red
}
Remove-Item $tempConfigDir -Recurse -Force -ErrorAction SilentlyContinue

# -------------------------------------------------------------------
# 2. Audit log backup
# -------------------------------------------------------------------
Write-Host "[2/4] Backing up audit logs..." -ForegroundColor Yellow

$auditArchive = Join-Path $OutputDir "audit-logs-$ts.tar.gz"
$logsDir = Join-Path $root "logs"
if (Test-Path -LiteralPath $logsDir) {
  $jsonlFiles = Get-ChildItem $logsDir -Filter "*.jsonl" -ErrorAction SilentlyContinue
  if ($jsonlFiles.Count -gt 0) {
    try {
      Push-Location $logsDir
      tar -czf $auditArchive ($jsonlFiles | ForEach-Object { $_.Name })
      Pop-Location
      $sz = (Get-Item $auditArchive).Length
      Add-Artifact "audit-logs" $auditArchive $sz $true
      Write-Host "  [PASS] Audit log backup ($($jsonlFiles.Count) files, $sz bytes)" -ForegroundColor Green
    } catch {
      $manifest.errors += "Audit log backup failed: $_"
      Write-Host "  [FAIL] Audit log backup: $_" -ForegroundColor Red
    }
  } else {
    Write-Host "  [SKIP] No .jsonl files in logs/" -ForegroundColor DarkYellow
    Add-Artifact "audit-logs" "(none)" 0 $true
  }
} else {
  Write-Host "  [SKIP] logs/ directory does not exist" -ForegroundColor DarkYellow
  Add-Artifact "audit-logs" "(none)" 0 $true
}

# -------------------------------------------------------------------
# 3. VistA Docker volume snapshot (dev sandbox only)
# -------------------------------------------------------------------
if (-not $SkipDocker) {
  Write-Host "[3/4] Backing up VistA Docker volume..." -ForegroundColor Yellow

  $vistaArchive = Join-Path $OutputDir "vista-globals-$ts.tar.gz"
  try {
    # Check if container exists
    $containerExists = docker ps -a --filter "name=wv" --format "{{.Names}}" 2>$null
    if ($containerExists -match "wv") {
      # Stop for consistency
      Write-Host "  Stopping wv container for consistent snapshot..."
      docker stop wv 2>$null | Out-Null

      # Snapshot volume
      docker run --rm -v wv_data:/data -v "${OutputDir}:/backup" alpine `
        tar czf "/backup/vista-globals-$ts.tar.gz" /data 2>$null

      # Restart
      docker start wv 2>$null | Out-Null

      if (Test-Path -LiteralPath $vistaArchive) {
        $sz = (Get-Item $vistaArchive).Length
        Add-Artifact "vista-globals" $vistaArchive $sz $true
        Write-Host "  [PASS] VistA volume backup ($sz bytes)" -ForegroundColor Green
      } else {
        Add-Artifact "vista-globals" "(failed)" 0 $false
        $manifest.errors += "VistA volume archive not created"
        Write-Host "  [FAIL] Archive not created" -ForegroundColor Red
      }
    } else {
      Write-Host "  [SKIP] No 'wv' container found" -ForegroundColor DarkYellow
      Add-Artifact "vista-globals" "(no container)" 0 $true
    }
  } catch {
    $manifest.errors += "VistA volume backup failed: $_"
    Write-Host "  [FAIL] $_" -ForegroundColor Red
    # Ensure container is restarted even on error
    docker start wv 2>$null | Out-Null
  }
} else {
  Write-Host "[3/4] Docker backup skipped (-SkipDocker)" -ForegroundColor DarkYellow
  Add-Artifact "vista-globals" "(skipped)" 0 $true
}

# -------------------------------------------------------------------
# 4. Manifest + validation
# -------------------------------------------------------------------
Write-Host "[4/4] Generating manifest..." -ForegroundColor Yellow

$manifest.status = if ($manifest.errors.Count -eq 0) { "success" } else { "partial" }
$manifest.validArtifacts = ($manifest.artifacts | Where-Object { $_.valid }).Count
$manifest.totalArtifacts = $manifest.artifacts.Count

$manifestPath = Join-Path $OutputDir "backup-manifest.json"
$manifest | ConvertTo-Json -Depth 5 | Set-Content $manifestPath -Encoding utf8

Write-Host "`n=== Backup Drill Complete ===" -ForegroundColor Cyan
Write-Host "  Status: $($manifest.status)"
Write-Host "  Artifacts: $($manifest.validArtifacts)/$($manifest.totalArtifacts) valid"
Write-Host "  Manifest: $manifestPath"

if ($manifest.errors.Count -gt 0) {
  Write-Host "`n  Errors:" -ForegroundColor Red
  foreach ($e in $manifest.errors) {
    Write-Host "    - $e" -ForegroundColor Red
  }
}

Write-Host ""
