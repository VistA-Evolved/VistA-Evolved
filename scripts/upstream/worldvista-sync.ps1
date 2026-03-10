<#
.SYNOPSIS
    WorldVistA upstream sync -- clones/fetches selected repos and pins commit SHAs.

.DESCRIPTION
    Phase 448 (W29-P2). Mirrors selected WorldVistA GitHub repositories into
    vendor/worldvista/<repo>/ and writes LOCK.json with pinned SHAs.

    This script does NOT copy any upstream code into the VistA-Evolved source tree.
    The vendor/ directory is for reference, license tracking, and comparison only.

.PARAMETER RepoRoot
    Path to the VistA-Evolved repo root. Defaults to script's grandparent dir.

.PARAMETER DryRun
    If set, prints what would be done without cloning/fetching.

.EXAMPLE
    pwsh scripts/upstream/worldvista-sync.ps1
    pwsh scripts/upstream/worldvista-sync.ps1 -DryRun
#>

param(
    [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Repos to track ──────────────────────────────────────────────────
# Each entry: GitHub org/repo, branch to track, short description
$repos = @(
    @{ name = "worldvista-ehr";     org = "WorldVistA"; branch = "master"; desc = "Core WorldVistA EHR Docker image source" }
    @{ name = "VistA-M";           org = "WorldVistA"; branch = "master"; desc = "VistA MUMPS routines and globals" }
    @{ name = "FHIR-Data-Service"; org = "WorldVistA"; branch = "main";   desc = "VistA FHIR Data Service (nodeVistA)" }
    @{ name = "popHealth";         org = "WorldVistA"; branch = "master"; desc = "Quality measure / CQM reporting" }
    @{ name = "Blue-Button";       org = "WorldVistA"; branch = "master"; desc = "Patient data export (Blue Button)" }
)

$vendorDir = Join-Path $RepoRoot "vendor" "worldvista"
$lockFile  = Join-Path $vendorDir "LOCK.json"

if (-not (Test-Path $vendorDir)) { New-Item -ItemType Directory -Force -Path $vendorDir | Out-Null }

Write-Host "`n=== WorldVistA Upstream Sync ===" -ForegroundColor Cyan
Write-Host "Vendor dir: $vendorDir"
Write-Host "Repos: $($repos.Count)"

$lockEntries = @()
$syncLog = @()

foreach ($repo in $repos) {
    $repoUrl = "https://github.com/$($repo.org)/$($repo.name).git"
    $repoDir = Join-Path $vendorDir $repo.name
    $branch  = $repo.branch

    Write-Host "`n--- $($repo.org)/$($repo.name) ($branch) ---" -ForegroundColor Yellow

    if ($DryRun) {
        Write-Host "  [DRY-RUN] Would clone/fetch $repoUrl"
        $lockEntries += @{
            repo       = "$($repo.org)/$($repo.name)"
            branch     = $branch
            sha        = "dry-run"
            fetchedAt  = (Get-Date -Format "o")
            licensePath = ""
            description = $repo.desc
        }
        continue
    }

    try {
        if (Test-Path (Join-Path $repoDir ".git")) {
            Write-Host "  Fetching..."
            Push-Location $repoDir
            git fetch origin $branch --depth 1 2>&1 | ForEach-Object { $syncLog += "  $_" }
            git reset --hard "origin/$branch" 2>&1 | ForEach-Object { $syncLog += "  $_" }
            Pop-Location
        } else {
            Write-Host "  Cloning (shallow)..."
            git clone --depth 1 --branch $branch $repoUrl $repoDir 2>&1 | ForEach-Object { $syncLog += "  $_" }
        }

        # Get HEAD SHA
        Push-Location $repoDir
        $sha = (git rev-parse HEAD).Trim()
        Pop-Location
        Write-Host "  SHA: $sha"

        # Find license file
        $licenseFile = ""
        $licCandidates = @("LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING")
        foreach ($lc in $licCandidates) {
            $lcPath = Join-Path $repoDir $lc
            if (Test-Path $lcPath) {
                $licenseFile = $lc
                break
            }
        }

        $lockEntries += @{
            repo        = "$($repo.org)/$($repo.name)"
            branch      = $branch
            sha         = $sha
            fetchedAt   = (Get-Date -Format "o")
            licensePath = $licenseFile
            description = $repo.desc
        }
        Write-Host "  License: $(if ($licenseFile) { $licenseFile } else { 'NOT FOUND' })" -ForegroundColor $(if ($licenseFile) { "Green" } else { "Red" })
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $syncLog += "  ERROR: $($_.Exception.Message)"
        $lockEntries += @{
            repo        = "$($repo.org)/$($repo.name)"
            branch      = $branch
            sha         = "ERROR"
            fetchedAt   = (Get-Date -Format "o")
            licensePath = ""
            description = $repo.desc
            error       = $_.Exception.Message
        }
    }
}

# ── Write LOCK.json ────────────────────────────────────────────────
$lockData = @{
    generatedAt = (Get-Date -Format "o")
    generatedBy = "worldvista-sync.ps1"
    repos       = $lockEntries
}

$lockJson = $lockData | ConvertTo-Json -Depth 5
# Remove BOM by writing raw bytes
[System.IO.File]::WriteAllText($lockFile, $lockJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "`nLOCK.json written: $lockFile" -ForegroundColor Green

# ── Summary ─────────────────────────────────────────────────────────
$ok = ($lockEntries | Where-Object { $_.sha -ne "ERROR" }).Count
$fail = ($lockEntries | Where-Object { $_.sha -eq "ERROR" }).Count
Write-Host "`n=== Sync Complete: $ok OK, $fail FAILED ===" -ForegroundColor $(if ($fail -gt 0) { "Yellow" } else { "Green" })

if ($syncLog.Count -gt 0) {
    $logPath = Join-Path $vendorDir "sync.log"
    $syncLog | Set-Content -Path $logPath -Encoding UTF8
    Write-Host "Sync log: $logPath"
}
