# infra/scripts/kind-down.ps1 - Tear down the VistA-Evolved Kind cluster
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ClusterName = 've-local'

Write-Host "=== Tearing down Kind cluster '$ClusterName' ===" -ForegroundColor Yellow

if (-not (Get-Command kind -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'kind' CLI not found." -ForegroundColor Red
    exit 1
}

$existing = kind get clusters 2>&1
if ($existing -match $ClusterName) {
    kind delete cluster --name $ClusterName
    Write-Host "Cluster '$ClusterName' deleted." -ForegroundColor Green
} else {
    Write-Host "Cluster '$ClusterName' does not exist -- nothing to do." -ForegroundColor Gray
}
