#Requires -Version 5.1
<#
.SYNOPSIS
  Run all readiness levels for the local-vista lane and output pass/fail. No guessing.
.DESCRIPTION
  Levels: CONTAINER_STARTED, NETWORK_REACHABLE, SERVICE_READY, TERMINAL_READY, RPC_READY.
  Uses canonical ports 9432 (RPC) and 2224 (SSH) unless overridden by env.
.EXAMPLE
  .\scripts\runtime\healthcheck-local-vista.ps1
#>
[CmdletBinding()]
param(
  [string]$HostPortRpc = $(if ($env:LOCAL_VISTA_PORT) { [int]$env:LOCAL_VISTA_PORT } else { 9432 }),
  [string]$HostPortSsh = $(if ($env:LOCAL_VISTA_SSH_PORT) { [int]$env:LOCAL_VISTA_SSH_PORT } else { 2224 }),
  [string]$ContainerName = "local-vista",
  [int]$TcpTimeoutMs = 3000
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0

function Test-TcpPort {
  param([string]$HostAddr, [int]$Port, [int]$TimeoutMs)
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect($HostAddr, $Port, $null, $null)
    $wait = $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
    if (-not $wait) { $tcp.Close(); return $false }
    $tcp.EndConnect($async)
    $tcp.Close()
    return $true
  } catch {
    return $false
  }
}

function Write-Level {
  param([string]$Level, [bool]$Pass, [string]$Detail = "")
  $status = if ($Pass) { "PASS" } else { "FAIL" }
  if ($Pass) { $script:PassCount++ } else { $script:FailCount++ }
  $color = if ($Pass) { "Green" } else { "Red" }
  $line = "  $Level : $status"
  if ($Detail) { $line += " ($Detail)" }
  Write-Host $line -ForegroundColor $color
}

Write-Host "`n=== Local Vista readiness check ===" -ForegroundColor Cyan
Write-Host "  RPC port: $HostPortRpc  SSH port: $HostPortSsh  Container: $ContainerName`n"

# 1. CONTAINER_STARTED
$status = docker ps -a --filter "name=$ContainerName" --format "{{.Status}}" 2>&1
$containerUp = $status -match "^Up"
Write-Level -Level "CONTAINER_STARTED" -Pass $containerUp -Detail $(if ($status) { $status.Trim() } else { "container not found" })

# 2. NETWORK_REACHABLE (both ports from host)
$rpcReach = Test-TcpPort -HostAddr "127.0.0.1" -Port $HostPortRpc -TimeoutMs $TcpTimeoutMs
$sshReach = Test-TcpPort -HostAddr "127.0.0.1" -Port $HostPortSsh -TimeoutMs $TcpTimeoutMs
Write-Level -Level "NETWORK_REACHABLE" -Pass ($rpcReach -and $sshReach) -Detail "RPC=$rpcReach SSH=$sshReach"

# 3. SERVICE_READY (Docker health; use conditional format so missing Health does not error)
$health = docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' $ContainerName 2>$null
if ($LASTEXITCODE -ne 0) { $health = "none" }
$healthOk = $health -eq "healthy"
Write-Level -Level "SERVICE_READY" -Pass $healthOk -Detail $(if ($health -and $health -ne "none") { $health.Trim() } else { "no health status" })

# 4. TERMINAL_READY (SSH port)
Write-Level -Level "TERMINAL_READY" -Pass $sshReach -Detail "TCP 127.0.0.1:$HostPortSsh"

# 5. RPC_READY (broker port)
Write-Level -Level "RPC_READY" -Pass $rpcReach -Detail "TCP 127.0.0.1:$HostPortRpc"

Write-Host ""
Write-Host "  Total: $script:PassCount PASS, $script:FailCount FAIL" -ForegroundColor $(if ($script:FailCount -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($script:FailCount -gt 0) {
  exit 1
}
exit 0
