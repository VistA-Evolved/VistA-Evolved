#Requires -Version 5.1
<#
.SYNOPSIS
  Start the local-vista container (canonical port 9432). Requires credentials in env or .env.
.DESCRIPTION
  Uses docker/local-vista/compose.yaml with profile local-vista.
  Set LOCAL_VISTA_ACCESS and LOCAL_VISTA_VERIFY, or copy docker/local-vista/build/.env.example to .env.
.EXAMPLE
  $env:LOCAL_VISTA_ACCESS="PRO1234"; $env:LOCAL_VISTA_VERIFY="PRO1234!!"; .\scripts\runtime\start-local-vista.ps1
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
)

$ErrorActionPreference = "Stop"
if (-not [System.IO.Path]::IsPathRooted($RepoRoot)) { $RepoRoot = (Resolve-Path $RepoRoot).Path }

$composeFile = Join-Path $RepoRoot "docker\local-vista\compose.yaml"
if (-not (Test-Path -LiteralPath $composeFile)) {
  Write-Error "Compose file not found: $composeFile"
  exit 1
}

Write-Host "Starting local-vista (profile local-vista, port 9432)..."
Push-Location $RepoRoot
try {
  docker compose -f docker/local-vista/compose.yaml --profile local-vista up -d 2>&1
  if ($LASTEXITCODE -ne 0) { exit 1 }
  Write-Host "Run .\scripts\runtime\show-local-vista-status.ps1 to check status."
} finally {
  Pop-Location
}
