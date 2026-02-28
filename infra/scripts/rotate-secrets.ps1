# infra/scripts/rotate-secrets.ps1 - Rotate secrets for a VistA-Evolved environment
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('dev', 'staging', 'prod')]
    [string]$Environment,

    [switch]$GenerateAgeKey,
    [switch]$DryRun
)

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path

Write-Host "=== VistA-Evolved Secret Rotation ===" -ForegroundColor Cyan
Write-Host "  Environment: $Environment"
Write-Host ""

# Check prerequisites
foreach ($cmd in @('sops', 'age-keygen')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' not found." -ForegroundColor Red
        Write-Host "Install SOPS: https://github.com/getsops/sops/releases" -ForegroundColor Gray
        Write-Host "Install age: https://github.com/FiloSottile/age/releases" -ForegroundColor Gray
        exit 1
    }
}

# Generate a new age key if requested
if ($GenerateAgeKey) {
    $keyFile = Join-Path $RepoRoot "infra/secrets/$Environment/age-key.txt"
    if ($DryRun) {
        Write-Host "(dry-run) Would generate new age key at: $keyFile" -ForegroundColor Yellow
    } else {
        Write-Host "Generating new age key..." -ForegroundColor Green
        age-keygen -o $keyFile
        Write-Host "Key saved to: $keyFile" -ForegroundColor Green
        Write-Host "  IMPORTANT: Add the PUBLIC key to .sops.yaml" -ForegroundColor Yellow
        Write-Host "  IMPORTANT: Store the private key in a vault, NOT in git" -ForegroundColor Red
        Get-Content $keyFile | Select-String "^# public key:" | ForEach-Object { Write-Host "  $_" -ForegroundColor Cyan }
    }
    exit 0
}

# Re-encrypt all secrets files for the environment with current keys
$secretsDir = Join-Path $RepoRoot "infra/secrets/$Environment"
if (-not (Test-Path -LiteralPath $secretsDir)) {
    Write-Host "No secrets directory found at: $secretsDir" -ForegroundColor Yellow
    exit 0
}

$files = Get-ChildItem -Path $secretsDir -Filter '*.yaml' -Recurse
foreach ($f in $files) {
    Write-Host "Rotating: $($f.FullName)" -ForegroundColor Gray
    if ($DryRun) {
        Write-Host "  (dry-run) Would run: sops updatekeys $($f.FullName)" -ForegroundColor Yellow
    } else {
        sops updatekeys $f.FullName --yes
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  WARNING: sops updatekeys failed for $($f.Name)" -ForegroundColor Yellow
        } else {
            Write-Host "  Rotated." -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Rotation complete for '$Environment'." -ForegroundColor Green
Write-Host "  Remember to commit the re-encrypted files." -ForegroundColor Gray
