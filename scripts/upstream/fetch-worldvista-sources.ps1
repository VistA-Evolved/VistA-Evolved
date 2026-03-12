#Requires -Version 5.1
<#
.SYNOPSIS
  Clone or fetch WorldVistA upstream sources into vendor/upstream. Local-source-first: clone once, reuse on later runs.
.DESCRIPTION
  - If local path does not exist: clone the repo.
  - If local path exists: fetch and optionally update (no re-clone). Does not re-download on failure.
  - Updates vendor/locks/worldvista-sources.lock.json with commit SHA, branch, fetch date.
  - Fails clearly if Git is missing or network/auth fails.
.EXAMPLE
  .\fetch-worldvista-sources.ps1
.EXAMPLE
  .\fetch-worldvista-sources.ps1 -ConfigPath ".\worldvista-sources.config.json"
#>
[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "worldvista-sources.config.json"),
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
  [switch]$NoUpdate
)

$ErrorActionPreference = "Stop"
if (-not [System.IO.Path]::IsPathRooted($RepoRoot)) { $RepoRoot = (Resolve-Path $RepoRoot).Path }
$script:RepoRoot = $RepoRoot
$script:ConfigPath = if ([System.IO.Path]::IsPathRooted($ConfigPath)) { $ConfigPath } else { Join-Path $RepoRoot (Join-Path "scripts\upstream" (Split-Path -Leaf $ConfigPath)) }
$script:LockPath = Join-Path $RepoRoot "vendor\locks\worldvista-sources.lock.json"

function Write-Log { param([string]$Message) Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" }
function Test-GitAvailable {
  try {
    $null = Get-Command git -ErrorAction Stop
    $version = git --version 2>&1
    return $true
  } catch {
    return $false
  }
}

function Get-RepoState {
  param([string]$LocalPath)
  $absPath = Join-Path $RepoRoot $LocalPath
  if (-not (Test-Path -LiteralPath $absPath)) { return "missing" }
  $gitDir = Join-Path $absPath ".git"
  if (-not (Test-Path -LiteralPath $gitDir)) { return "not-repo" }
  return "present"
}

function Invoke-Clone {
  param([string]$Url, [string]$LocalPath, [string]$Branch)
  $absPath = Join-Path $RepoRoot $LocalPath
  $parent = Split-Path -Parent $absPath
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
    Write-Log "Created directory: $parent"
  }
  Write-Log "Cloning $Url -> $LocalPath (branch: $Branch)"
  Push-Location $RepoRoot
  try {
    & git clone --branch $Branch --single-branch --depth 1 $Url $LocalPath 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) { throw "git clone exited with $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
  Write-Log "Cloned: $LocalPath"
}

function Invoke-Fetch {
  param([string]$LocalPath, [switch]$HardReset)
  $absPath = Join-Path $RepoRoot $LocalPath
  Push-Location $absPath
  try {
    Write-Log "Fetching $LocalPath"
    & git fetch origin 2>&1 | ForEach-Object { Write-Log $_ }
    if ($LASTEXITCODE -ne 0) { throw "git fetch exited with $LASTEXITCODE" }
    if ($HardReset) {
      $branch = & git rev-parse --abbrev-ref HEAD 2>&1
      if ($LASTEXITCODE -ne 0) { throw "git rev-parse failed" }
      Write-Log "Hard reset $LocalPath to origin/$branch"
      & git reset --hard "origin/$branch" 2>&1 | ForEach-Object { Write-Log $_ }
      if ($LASTEXITCODE -ne 0) { throw "git reset exited with $LASTEXITCODE" }
    }
  } finally {
    Pop-Location
  }
}

function Get-CommitSha {
  param([string]$LocalPath)
  $absPath = Join-Path $RepoRoot $LocalPath
  Push-Location $absPath
  try {
    $sha = & git rev-parse HEAD 2>&1
    if ($LASTEXITCODE -ne 0) { return $null }
    return $sha.Trim()
  } finally {
    Pop-Location
  }
}

function Get-CurrentBranch {
  param([string]$LocalPath)
  $absPath = Join-Path $RepoRoot $LocalPath
  Push-Location $absPath
  try {
    $b = & git rev-parse --abbrev-ref HEAD 2>&1
    if ($LASTEXITCODE -ne 0) { return $null }
    return $b.Trim()
  } finally {
    Pop-Location
  }
}

# --- Main ---
Write-Log "Repo root: $RepoRoot"
Write-Log "Config: $script:ConfigPath"

if (-not (Test-GitAvailable)) {
  Write-Error "Git is not available. Install Git and ensure it is on PATH. Script will not re-download on failure; fix Git and re-run."
  exit 1
}

if (-not (Test-Path -LiteralPath $script:ConfigPath)) {
  Write-Error "Config not found: $script:ConfigPath"
  exit 1
}

$config = Get-Content -LiteralPath $script:ConfigPath -Raw -Encoding UTF8
if ($config[0] -eq [char]0xFEFF) { $config = $config.Substring(1) }
$cfg = $config | ConvertFrom-Json

$lockDir = Split-Path -Parent $script:LockPath
if (-not (Test-Path -LiteralPath $lockDir)) {
  New-Item -ItemType Directory -Path $lockDir -Force | Out-Null
}

$lock = @{
  description = "Pinned WorldVistA upstream sources. Updated by fetch-worldvista-sources.ps1 and pin-worldvista-sources.ps1."
  updatedAt   = (Get-Date -Format "o")
  repos       = [System.Collections.ArrayList]::new()
}

$sources = @($cfg.sources)
foreach ($s in $sources) {
  if ($s.optional -and -not $cfg.vehuEnabled) {
    Write-Log "Skipping optional repo: $($s.name) (vehuEnabled=false)"
    continue
  }
  $state = Get-RepoState -LocalPath $s.localPath
  try {
    if ($state -eq "missing") {
      Invoke-Clone -Url $s.url -LocalPath $s.localPath -Branch $s.branch
    } elseif ($state -eq "present" -and $cfg.allowUpdates -and -not $NoUpdate) {
      Invoke-Fetch -LocalPath $s.localPath -HardReset:$s.hardReset
    } elseif ($state -eq "not-repo") {
      Write-Warning "Path exists but is not a Git repo: $($s.localPath). Skipping. Remove or rename the folder to re-clone."
      continue
    } else {
      Write-Log "Reusing existing clone: $($s.localPath) (NoUpdate=$NoUpdate, allowUpdates=$($cfg.allowUpdates))"
    }
    $sha = Get-CommitSha -LocalPath $s.localPath
    $branch = Get-CurrentBranch -LocalPath $s.localPath
    if ($sha) {
      [void]$lock.repos.Add([PSCustomObject]@{
          name       = $s.name
          url        = $s.url
          branch     = $branch
          commitSha  = $sha
          localPath  = $s.localPath
          fetchDate  = (Get-Date -Format "o")
          purpose    = $s.purpose
        })
    }
  } catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    Write-Error "Fetch failed for $($s.name). Fix network/auth and re-run. Script does not re-download automatically on failure."
    exit 1
  }
}

$lock.repos = @($lock.repos)
$lockJson = $lock | ConvertTo-Json -Depth 5
Set-Content -LiteralPath $script:LockPath -Value $lockJson -Encoding UTF8 -NoNewline
Write-Log "Lock file updated: $script:LockPath"
Write-Log "Done. Run .\show-worldvista-source-status.ps1 to see status."
