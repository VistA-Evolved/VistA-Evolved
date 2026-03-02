# infra/scripts/build-images.ps1 - Build all Docker images for VistA-Evolved
#Requires -Version 5.1
param(
    [string]$Tag = "dev",
    [string]$Registry = "",
    [switch]$Push,
    [switch]$NoPrune
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$BuildSha = git -C $RepoRoot rev-parse --short HEAD 2>$null
if (-not $BuildSha) { $BuildSha = "unknown" }
$BuildTime = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')

Write-Host "=== VistA-Evolved Docker Image Builder ===" -ForegroundColor Cyan
Write-Host "  Tag:       $Tag" -ForegroundColor Gray
Write-Host "  Registry:  $(if($Registry) {$Registry} else {'(local)'})" -ForegroundColor Gray
Write-Host "  BuildSha:  $BuildSha" -ForegroundColor Gray
Write-Host ""

# Image definitions: name -> Dockerfile path, context path
$images = @(
    @{
        Name = "vista-evolved/api"
        Dockerfile = "apps/api/Dockerfile"
        Context = "."
        Port = 3001
    },
    @{
        Name = "vista-evolved/web"
        Dockerfile = "apps/web/Dockerfile"
        Context = "."
        Port = 3000
    },
    @{
        Name = "vista-evolved/portal"
        Dockerfile = "apps/portal/Dockerfile"
        Context = "."
        Port = 3002
    }
)

$failed = @()
$succeeded = @()

foreach ($img in $images) {
    $fullTag = if ($Registry) { "$Registry/$($img.Name):$Tag" } else { "$($img.Name):$Tag" }
    $df = Join-Path $RepoRoot $img.Dockerfile

    if (-not (Test-Path -LiteralPath $df)) {
        Write-Host "SKIP  $($img.Name) -- Dockerfile not found at $($img.Dockerfile)" -ForegroundColor Yellow
        continue
    }

    Write-Host "BUILD $fullTag ..." -ForegroundColor Green
    $buildArgs = @(
        'build',
        '-f', $df,
        '-t', $fullTag,
        '--build-arg', "BUILD_SHA=$BuildSha",
        '--build-arg', "BUILD_TIME=$BuildTime",
        (Join-Path $RepoRoot $img.Context)
    )

    & docker @buildArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAIL  $fullTag (exit $LASTEXITCODE)" -ForegroundColor Red
        $failed += $fullTag
        continue
    }

    $succeeded += $fullTag
    Write-Host "OK    $fullTag" -ForegroundColor Green

    if ($Push -and $Registry) {
        Write-Host "PUSH  $fullTag ..." -ForegroundColor Cyan
        docker push $fullTag
        if ($LASTEXITCODE -ne 0) {
            Write-Host "PUSH FAIL $fullTag" -ForegroundColor Red
            $failed += "push:$fullTag"
        }
    }
}

# Summary
Write-Host ""
Write-Host "=== Build Summary ===" -ForegroundColor Cyan
Write-Host "  Succeeded: $($succeeded.Count)" -ForegroundColor Green
foreach ($s in $succeeded) { Write-Host "    $s" -ForegroundColor Green }

if ($failed.Count -gt 0) {
    Write-Host "  Failed: $($failed.Count)" -ForegroundColor Red
    foreach ($f in $failed) { Write-Host "    $f" -ForegroundColor Red }
    exit 1
}

Write-Host ""
Write-Host "All images built successfully." -ForegroundColor Green
Write-Host ""

# ── Emit VistA Release Manifest (Phase 449) ────────────────────────
$manifestScript = Join-Path $RepoRoot "scripts" "upstream" "emit-release-manifest.mjs"
if (Test-Path -LiteralPath $manifestScript) {
    Write-Host "Emitting release manifest..." -ForegroundColor Cyan
    Push-Location $RepoRoot
    try {
        node $manifestScript
        Write-Host "  Release manifest written to artifacts/vista-release-manifest.json" -ForegroundColor Green
    } catch {
        Write-Host "  WARN: Release manifest emission failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "  SKIP: emit-release-manifest.mjs not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To load into Kind:" -ForegroundColor Gray
foreach ($s in $succeeded) {
    Write-Host "  kind load docker-image $s --name ve-local" -ForegroundColor Gray
}
