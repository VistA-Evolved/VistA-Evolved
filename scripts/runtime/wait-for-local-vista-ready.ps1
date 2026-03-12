#Requires -Version 5.1
<#
.SYNOPSIS
  Wait until the local-vista lane reaches a target readiness level or timeout.
.DESCRIPTION
  Polls healthcheck until CONTAINER_STARTED, NETWORK_REACHABLE, SERVICE_READY, TERMINAL_READY, or RPC_READY passes (or all for RPC_READY).
  Default target: RPC_READY. Interval 5s, default timeout 300s (5 min).
.EXAMPLE
  .\scripts\runtime\wait-for-local-vista-ready.ps1 -TargetLevel RPC_READY
#>
[CmdletBinding()]
param(
  [ValidateSet("CONTAINER_STARTED", "NETWORK_REACHABLE", "SERVICE_READY", "TERMINAL_READY", "RPC_READY")]
  [string]$TargetLevel = "RPC_READY",
  [int]$TimeoutSeconds = 300,
  [int]$PollIntervalSeconds = 5,
  [string]$HostPortRpc = $(if ($env:LOCAL_VISTA_PORT) { [int]$env:LOCAL_VISTA_PORT } else { 9432 }),
  [string]$HostPortSsh = $(if ($env:LOCAL_VISTA_SSH_PORT) { [int]$env:LOCAL_VISTA_SSH_PORT } else { 2224 }),
  [string]$ContainerName = "local-vista"
)

$ErrorActionPreference = "Stop"

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
  } catch { return $false }
}

function Test-ContainerStarted {
  $s = docker ps -a --filter "name=$ContainerName" --format "{{.Status}}" 2>&1
  return $s -match "^Up"
}

function Test-NetworkReachable {
  return (Test-TcpPort -HostAddr "127.0.0.1" -Port $HostPortRpc -TimeoutMs 3000) -and
         (Test-TcpPort -HostAddr "127.0.0.1" -Port $HostPortSsh -TimeoutMs 3000)
}

function Test-ServiceReady {
  $h = docker inspect --format '{{.State.Health.Status}}' $ContainerName 2>&1
  return $h -eq "healthy"
}

function Test-TerminalReady {
  return Test-TcpPort -HostAddr "127.0.0.1" -Port $HostPortSsh -TimeoutMs 3000
}

function Test-RpcReady {
  return Test-TcpPort -HostAddr "127.0.0.1" -Port $HostPortRpc -TimeoutMs 3000
}

$start = Get-Date
Write-Host "Waiting for $TargetLevel (timeout ${TimeoutSeconds}s, poll ${PollIntervalSeconds}s)..."

while ($true) {
  $elapsed = ((Get-Date) - $start).TotalSeconds
  if ($elapsed -ge $TimeoutSeconds) {
    Write-Host "Timeout after $TimeoutSeconds seconds. $TargetLevel did not pass."
    exit 1
  }

  $ok = $false
  switch ($TargetLevel) {
    "CONTAINER_STARTED"  { $ok = Test-ContainerStarted }
    "NETWORK_REACHABLE"  { $ok = Test-NetworkReachable }
    "SERVICE_READY"      { $ok = Test-ServiceReady }
    "TERMINAL_READY"    { $ok = Test-TerminalReady }
    "RPC_READY"         { $ok = Test-RpcReady }
  }

  if ($ok) {
    Write-Host "  $TargetLevel passed at ${elapsed}s."
    exit 0
  }

  Start-Sleep -Seconds $PollIntervalSeconds
}
