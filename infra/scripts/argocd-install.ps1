# infra/scripts/argocd-install.ps1 - Install ArgoCD into the Kind cluster
#Requires -Version 5.1
param(
    [switch]$Uninstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$Namespace = 'argocd'
$HelmRelease = 'argocd'
$ValuesFile = Join-Path $RepoRoot 'infra/gitops/argocd/bootstrap/values.yaml'

# Ensure helm is on PATH
$helmPath = "$env:LOCALAPPDATA\helm"
if (Test-Path "$helmPath\helm.exe") { $env:PATH = "$helmPath;$env:PATH" }

Write-Host "=== ArgoCD Install ===" -ForegroundColor Cyan

foreach ($cmd in @('helm', 'kubectl')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' not found." -ForegroundColor Red
        exit 1
    }
}

if ($Uninstall) {
    Write-Host "Uninstalling ArgoCD..." -ForegroundColor Yellow
    helm uninstall $HelmRelease -n $Namespace 2>$null
    kubectl delete namespace $Namespace --ignore-not-found 2>$null
    Write-Host "ArgoCD removed." -ForegroundColor Green
    exit 0
}

# Add Argo Helm repo (idempotent)
Write-Host "Adding argo Helm repo..." -ForegroundColor Gray
helm repo add argo https://argoproj.github.io/argo-helm 2>$null
helm repo update argo 2>$null

# Create namespace
kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f - 2>$null

# Install / upgrade ArgoCD
Write-Host "Installing ArgoCD via Helm..." -ForegroundColor Green
$helmArgs = @(
    'upgrade', '--install', $HelmRelease,
    'argo/argo-cd',
    '-n', $Namespace,
    '-f', $ValuesFile,
    '--wait',
    '--timeout', '5m'
)
& helm @helmArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: ArgoCD install failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "ArgoCD installed successfully." -ForegroundColor Green
Write-Host ""

# Print initial admin password retrieval
Write-Host "=== Retrieve Admin Password ===" -ForegroundColor Cyan
Write-Host "  kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | "
Write-Host "    ForEach-Object { [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(`$_)) }"
Write-Host ""
Write-Host "=== Access UI ===" -ForegroundColor Cyan
Write-Host "  .\infra\scripts\argocd-portforward.ps1"
Write-Host "  Open http://localhost:8080"
Write-Host "  Username: admin"
Write-Host ""

# Apply AppProjects
$projectsDir = Join-Path $RepoRoot 'infra/gitops/argocd/projects'
if (Test-Path $projectsDir) {
    Write-Host "Applying ArgoCD AppProjects..." -ForegroundColor Green
    kubectl apply -f $projectsDir
    Write-Host "AppProjects applied." -ForegroundColor Green
}
