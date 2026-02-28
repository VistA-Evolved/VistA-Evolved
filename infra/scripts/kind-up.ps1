# infra/scripts/kind-up.ps1 - Create a Kind cluster for VistA-Evolved local dev
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ClusterName = 've-local'

Write-Host "=== VistA-Evolved Kind Cluster Setup ===" -ForegroundColor Cyan

# Pre-flight: check kind is installed
if (-not (Get-Command kind -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'kind' CLI not found. Install from https://kind.sigs.k8s.io/" -ForegroundColor Red
    exit 1
}
if (-not (Get-Command kubectl -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'kubectl' CLI not found." -ForegroundColor Red
    exit 1
}
if (-not (Get-Command helm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'helm' CLI not found." -ForegroundColor Red
    exit 1
}

# Check if cluster already exists
$existing = kind get clusters 2>&1
if ($existing -match $ClusterName) {
    Write-Host "Cluster '$ClusterName' already exists. Use kind-down.ps1 first to recreate." -ForegroundColor Yellow
    kubectl cluster-info --context "kind-$ClusterName" 2>$null
    exit 0
}

# Write Kind config to temp file
$kindConfig = @"
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: $ClusterName
nodes:
  - role: control-plane
    extraPortMappings:
      # Nginx gateway HTTP
      - containerPort: 30080
        hostPort: 30080
        protocol: TCP
      # Nginx gateway HTTPS
      - containerPort: 30443
        hostPort: 30443
        protocol: TCP
      # API direct (dev convenience)
      - containerPort: 30001
        hostPort: 30001
        protocol: TCP
"@

$tmpConfig = Join-Path $env:TEMP 've-kind-config.yaml'
$kindConfig | Set-Content -Path $tmpConfig -Encoding UTF8

Write-Host "Creating Kind cluster '$ClusterName'..." -ForegroundColor Green
kind create cluster --config $tmpConfig --wait 120s

# Verify
kubectl cluster-info --context "kind-$ClusterName"

Write-Host ""
Write-Host "Kind cluster '$ClusterName' is ready." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Build images:  .\infra\scripts\build-images.ps1"
Write-Host "  2. Load images:   kind load docker-image vista-evolved/api:dev --name $ClusterName"
Write-Host "  3. Install shared: .\infra\scripts\helm-install-shared.ps1"
Write-Host "  4. Install tenant: helm install demo-tenant infra/helm/ve-tenant --set tenantId=demo,tenantSlug=demo"
