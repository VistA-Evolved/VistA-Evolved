# infra/scripts/promote-release.ps1 - Promote release from canary to stable tenants
#Requires -Version 5.1
param(
    [Parameter(Mandatory=$true)]
    [string]$Tag,

    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Env,

    [string]$FromTenant = "",           # Canary tenant slug (for logging)
    [string]$ToSelector = "stable",     # Release channel to promote to

    [switch]$Commit,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$EnvDir   = Join-Path $RepoRoot "infra/environments/$Env"
$TenantsDir = Join-Path $EnvDir 'tenants'

Write-Host "=== Promote Release ===" -ForegroundColor Cyan
Write-Host "  Tag:         $Tag"
Write-Host "  Environment: $Env"
Write-Host "  From:        $(if ($FromTenant) { $FromTenant } else { '(all)' })"
Write-Host "  To:          releaseChannel=$ToSelector"
Write-Host ""

# Update tenant.defaults (affects all new tenants)
$defaultsFile = Join-Path $EnvDir 'tenant.defaults.values.yaml'
if (Test-Path $defaultsFile) {
    $content = Get-Content $defaultsFile -Raw
    $content = $content -replace '(tag:\s*)"[^"]*"', "`$1`"$Tag`""
    $content = $content -replace "(tag:\s*)''", "`$1`"$Tag`""
    if (-not $DryRun) {
        [System.IO.File]::WriteAllText($defaultsFile, $content)
    }
    Write-Host "  Updated tenant defaults: $defaultsFile" -ForegroundColor Green
}

# Update per-tenant files that match the selector
$updated = 0
if (Test-Path $TenantsDir) {
    Get-ChildItem $TenantsDir -Filter '*.values.yaml' | ForEach-Object {
        $tc = Get-Content $_.FullName -Raw

        # Check release channel
        $isTarget = $false
        if ($ToSelector -eq 'stable') {
            # Target tenants WITHOUT canary channel, or with explicit stable
            $isTarget = ($tc -notmatch 'releaseChannel:\s*canary')
        } elseif ($ToSelector -eq 'canary') {
            $isTarget = ($tc -match 'releaseChannel:\s*canary')
        } else {
            $isTarget = ($tc -match "releaseChannel:\s*$ToSelector")
        }

        if ($isTarget) {
            # Skip the canary source tenant if specified
            if ($FromTenant -and ($_.Name -match "^$FromTenant\.")) {
                Write-Host "  Skipped (source canary): $($_.Name)" -ForegroundColor Gray
                return
            }

            if ($tc -match 'tag:') {
                $tc = $tc -replace '(tag:\s*)"[^"]*"', "`$1`"$Tag`""
                if (-not $DryRun) {
                    [System.IO.File]::WriteAllText($_.FullName, $tc)
                }
                Write-Host "  Updated: $($_.Name)" -ForegroundColor Green
                $updated++
            }
        }
    }
}

Write-Host ""
Write-Host "  Updated $updated tenant file(s) + defaults." -ForegroundColor Cyan

if ($Commit -and -not $DryRun) {
    Push-Location $RepoRoot
    git add "infra/environments/$Env/"
    $changed = (git diff --cached --name-only | Measure-Object).Count
    if ($changed -gt 0) {
        git commit -m "chore(gitops): promote $Tag to $Env ($ToSelector tenants)"
        Write-Host "Committed." -ForegroundColor Green
    } else {
        Write-Host "No changes to commit." -ForegroundColor Yellow
    }
    Pop-Location
}

if ($DryRun) {
    Write-Host "(dry-run -- no files changed)" -ForegroundColor Yellow
}
