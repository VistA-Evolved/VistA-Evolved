#Requires -Version 5.1
<#
.SYNOPSIS
  Pin WorldVistA upstream repos to exact commits. Updates the lock file with the given SHAs.
.DESCRIPTION
  After fetch, you can pin each repo to a specific commit (e.g. for reproducible builds).
  If no -CommitSha is passed for a repo, the current HEAD is recorded.
.EXAMPLE
  .\pin-worldvista-sources.ps1
  (Records current HEAD for all repos in lock)
.EXAMPLE
  .\pin-worldvista-sources.ps1 -VistAM "abc123" -VistA "def456"
#>
[CmdletBinding()]
param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot "worldvista-sources.config.json"),
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")),
  [string]$VistAM,
  [string]$VistA,
  [string]$VistAVEHUM
)

$ErrorActionPreference = "Stop"
if (-not [System.IO.Path]::IsPathRooted($RepoRoot)) { $RepoRoot = (Resolve-Path $RepoRoot).Path }
$script:RepoRoot = $RepoRoot
$script:ConfigPath = if ([System.IO.Path]::IsPathRooted($ConfigPath)) { $ConfigPath } else { Join-Path $RepoRoot (Join-Path "scripts\upstream" (Split-Path -Leaf $ConfigPath)) }
$script:LockPath = Join-Path $RepoRoot "vendor\locks\worldvista-sources.lock.json"

function Write-Log { param([string]$Message) Write-Host "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message" }

$pins = @{
  "VistA-M"     = $VistAM
  "VistA"       = $VistA
  "VistA-VEHU-M" = $VistAVEHUM
}

if (-not (Test-Path -LiteralPath $script:ConfigPath)) {
  Write-Error "Config not found: $script:ConfigPath"
  exit 1
}

$config = Get-Content -LiteralPath $script:ConfigPath -Raw -Encoding UTF8
if ($config[0] -eq [char]0xFEFF) { $config = $config.Substring(1) }
$cfg = $config | ConvertFrom-Json

$lock = @{
  description = "Pinned WorldVistA upstream sources. Updated by fetch-worldvista-sources.ps1 and pin-worldvista-sources.ps1."
  updatedAt   = (Get-Date -Format "o")
  repos       = [System.Collections.ArrayList]::new()
}

foreach ($s in $cfg.sources) {
  if ($s.optional -and -not $cfg.vehuEnabled) { continue }
  $absPath = Join-Path $RepoRoot $s.localPath
  if (-not (Test-Path -LiteralPath (Join-Path $absPath ".git"))) {
    Write-Log "Skipping $($s.name): not cloned yet. Run fetch-worldvista-sources.ps1 first."
    continue
  }
  $targetSha = $pins[$s.name]
  Push-Location $absPath
  try {
    if ($targetSha) {
      & git fetch origin 2>&1 | Out-Null
      & git checkout $targetSha 2>&1
      if ($LASTEXITCODE -ne 0) { throw "git checkout $targetSha failed" }
      $sha = & git rev-parse HEAD 2>&1
      $sha = $sha.Trim()
    } else {
      $sha = & git rev-parse HEAD 2>&1
      $sha = $sha.Trim()
    }
    $branch = & git rev-parse --abbrev-ref HEAD 2>&1
    if (-not $branch -or $branch -eq "HEAD") { $branch = $s.branch }
    else { $branch = $branch.Trim() }
    [void]$lock.repos.Add([PSCustomObject]@{
        name      = $s.name
        url       = $s.url
        branch    = $branch
        commitSha = $sha
        localPath = $s.localPath
        fetchDate = (Get-Date -Format "o")
        purpose   = $s.purpose
      })
    Write-Log "Pinned $($s.name) -> $sha"
  } finally {
    Pop-Location
  }
}

$lock.repos = @($lock.repos)
$lockJson = $lock | ConvertTo-Json -Depth 5
Set-Content -LiteralPath $script:LockPath -Value $lockJson -Encoding UTF8 -NoNewline
Write-Log "Lock file updated: $script:LockPath"
