#Requires -Version 5.1
<#
.SYNOPSIS
  Build the local-vista Docker image using only vendor/upstream sources. No git pull during build.
.DESCRIPTION
  Build context is repo root. Dockerfile copies vendor/upstream/VistA-M and services/vista-distro/routines.
  Logs are written to docker/local-vista/logs/.
.EXAMPLE
  .\scripts\runtime\build-local-vista.ps1
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
  [string]$LogDir = (Join-Path $RepoRoot "docker\local-vista\logs"),
  [string]$ImageTag = "vista-evolved/local-vista:latest"
)

$ErrorActionPreference = "Stop"
if (-not [System.IO.Path]::IsPathRooted($RepoRoot)) { $RepoRoot = (Resolve-Path $RepoRoot).Path }

$dockerfile = Join-Path $RepoRoot "docker\local-vista\build\Dockerfile"
$context = $RepoRoot
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $LogDir "build-$timestamp.log"

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot "vendor\upstream\VistA-M\Packages"))) {
  Write-Error "vendor/upstream/VistA-M/Packages not found. Run scripts/upstream/fetch-worldvista-sources.ps1 first."
  exit 1
}

if (-not (Test-Path -LiteralPath $dockerfile)) {
  Write-Error "Dockerfile not found: $dockerfile"
  exit 1
}

$logParent = Split-Path -Parent $logFile
if (-not (Test-Path -LiteralPath $logParent)) { New-Item -ItemType Directory -Path $logParent -Force | Out-Null }

Write-Host "Building local-vista image (context: $context)"
Write-Host "Log: $logFile"

Push-Location $RepoRoot
try {
  docker build -f docker/local-vista/build/Dockerfile -t $ImageTag . 2>&1 | Tee-Object -FilePath $logFile
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed. Log preserved at: $logFile"
    exit 1
  }
  Write-Host "Build succeeded. Image: $ImageTag"
} finally {
  Pop-Location
}
