# infra/scripts/validate-values.ps1 - Validate environment values files
#Requires -Version 5.1
param(
    [ValidateSet('dev', 'staging', 'prod', 'all')]
    [string]$Environment = 'all'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$EnvRoot  = Join-Path $RepoRoot 'infra/environments'

$exitCode = 0
$checks   = 0
$failures = 0

function Check {
    param([string]$Name, [bool]$Condition, [string]$Detail)
    $script:checks++
    if ($Condition) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $Name -- $Detail" -ForegroundColor Red
        $script:failures++
        $script:exitCode = 1
    }
}

function Validate-Env {
    param([string]$Env)
    $dir = Join-Path $EnvRoot $Env
    Write-Host ""
    Write-Host "=== Validating environment: $Env ===" -ForegroundColor Cyan

    # Structure checks
    Check "shared.values.yaml exists" (Test-Path (Join-Path $dir 'shared.values.yaml')) "Missing shared.values.yaml"
    Check "tenant.defaults.values.yaml exists" (Test-Path (Join-Path $dir 'tenant.defaults.values.yaml')) "Missing tenant.defaults.values.yaml"
    Check "tenants/ directory exists" (Test-Path (Join-Path $dir 'tenants')) "Missing tenants/ directory"

    # Read shared values and check required keys
    $sharedFile = Join-Path $dir 'shared.values.yaml'
    if (Test-Path $sharedFile) {
        $content = Get-Content $sharedFile -Raw

        # Required keys in shared
        Check "shared: has global.namespace" ($content -match 'namespace:') "global.namespace missing"
        Check "shared: has postgres section" ($content -match 'postgres:') "postgres section missing"

        # Forbidden patterns -- no secrets in values files
        $secretPatterns = @(
            'password:\s*[''"]?[a-zA-Z0-9!@#$%^&*]{6,}',
            'secret:\s*[''"]?[a-zA-Z0-9!@#$%^&*]{6,}',
            'token:\s*[''"]?[a-zA-Z0-9!@#$%^&*]{20,}',
            'BEGIN\s+(RSA\s+)?PRIVATE\s+KEY',
            'aws_secret_access_key',
            'AKIA[0-9A-Z]{16}'
        )
        foreach ($pat in $secretPatterns) {
            $hasSecret = $content -match $pat
            Check "shared: no secret pattern ($($pat.Substring(0, [Math]::Min(30, $pat.Length)))...)" (-not $hasSecret) "Possible secret detected!"
        }
    }

    # Read tenant defaults
    $tenantFile = Join-Path $dir 'tenant.defaults.values.yaml'
    if (Test-Path $tenantFile) {
        $content = Get-Content $tenantFile -Raw
        Check "tenant-defaults: has api section" ($content -match 'api:') "api section missing"
        Check "tenant-defaults: has releaseChannel" ($content -match 'releaseChannel:') "releaseChannel missing"

        # Same secret check
        foreach ($pat in $secretPatterns) {
            $hasSecret = $content -match $pat
            Check "tenant-defaults: no secret ($($pat.Substring(0, [Math]::Min(30, $pat.Length)))...)" (-not $hasSecret) "Possible secret detected!"
        }
    }

    # Per-tenant overrides
    $tenantsDir = Join-Path $dir 'tenants'
    if (Test-Path $tenantsDir) {
        $tenantFiles = Get-ChildItem $tenantsDir -Filter '*.values.yaml' -ErrorAction SilentlyContinue
        foreach ($tf in $tenantFiles) {
            $tcontent = Get-Content $tf.FullName -Raw
            foreach ($pat in $secretPatterns) {
                $hasSecret = $tcontent -match $pat
                Check "tenant/$($tf.Name): no secret" (-not $hasSecret) "Possible secret in $($tf.Name)!"
            }
        }
    }

    # Env-specific checks
    if ($Env -eq 'prod') {
        if (Test-Path $sharedFile) {
            $content = Get-Content $sharedFile -Raw
            Check "prod: networkPolicies enabled" ($content -match 'networkPolicies:\s*\n\s*enabled:\s*true') "networkPolicies should be enabled in prod"
            Check "prod: policy enabled" ($content -match 'policy:\s*\n\s*enabled:\s*true') "policy enforcement should be enabled in prod"
        }
    }
}

$envs = if ($Environment -eq 'all') { @('dev', 'staging', 'prod') } else { @($Environment) }

foreach ($env in $envs) {
    $dir = Join-Path $EnvRoot $env
    if (Test-Path $dir) {
        Validate-Env $env
    } else {
        Write-Host "SKIP: $env directory not found at $dir" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "  Checks:   $checks"
Write-Host "  Failures: $failures"

if ($exitCode -ne 0) {
    Write-Host "  RESULT: FAIL" -ForegroundColor Red
} else {
    Write-Host "  RESULT: PASS" -ForegroundColor Green
}

exit $exitCode
