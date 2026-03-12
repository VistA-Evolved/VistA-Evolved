#Requires -Version 5.1
<#
.SYNOPSIS
  Stop the local-vista container.
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
)

$ErrorActionPreference = "Stop"
if (-not [System.IO.Path]::IsPathRooted($RepoRoot)) { $RepoRoot = (Resolve-Path $RepoRoot).Path }

Push-Location $RepoRoot
try {
  docker compose -f docker/local-vista/compose.yaml --profile local-vista down 2>&1
} finally {
  Pop-Location
}
