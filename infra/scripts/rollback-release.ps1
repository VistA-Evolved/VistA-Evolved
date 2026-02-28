# infra/scripts/rollback-release.ps1 - Rollback a tenant or environment to last known good
#Requires -Version 5.1
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Env,

    [string]$TenantSlug = "",   # Empty = rollback all tenants in env
    [string]$ToTag = "",        # Explicit tag; empty = read from last-known-good.json

    [switch]$Commit,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$EnvDir   = Join-Path $RepoRoot "infra/environments/$Env"
$LkgFile  = Join-Path $EnvDir 'releases/last-known-good.json'

Write-Host "=== Rollback Release ===" -ForegroundColor Cyan
Write-Host "  Environment: $Env"
Write-Host "  Tenant:      $(if ($TenantSlug) { $TenantSlug } else { '(all)' })"
Write-Host ""

# Determine rollback target tag
if (-not $ToTag) {
    if (Test-Path $LkgFile) {
        $lkg = Get-Content $LkgFile -Raw | ConvertFrom-Json
        $ToTag = $lkg.tag
        Write-Host "  Rolling back to last-known-good: $ToTag" -ForegroundColor Yellow
    } else {
        Write-Host "ERROR: No --ToTag and no last-known-good.json found at $LkgFile" -ForegroundColor Red
        exit 1
    }
}

Write-Host "  Target tag: $ToTag" -ForegroundColor Yellow
Write-Host ""

# Use bump-images to update
$bumpScript = Join-Path $PSScriptRoot 'bump-images.ps1'
$bumpArgs = @{
    Env    = $Env
    Tag    = $ToTag
    DryRun = $DryRun
}
& $bumpScript @bumpArgs

if ($Commit -and -not $DryRun) {
    Push-Location $RepoRoot
    git add "infra/environments/$Env/"
    $changed = (git diff --cached --name-only | Measure-Object).Count
    if ($changed -gt 0) {
        $scope = if ($TenantSlug) { "tenant $TenantSlug" } else { "all tenants" }
        git commit -m "chore(gitops): ROLLBACK $Env ($scope) to $ToTag"
        Write-Host "Rollback committed." -ForegroundColor Green
    } else {
        Write-Host "No changes to commit (already at target)." -ForegroundColor Yellow
    }
    Pop-Location
}

Write-Host ""
Write-Host "Rollback complete. ArgoCD will sync automatically." -ForegroundColor Green
