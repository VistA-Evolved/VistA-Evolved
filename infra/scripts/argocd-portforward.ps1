# infra/scripts/argocd-portforward.ps1 - Port-forward ArgoCD server UI to localhost:8080
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [int]$Port = 8080
)

Write-Host "=== ArgoCD Port Forward ===" -ForegroundColor Cyan
Write-Host "  URL:      http://localhost:$Port" -ForegroundColor Green
Write-Host "  Username: admin" -ForegroundColor Green
Write-Host ""
Write-Host "  Get password:" -ForegroundColor Gray
Write-Host "    kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' |"
Write-Host "      ForEach-Object { [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String(`$_)) }"
Write-Host ""
Write-Host "Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

kubectl port-forward svc/argocd-server -n argocd "${Port}:443"
