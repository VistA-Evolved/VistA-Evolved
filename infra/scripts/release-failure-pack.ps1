# infra/scripts/release-failure-pack.ps1 - Generate incident artifact pack on release failure
#Requires -Version 5.1
param(
    [Parameter(Mandatory=$true)]
    [string]$TenantSlug,

    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Env,

    [string]$Tag = "",
    [string]$OutputDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot  = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if (-not $OutputDir) {
    $OutputDir = Join-Path $RepoRoot "artifacts/release-failures/$timestamp"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$_gitCommit = git -C $RepoRoot rev-parse HEAD 2>$null
if (-not $_gitCommit) { $_gitCommit = "unknown" }
$_gitBranch = git -C $RepoRoot branch --show-current 2>$null
if (-not $_gitBranch) { $_gitBranch = "unknown" }

$pack = @{
    incidentId    = "INC-$timestamp"
    timestamp     = (Get-Date).ToString('o')
    environment   = $Env
    tenantSlug    = $TenantSlug
    imageTag      = $Tag
    gitCommit     = $_gitCommit
    gitBranch     = $_gitBranch
    artifacts     = @()
}

Write-Host "=== Release Failure Pack ===" -ForegroundColor Red
Write-Host "  Incident: $($pack.incidentId)"
Write-Host "  Tenant:   $TenantSlug"
Write-Host "  Tag:      $Tag"
Write-Host ""

# ---- 1. Helm manifests ----
Write-Host "Capturing rendered manifests..." -ForegroundColor Gray
$manifestFile = Join-Path $OutputDir 'rendered-manifests.yaml'
$chartPath = Join-Path $RepoRoot 'infra/helm/ve-tenant'
$valuesFile = Join-Path $RepoRoot "infra/environments/$Env/tenant.defaults.values.yaml"

try {
    $helmArgs = @('template', "tenant-$TenantSlug", $chartPath, '--set', "tenantId=$TenantSlug,tenantSlug=$TenantSlug")
    if (Test-Path $valuesFile) { $helmArgs += @('-f', $valuesFile) }
    $manifests = & helm @helmArgs 2>&1
    $manifests | Out-File $manifestFile -Encoding UTF8
    $pack.artifacts += "rendered-manifests.yaml"
    Write-Host "  [OK] Manifests captured." -ForegroundColor Green
} catch {
    Write-Host "  [WARN] Could not render manifests: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ---- 2. Pod logs ----
Write-Host "Capturing pod logs..." -ForegroundColor Gray
$ns = "ve-tenant-$TenantSlug"
try {
    $pods = kubectl get pods -n $ns -o jsonpath='{.items[*].metadata.name}' 2>$null
    if ($pods) {
        foreach ($pod in ($pods -split '\s+')) {
            $logFile = Join-Path $OutputDir "logs-$pod.txt"
            kubectl logs $pod -n $ns --tail=500 2>$null | Out-File $logFile -Encoding UTF8
            $pack.artifacts += "logs-$pod.txt"
        }
        Write-Host "  [OK] Logs captured." -ForegroundColor Green
    } else {
        Write-Host "  [WARN] No pods found in $ns" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [WARN] Could not capture logs: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ---- 3. Canary check results ----
Write-Host "Capturing canary gate results..." -ForegroundColor Gray
$canaryDir = Join-Path $RepoRoot 'artifacts/canary-check'
if (Test-Path $canaryDir) {
    $latestCanary = Get-ChildItem $canaryDir -Filter "*$TenantSlug*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestCanary) {
        Copy-Item $latestCanary.FullName (Join-Path $OutputDir 'canary-check-result.json')
        $pack.artifacts += "canary-check-result.json"
        Write-Host "  [OK] Canary result captured." -ForegroundColor Green
    }
}

# ---- 4. Event log ----
Write-Host "Capturing Kubernetes events..." -ForegroundColor Gray
try {
    $events = kubectl get events -n $ns --sort-by='.lastTimestamp' 2>$null
    if ($events) {
        $events | Out-File (Join-Path $OutputDir 'k8s-events.txt') -Encoding UTF8
        $pack.artifacts += "k8s-events.txt"
        Write-Host "  [OK] Events captured." -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARN] Could not capture events." -ForegroundColor Yellow
}

# ---- 5. Git diff (environment values) ----
Write-Host "Capturing git diff..." -ForegroundColor Gray
try {
    $diff = git -C $RepoRoot diff HEAD~3..HEAD -- "infra/environments/$Env/" 2>$null
    if ($diff) {
        $diff | Out-File (Join-Path $OutputDir 'git-diff.patch') -Encoding UTF8
        $pack.artifacts += "git-diff.patch"
    }
} catch {}

# ---- Write summary ----
$pack | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $OutputDir 'incident-summary.json') -Encoding UTF8

Write-Host ""
Write-Host "=== Incident Pack Created ===" -ForegroundColor Cyan
Write-Host "  Location: $OutputDir" -ForegroundColor Gray
Write-Host "  Artifacts: $($pack.artifacts.Count)" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: .\infra\scripts\rollback-release.ps1 -Env $Env -Commit"
Write-Host "  2. Investigate incident pack at: $OutputDir"
