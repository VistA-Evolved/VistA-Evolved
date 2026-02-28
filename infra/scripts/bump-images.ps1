# infra/scripts/bump-images.ps1 - Update GitOps image tags for an environment
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Env,

    [Parameter(Mandatory=$true)]
    [string]$Tag,

    [switch]$Commit,
    [switch]$DryRun
)

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$EnvDir   = Join-Path $RepoRoot "infra/environments/$Env"

Write-Host "=== Bump Image Tags ===" -ForegroundColor Cyan
Write-Host "  Environment: $Env"
Write-Host "  Tag:         $Tag"
Write-Host ""

# Update shared values
$sharedFile = Join-Path $EnvDir 'shared.values.yaml'
if (Test-Path $sharedFile) {
    $content = Get-Content $sharedFile -Raw
    if ($content -match 'imageTag:') {
        $content = $content -replace 'imageTag:\s*"[^"]*"', "imageTag: `"$Tag`""
        $content = $content -replace "imageTag:\s*''", "imageTag: `"$Tag`""
    } else {
        $content += "`nimageTag: `"$Tag`""
    }
    if (-not $DryRun) {
        [System.IO.File]::WriteAllText($sharedFile, $content)
    }
    Write-Host "  Updated: $sharedFile" -ForegroundColor Green
}

# Update tenant defaults
$tenantFile = Join-Path $EnvDir 'tenant.defaults.values.yaml'
if (Test-Path $tenantFile) {
    $content = Get-Content $tenantFile -Raw
    $content = $content -replace '(tag:\s*)"[^"]*"', "`$1`"$Tag`""
    $content = $content -replace "(tag:\s*)''", "`$1`"$Tag`""
    if (-not $DryRun) {
        [System.IO.File]::WriteAllText($tenantFile, $content)
    }
    Write-Host "  Updated: $tenantFile" -ForegroundColor Green
}

# Update per-tenant files if they have image.tag overrides
$tenantsDir = Join-Path $EnvDir 'tenants'
if (Test-Path $tenantsDir) {
    Get-ChildItem $tenantsDir -Filter '*.values.yaml' | ForEach-Object {
        $tc = Get-Content $_.FullName -Raw
        if ($tc -match 'tag:') {
            $tc = $tc -replace '(tag:\s*)"[^"]*"', "`$1`"$Tag`""
            if (-not $DryRun) {
                [System.IO.File]::WriteAllText($_.FullName, $tc)
            }
            Write-Host "  Updated: $($_.FullName)" -ForegroundColor Green
        }
    }
}

if ($Commit -and -not $DryRun) {
    Push-Location $RepoRoot
    git add "infra/environments/$Env/"
    $hasChanges = (git diff --cached --quiet; $LASTEXITCODE -ne 0)
    if ($hasChanges) {
        git commit -m "chore(gitops): bump $Env images to $Tag"
        Write-Host ""
        Write-Host "Committed image bump for $Env -> $Tag" -ForegroundColor Green
    } else {
        Write-Host "No changes to commit." -ForegroundColor Yellow
    }
    Pop-Location
}

if ($DryRun) {
    Write-Host ""
    Write-Host "(dry-run -- no files changed)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Done. Run 'git diff' to review." -ForegroundColor Cyan
