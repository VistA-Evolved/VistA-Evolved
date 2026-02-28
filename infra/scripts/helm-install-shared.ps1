# infra/scripts/helm-install-shared.ps1 - Install the ve-shared Helm chart into Kind
#Requires -Version 5.1
param(
    [string]$Overlay = "",
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$ChartPath = Join-Path $RepoRoot 'infra/helm/ve-shared'

Write-Host "=== Installing ve-shared Helm chart ===" -ForegroundColor Cyan

if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'helm' CLI not found." -ForegroundColor Red
    exit 1
}

# Build helm args
$helmArgs = @(
    'upgrade', '--install', 've-shared', $ChartPath,
    '--create-namespace'
)

if ($Overlay -and (Test-Path -LiteralPath $Overlay)) {
    Write-Host "Using overlay: $Overlay" -ForegroundColor Gray
    $helmArgs += @('-f', $Overlay)
}

if ($DryRun) {
    $helmArgs += @('--dry-run', '--debug')
    Write-Host "(dry-run mode)" -ForegroundColor Yellow
}

Write-Host "Running: helm $($helmArgs -join ' ')" -ForegroundColor Gray
& helm @helmArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: helm install failed (exit $LASTEXITCODE)" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "ve-shared installed successfully." -ForegroundColor Green
if (-not $DryRun) {
    Write-Host "Checking pods in ve-system namespace..." -ForegroundColor Gray
    kubectl get pods -n ve-system
}
