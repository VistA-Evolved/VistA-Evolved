#!/usr/bin/env pwsh
# =============================================================================
# VistA Distro Lane -- Build Script
# =============================================================================
# Copies all ZVE*/VEM* custom MUMPS routines from services/vista/ into the
# distro routines directory, then builds the Docker image.
#
# Usage:
#   .\build.ps1                      # copy routines + build
#   .\build.ps1 -SkipBuild           # copy routines only
#   .\build.ps1 -Tag "2026.03.10"    # custom image tag
# =============================================================================

param(
    [switch]$SkipBuild,
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"
$distroDir = $PSScriptRoot
$vistaDir  = Join-Path (Join-Path $distroDir "..") "vista"
$routinesDir = Join-Path $distroDir "routines"

Write-Host "=== VistA Distro Build ===" -ForegroundColor Cyan

# --- Step 1: Copy custom routines ---
Write-Host "`n--- Copying custom MUMPS routines ---"

if (-not (Test-Path $vistaDir)) {
    Write-Error "Source directory not found: $vistaDir"
    exit 1
}

if (-not (Test-Path $routinesDir)) {
    New-Item -ItemType Directory -Path $routinesDir | Out-Null
}

$patterns = @("ZVE*.m", "VEM*.m", "VETEST.m", "VECHECK.m")
$copied = 0
foreach ($pattern in $patterns) {
    $files = Get-ChildItem -Path $vistaDir -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Copy-Item $file.FullName -Destination $routinesDir -Force
        $copied++
    }
}

Write-Host "  Copied $copied routines to $routinesDir"

# Count what we have
$totalRoutines = (Get-ChildItem -Path $routinesDir -Filter "*.m" -ErrorAction SilentlyContinue).Count
Write-Host "  Total routines in distro: $totalRoutines"

if ($SkipBuild) {
    Write-Host "`n--- Build skipped (routines copied) ---" -ForegroundColor Yellow
    exit 0
}

# --- Step 2: Build Docker image ---
Write-Host "`n--- Building Docker image ---"

$buildSha = & git rev-parse --short HEAD 2>$null
if (-not $buildSha) { $buildSha = "dev" }
$buildDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")

$buildArgs = @(
    "build",
    "--build-arg", "BUILD_SHA=$buildSha",
    "--build-arg", "BUILD_DATE=$buildDate",
    "-t", "vista-evolved/vista-distro:$Tag",
    "-f", (Join-Path $distroDir "Dockerfile"),
    $distroDir
)

Write-Host "  Image: vista-evolved/vista-distro:$Tag"
Write-Host "  Build SHA: $buildSha"
Write-Host "  Build Date: $buildDate"

docker @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed"
    exit 1
}

Write-Host "`n=== Build complete ===" -ForegroundColor Green
Write-Host "  Image: vista-evolved/vista-distro:$Tag"
Write-Host "  Run with:"
Write-Host "    docker compose --profile distro up -d"
