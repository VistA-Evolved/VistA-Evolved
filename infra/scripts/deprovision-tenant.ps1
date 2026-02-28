# infra/scripts/deprovision-tenant.ps1 - Remove a tenant from the VistA-Evolved cluster
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory=$true)]
    [string]$TenantSlug,

    [switch]$KeepPVC,
    [switch]$DryRun,
    [switch]$Force
)

$helmPath = "$env:LOCALAPPDATA\helm"
if (Test-Path "$helmPath\helm.exe") { $env:PATH = "$helmPath;$env:PATH" }

$ReleaseName = "tenant-$TenantSlug"
$Namespace = "ve-tenant-$TenantSlug"

Write-Host "=== Deprovisioning Tenant ===" -ForegroundColor Yellow
Write-Host "  TenantSlug: $TenantSlug"
Write-Host "  Release:    $ReleaseName"
Write-Host "  Namespace:  $Namespace"
Write-Host "  KeepPVC:    $KeepPVC"
Write-Host ""

# Safety prompt
if (-not $Force -and -not $DryRun) {
    Write-Host "WARNING: This will delete all resources for tenant '$TenantSlug'." -ForegroundColor Red
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -ne 'yes') {
        Write-Host "Aborted." -ForegroundColor Gray
        exit 0
    }
}

foreach ($cmd in @('helm', 'kubectl')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' not found." -ForegroundColor Red
        exit 1
    }
}

if ($DryRun) {
    Write-Host "(dry-run mode -- no changes will be made)" -ForegroundColor Yellow
    Write-Host "  Would uninstall helm release: $ReleaseName"
    if (-not $KeepPVC) {
        Write-Host "  Would delete namespace: $Namespace (including PVCs)"
    } else {
        Write-Host "  Would uninstall release but keep PVCs in: $Namespace"
    }
    exit 0
}

# Uninstall helm release
$releases = helm list --all-namespaces --filter $ReleaseName -q 2>&1
if ($releases -match $ReleaseName) {
    Write-Host "Uninstalling helm release '$ReleaseName'..." -ForegroundColor Gray
    helm uninstall $ReleaseName -n $Namespace
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: helm uninstall failed (exit $LASTEXITCODE)" -ForegroundColor Yellow
    } else {
        Write-Host "  Release uninstalled." -ForegroundColor Green
    }
} else {
    Write-Host "  Release '$ReleaseName' not found -- skipping helm uninstall." -ForegroundColor Gray
}

# Delete namespace (or just non-PVC resources)
if (-not $KeepPVC) {
    Write-Host "Deleting namespace '$Namespace'..." -ForegroundColor Gray
    kubectl delete namespace $Namespace --ignore-not-found --timeout=60s
    Write-Host "  Namespace deleted." -ForegroundColor Green
} else {
    Write-Host "Keeping PVCs in namespace '$Namespace'." -ForegroundColor Yellow
    # Delete deployments/services/configmaps but not PVCs
    kubectl delete deployment,service,configmap,secret --all -n $Namespace --ignore-not-found
    Write-Host "  Non-PVC resources deleted." -ForegroundColor Green
}

Write-Host ""
Write-Host "Tenant '$TenantSlug' deprovisioned." -ForegroundColor Green
