# infra/scripts/provision-tenant.ps1 - Provision a new tenant in the VistA-Evolved cluster
#Requires -Version 5.1
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantId,

    [Parameter(Mandatory=$true)]
    [string]$TenantSlug,

    [string]$Overlay = "",
    [string]$ImageTag = "dev",
    [switch]$DryRun,
    [switch]$SkipVista
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$helmPath = "$env:LOCALAPPDATA\helm"
if (Test-Path "$helmPath\helm.exe") { $env:PATH = "$helmPath;$env:PATH" }

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$ChartPath = Join-Path $RepoRoot 'infra/helm/ve-tenant'
$ReleaseName = "tenant-$TenantSlug"
$Namespace = "ve-tenant-$TenantSlug"

Write-Host "=== Provisioning Tenant ===" -ForegroundColor Cyan
Write-Host "  TenantId:   $TenantId"
Write-Host "  TenantSlug: $TenantSlug"
Write-Host "  Namespace:  $Namespace"
Write-Host "  Release:    $ReleaseName"
Write-Host ""

# Pre-flight checks
foreach ($cmd in @('helm', 'kubectl')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' not found." -ForegroundColor Red
        exit 1
    }
}

# Build helm args
$helmArgs = @(
    'upgrade', '--install', $ReleaseName, $ChartPath,
    '--create-namespace',
    '--set', "tenantId=$TenantId",
    '--set', "tenantSlug=$TenantSlug",
    '--set', "api.image.tag=$ImageTag"
)

if ($SkipVista) {
    $helmArgs += @('--set', 'vista.enabled=false')
}

if ($Overlay -and (Test-Path -LiteralPath $Overlay)) {
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
Write-Host "Tenant '$TenantSlug' provisioned successfully." -ForegroundColor Green

if (-not $DryRun) {
    Write-Host ""
    Write-Host "Waiting for pods to become ready..." -ForegroundColor Gray
    kubectl wait --for=condition=ready pod --all -n $Namespace --timeout=120s 2>$null
    kubectl get pods -n $Namespace
    Write-Host ""
    Write-Host "Tenant API endpoint: http://ve-tenant-api.$Namespace.svc.cluster.local:3001" -ForegroundColor Green
}
