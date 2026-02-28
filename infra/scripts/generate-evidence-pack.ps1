<#
.SYNOPSIS
  Generate a compliance evidence pack for a release.

.DESCRIPTION
  Collects all evidence artifacts into a single tamper-evident bundle:
    - Git state (commit, branch, tag, diff)
    - Rendered Helm manifests (dev/staging/prod)
    - Security scan results (Trivy, gitleaks, pnpm audit)
    - SBOM references
    - SLO definitions + alert rules
    - Policy definitions (Kyverno)
    - DR drill summary (if available)
    - k6 performance results (if available)
    - E2E test results (if available)
    - SHA-256 manifest for tamper detection

.PARAMETER Tag
  Release tag for labeling (e.g., "v1.2.3"). Defaults to current git SHA.

.PARAMETER OutDir
  Output directory. Defaults to artifacts/compliance/<timestamp>.

.EXAMPLE
  .\generate-evidence-pack.ps1
  .\generate-evidence-pack.ps1 -Tag v1.2.3
#>
param(
    [string]$Tag = "",
    [string]$OutDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot/..").Path
$ts = Get-Date -Format "yyyyMMdd-HHmmss"

if (-not $Tag) {
    try { $Tag = (git -C $repoRoot rev-parse --short HEAD 2>$null) } catch { $Tag = "unknown" }
}
if (-not $OutDir) {
    $OutDir = Join-Path $repoRoot "artifacts/compliance/$ts-$Tag"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

function Log($msg) {
    Write-Host "[evidence] $msg"
}

function Safe-Copy($src, $dest) {
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dest -Force
        Log "  Copied: $src"
        return $true
    }
    Log "  Skipped (not found): $src"
    return $false
}

$manifest = @()

# ================================================================
# 1. Git State
# ================================================================
Log "--- 1. Git State ---"
$gitDir = Join-Path $OutDir "git"
New-Item -ItemType Directory -Path $gitDir -Force | Out-Null

try {
    $gitState = @{
        commit    = (git -C $repoRoot rev-parse HEAD 2>$null)
        shortSha  = (git -C $repoRoot rev-parse --short HEAD 2>$null)
        branch    = (git -C $repoRoot rev-parse --abbrev-ref HEAD 2>$null)
        tag       = $Tag
        timestamp = (Get-Date -Format o)
        clean     = ((git -C $repoRoot status --porcelain 2>$null) -eq "")
    }
    $gitState | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $gitDir "state.json") -Encoding ascii
    $manifest += "git/state.json"

    # Recent commits
    git -C $repoRoot log --oneline -20 2>$null | Set-Content (Join-Path $gitDir "recent-commits.txt") -Encoding ascii
    $manifest += "git/recent-commits.txt"
} catch {
    Log "  Git info unavailable: $_"
}

# ================================================================
# 2. Rendered Helm Manifests
# ================================================================
Log "--- 2. Helm Manifests ---"
$helmDir = Join-Path $OutDir "helm"
New-Item -ItemType Directory -Path $helmDir -Force | Out-Null

$helmPath = "$env:LOCALAPPDATA\helm"
if (Test-Path $helmPath) { $env:PATH = "$helmPath;$env:PATH" }

$charts = @(
    @{ Name = "ve-shared"; Chart = "infra/helm/ve-shared" },
    @{ Name = "ve-tenant"; Chart = "infra/helm/ve-tenant" }
)

foreach ($chart in $charts) {
    $chartPath = Join-Path $repoRoot $chart.Chart
    if (Test-Path $chartPath) {
        foreach ($env_ in @("dev","staging","prod")) {
            $vf = Join-Path $repoRoot "infra/environments/$env_/shared.values.yaml"
            if ($chart.Name -eq "ve-tenant") {
                $vf = Join-Path $repoRoot "infra/environments/$env_/tenant.defaults.values.yaml"
            }
            if (Test-Path $vf) {
                $outFile = Join-Path $helmDir "$($chart.Name)-$env_.yaml"
                try {
                    helm template $chart.Name $chartPath -f $vf 2>$null | Set-Content $outFile -Encoding ascii
                    $manifest += "helm/$($chart.Name)-$env_.yaml"
                    Log "  Rendered $($chart.Name) for $env_"
                } catch {
                    Log "  Helm template failed for $($chart.Name)-$env_: $_"
                }
            }
        }
    }
}

# ================================================================
# 3. Security Scans
# ================================================================
Log "--- 3. Security Scan Artifacts ---"
$secDir = Join-Path $OutDir "security"
New-Item -ItemType Directory -Path $secDir -Force | Out-Null

# Copy existing scan artifacts if available
$scanSources = @(
    @{ Src = "artifacts/phase-199/gitleaks-report.json"; Dest = "security/gitleaks.json" },
    @{ Src = "artifacts/phase-199/sbom-api.spdx.json";   Dest = "security/sbom-api.spdx.json" },
    @{ Src = "artifacts/phase-199/pnpm-audit.json";       Dest = "security/pnpm-audit.json" }
)

foreach ($scan in $scanSources) {
    $src = Join-Path $repoRoot $scan.Src
    $dest = Join-Path $OutDir $scan.Dest
    if (Safe-Copy $src $dest) {
        $manifest += $scan.Dest
    }
}

# Run fresh pnpm audit
try {
    $auditFile = Join-Path $secDir "pnpm-audit-fresh.json"
    pnpm audit --json 2>$null | Set-Content $auditFile -Encoding ascii
    $manifest += "security/pnpm-audit-fresh.json"
    Log "  Fresh pnpm audit completed"
} catch {
    Log "  pnpm audit skipped: $_"
}

# ================================================================
# 4. SLO + Alert Definitions
# ================================================================
Log "--- 4. SLO + Alert Definitions ---"
$sloDir = Join-Path $OutDir "slo"
New-Item -ItemType Directory -Path $sloDir -Force | Out-Null

$sloFiles = @(
    "infra/observability/slo/slo-spec.yaml",
    "infra/observability/slo/alerts.rules.yaml"
)
foreach ($f in $sloFiles) {
    $src = Join-Path $repoRoot $f
    $dest = Join-Path $sloDir (Split-Path $f -Leaf)
    if (Safe-Copy $src $dest) {
        $manifest += "slo/$(Split-Path $f -Leaf)"
    }
}

# ================================================================
# 5. Policy Definitions
# ================================================================
Log "--- 5. Policy Definitions ---"
$polDir = Join-Path $OutDir "policy"
New-Item -ItemType Directory -Path $polDir -Force | Out-Null

$policyFiles = @(
    "infra/policy/kyverno/cluster-policies.yaml",
    "infra/opa/policy/authz.rego",
    "infra/opa/policy/data.json"
)
foreach ($f in $policyFiles) {
    $src = Join-Path $repoRoot $f
    $dest = Join-Path $polDir (Split-Path $f -Leaf)
    if (Safe-Copy $src $dest) {
        $manifest += "policy/$(Split-Path $f -Leaf)"
    }
}

# ================================================================
# 6. Test Results
# ================================================================
Log "--- 6. Test Results ---"
$testDir = Join-Path $OutDir "tests"
New-Item -ItemType Directory -Path $testDir -Force | Out-Null

$testSources = @(
    @{ Src = "apps/web/e2e-results.json"; Dest = "tests/e2e-web.json" },
    @{ Src = "apps/portal/e2e-results.json"; Dest = "tests/e2e-portal.json" }
)
foreach ($t in $testSources) {
    $src = Join-Path $repoRoot $t.Src
    $dest = Join-Path $OutDir $t.Dest
    if (Safe-Copy $src $dest) {
        $manifest += $t.Dest
    }
}

# k6 results
$k6Dir = Join-Path $repoRoot "tests/k6"
if (Test-Path $k6Dir) {
    Get-ChildItem $k6Dir -Filter "*.json" -ErrorAction SilentlyContinue | ForEach-Object {
        $dest = Join-Path $testDir "k6-$($_.Name)"
        Copy-Item $_.FullName $dest -Force
        $manifest += "tests/k6-$($_.Name)"
    }
}

# ================================================================
# 7. DR Drill Summary
# ================================================================
Log "--- 7. DR Drill Summary ---"
$drSrc = Join-Path $repoRoot "artifacts/dr-drill"
if (Test-Path $drSrc) {
    $drDir = Join-Path $OutDir "dr-drill"
    New-Item -ItemType Directory -Path $drDir -Force | Out-Null
    Get-ChildItem $drSrc -Filter "*.json" -ErrorAction SilentlyContinue | Select-Object -Last 1 | ForEach-Object {
        Copy-Item $_.FullName (Join-Path $drDir $_.Name) -Force
        $manifest += "dr-drill/$($_.Name)"
    }
}

# ================================================================
# 8. Environment Values
# ================================================================
Log "--- 8. Environment Values ---"
$envOutDir = Join-Path $OutDir "environments"
New-Item -ItemType Directory -Path $envOutDir -Force | Out-Null

foreach ($env_ in @("dev","staging","prod")) {
    $envSrc = Join-Path $repoRoot "infra/environments/$env_"
    if (Test-Path $envSrc) {
        $envDest = Join-Path $envOutDir $env_
        New-Item -ItemType Directory -Path $envDest -Force | Out-Null
        Get-ChildItem $envSrc -Filter "*.yaml" -ErrorAction SilentlyContinue | ForEach-Object {
            Copy-Item $_.FullName (Join-Path $envDest $_.Name) -Force
            $manifest += "environments/$env_/$($_.Name)"
        }
        # LKG
        $lkg = Join-Path $envSrc "releases/last-known-good.json"
        if (Test-Path $lkg) {
            Copy-Item $lkg (Join-Path $envDest "last-known-good.json") -Force
            $manifest += "environments/$env_/last-known-good.json"
        }
    }
}

# ================================================================
# 9. Generate SHA-256 Manifest
# ================================================================
Log "--- 9. Generating SHA-256 manifest ---"

$manifestEntries = @()
foreach ($entry in $manifest) {
    $fPath = Join-Path $OutDir $entry
    if (Test-Path $fPath) {
        $hash = (Get-FileHash -Path $fPath -Algorithm SHA256).Hash.ToLower()
        $manifestEntries += @{ file = $entry; sha256 = $hash }
    }
}

$manifestDoc = @{
    version     = "1.0"
    tag         = $Tag
    generatedAt = (Get-Date -Format o)
    generator   = "generate-evidence-pack.ps1"
    entries     = $manifestEntries
    totalFiles  = $manifestEntries.Count
}

$manifestPath = Join-Path $OutDir "manifest.json"
$manifestDoc | ConvertTo-Json -Depth 10 | Set-Content $manifestPath -Encoding ascii

# Generate manifest hash
$manifestHash = (Get-FileHash -Path $manifestPath -Algorithm SHA256).Hash.ToLower()
Set-Content (Join-Path $OutDir "manifest.sha256") -Value "$manifestHash  manifest.json" -Encoding ascii

Log ""
Log "=== Evidence pack generated ==="
Log "Tag: $Tag"
Log "Files: $($manifestEntries.Count)"
Log "Output: $OutDir"
Log "Manifest hash: $manifestHash"
