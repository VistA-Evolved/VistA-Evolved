#Requires -Version 5.1
<#
.SYNOPSIS
  Show local-vista container and image status, and how to verify it uses local sources.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
)

$ErrorActionPreference = "Stop"
if (-not [System.IO.Path]::IsPathRooted($RepoRoot)) { $RepoRoot = (Resolve-Path $RepoRoot).Path }

Write-Host "`n=== Local Vista Lane Status ===" -ForegroundColor Cyan
Write-Host ""

# Image
$img = docker images vista-evolved/local-vista:latest --format "{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedAt}}" 2>&1
if ($img) {
  Write-Host "Image: $img"
} else {
  Write-Host "Image vista-evolved/local-vista:latest not found. Run .\scripts\runtime\build-local-vista.ps1 first." -ForegroundColor Yellow
}

# Container
$c = docker ps -a --filter "name=local-vista" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>&1
Write-Host "`nContainer(s):"
Write-Host $c

Write-Host "`nCanonical ports: RPC Broker 9432, SSH 2224"
Write-Host "Verify local sources: Image build-info shows VISTA_SOURCE=vendor/upstream/VistA-M"
Write-Host "  docker run --rm vista-evolved/local-vista:latest cat /opt/vista/build-info.txt"
Write-Host ""
