<#
.SYNOPSIS
  Start the API safely on Windows without EADDRINUSE loops.

.DESCRIPTION
  - If port 3001 already has a healthy API process, exits 0 and reuses it.
  - If port 3001 is occupied by a stale/unhealthy Node process, kills it and starts API.
  - If port 3001 is occupied by a non-Node process, exits with guidance (no destructive kill).

.PARAMETER Port
  API port to manage. Default: 3001.

.PARAMETER ForceRestart
  Always restart the Node process on the target port.
#>
[CmdletBinding()]
param(
  [int]$Port = 3001,
  [switch]$ForceRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "apps\api"

function Test-ApiHealth {
  param([int]$TargetPort)
  try {
    $health = Invoke-RestMethod -Uri ("http://127.0.0.1:{0}/health" -f $TargetPort) -Method Get -TimeoutSec 3
    return ($health -and $health.ok -eq $true)
  } catch {
    return $false
  }
}

$listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  $ownerPid = $listener.OwningProcess
  $proc = Get-Process -Id $ownerPid -ErrorAction SilentlyContinue

  if ($proc -and $proc.ProcessName -ieq "node") {
    if (-not $ForceRestart -and (Test-ApiHealth -TargetPort $Port)) {
      Write-Host ("[OK] API already running and healthy on http://127.0.0.1:{0} (PID {1})." -f $Port, $ownerPid) -ForegroundColor Green
      Write-Host "[INFO] Reusing existing process; no restart needed." -ForegroundColor DarkGray
      exit 0
    }

    Write-Host ("[INFO] Stopping existing Node process on port {0} (PID {1}) before restart..." -f $Port, $ownerPid) -ForegroundColor Yellow
    Stop-Process -Id $ownerPid -Force
    Start-Sleep -Seconds 2
  } else {
    $name = if ($proc) { $proc.ProcessName } else { "unknown" }
    Write-Host ("[FAIL] Port {0} is occupied by non-Node process (PID {1}, Name {2})." -f $Port, $ownerPid, $name) -ForegroundColor Red
    Write-Host "       Stop that process manually or launch API on a different port." -ForegroundColor Red
    exit 1
  }
}

if (-not (Test-Path -LiteralPath $apiDir)) {
  Write-Host ("[FAIL] API directory not found: {0}" -f $apiDir) -ForegroundColor Red
  exit 1
}

Push-Location $apiDir
try {
  Write-Host "[INFO] Starting API with tsx and .env.local..." -ForegroundColor Yellow
  & npx tsx --env-file=.env.local src/index.ts
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    Write-Host ("[FAIL] API exited with code {0}." -f $exitCode) -ForegroundColor Red
  }
  exit $exitCode
} finally {
  Pop-Location
}
