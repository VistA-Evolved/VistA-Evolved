# infra/scripts/helm-uninstall-shared.ps1 - Uninstall the ve-shared Helm release
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Write-Host "=== Uninstalling ve-shared Helm release ===" -ForegroundColor Yellow

if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'helm' CLI not found." -ForegroundColor Red
    exit 1
}

$releases = helm list --all-namespaces --filter 've-shared' -q 2>&1
if ($releases -match 've-shared') {
    helm uninstall ve-shared
    Write-Host "ve-shared uninstalled." -ForegroundColor Green
} else {
    Write-Host "ve-shared release not found -- nothing to uninstall." -ForegroundColor Gray
}
