#Requires -Version 5.1
<#
.SYNOPSIS
  Collect local-vista container logs to docker/local-vista/logs for proof and debugging.
.DESCRIPTION
  Writes docker logs to a timestamped file. Preserves stdout and stderr.
.EXAMPLE
  .\scripts\runtime\collect-local-vista-logs.ps1
#>
[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
  [string]$ContainerName = "local-vista",
  [int]$Tail = 0
)

$ErrorActionPreference = "Stop"
if (-not [System.IO.Path]::IsPathRooted($RepoRoot)) { $RepoRoot = (Resolve-Path $RepoRoot).Path }

$logDir = Join-Path $RepoRoot "docker\local-vista\logs"
if (-not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outFile = Join-Path $logDir "local-vista-$timestamp.log"

$exists = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>&1
if (-not $exists -or $exists -notmatch $ContainerName) {
  Write-Warning "Container '$ContainerName' not found. No logs collected."
  exit 0
}

Write-Host "Collecting logs from $ContainerName to $outFile"
$args = @("logs", "--timestamps", $ContainerName)
if ($Tail -gt 0) { $args += "--tail"; $args += $Tail }
& docker @args 2>&1 | Set-Content -Path $outFile -Encoding UTF8
Write-Host "  Done. Lines: $((Get-Content -LiteralPath $outFile | Measure-Object -Line).Lines)"
Write-Host "  Path: $outFile"
