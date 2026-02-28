# infra/tls/mkcert-bootstrap.ps1 - Generate trusted local TLS certs via mkcert
#
# This script:
#   1. Installs the mkcert local CA into the system trust store
#   2. Generates certs for ehr.local + localhost
#   3. Writes them to infra/tls/certs/ (gitignored)
#   4. (Optional) Adds ehr.local to the hosts file
#
# Prerequisites:
#   - mkcert (https://github.com/FiloSottile/mkcert)
#     Install: choco install mkcert  OR  scoop install mkcert
#   - Run as Administrator (for CA install + hosts file edit)
#
# Usage:
#   .\infra\tls\mkcert-bootstrap.ps1
#   .\infra\tls\mkcert-bootstrap.ps1 -SkipHosts       # skip hosts file edit
#   .\infra\tls\mkcert-bootstrap.ps1 -CertsDir C:\certs # custom output dir

#Requires -Version 5.1
param(
    [switch]$SkipHosts,
    [string]$CertsDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Domains = @("ehr.local", "localhost", "127.0.0.1", "::1")

# Resolve output directory
if (-not $CertsDir) {
    $CertsDir = Join-Path $PSScriptRoot "certs"
}

Write-Host "=== VistA-Evolved Local TLS Bootstrap ===" -ForegroundColor Cyan
Write-Host ""

# --- Pre-flight: check mkcert ---
if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: 'mkcert' not found." -ForegroundColor Red
    Write-Host "  Install: choco install mkcert  OR  scoop install mkcert" -ForegroundColor Yellow
    Write-Host "  https://github.com/FiloSottile/mkcert" -ForegroundColor Yellow
    exit 1
}

# --- Step 1: Install local CA ---
Write-Host "[1/4] Installing mkcert local CA..." -ForegroundColor Green
mkcert -install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: mkcert -install failed. Are you running as Administrator?" -ForegroundColor Red
    exit 1
}
Write-Host "  CA installed. Browsers will trust mkcert certs." -ForegroundColor Gray

# --- Step 2: Create certs directory ---
Write-Host "[2/4] Creating certs directory: $CertsDir" -ForegroundColor Green
if (-not (Test-Path $CertsDir)) {
    New-Item -ItemType Directory -Path $CertsDir -Force | Out-Null
}

# --- Step 3: Generate certs ---
Write-Host "[3/4] Generating certs for: $($Domains -join ', ')" -ForegroundColor Green
Push-Location $CertsDir
try {
    mkcert @Domains
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: mkcert cert generation failed." -ForegroundColor Red
        exit 1
    }
    # mkcert creates files like: ehr.local+3.pem and ehr.local+3-key.pem
    # Rename to predictable names
    $certFile = Get-ChildItem -Filter "*+*-key.pem" | Select-Object -First 1
    if ($certFile) {
        $baseName = $certFile.Name -replace '-key\.pem$', ''
        $srcCert = Join-Path $CertsDir "$baseName.pem"
        $srcKey  = Join-Path $CertsDir "$baseName-key.pem"
        $dstCert = Join-Path $CertsDir "cert.pem"
        $dstKey  = Join-Path $CertsDir "key.pem"

        if (Test-Path $srcCert) { Copy-Item $srcCert $dstCert -Force }
        if (Test-Path $srcKey)  { Copy-Item $srcKey  $dstKey  -Force }
        Write-Host "  Created: cert.pem, key.pem" -ForegroundColor Gray
    }
} finally {
    Pop-Location
}

# --- Step 4: Add to hosts file ---
if (-not $SkipHosts) {
    Write-Host "[4/4] Checking hosts file for ehr.local..." -ForegroundColor Green
    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    $hostsContent = Get-Content $hostsPath -Raw
    if ($hostsContent -notmatch 'ehr\.local') {
        try {
            Add-Content -Path $hostsPath -Value "`n# VistA-Evolved local TLS`n127.0.0.1 ehr.local" -Encoding ASCII
            Write-Host "  Added '127.0.0.1 ehr.local' to hosts file." -ForegroundColor Gray
        } catch {
            Write-Host "  WARNING: Could not write to hosts file. Run as Administrator or add manually:" -ForegroundColor Yellow
            Write-Host "    127.0.0.1 ehr.local" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ehr.local already in hosts file." -ForegroundColor Gray
    }
} else {
    Write-Host "[4/4] Skipping hosts file (use -SkipHosts flag)." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== TLS Bootstrap Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Generated certs in: $CertsDir" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start Caddy TLS proxy:" -ForegroundColor White
Write-Host "       docker compose -f infra/tls/docker-compose.tls.yml up -d" -ForegroundColor Gray
Write-Host "  2. Start API + Web normally (ports 3001 + 3000)" -ForegroundColor White
Write-Host "  3. Open https://ehr.local in your browser" -ForegroundColor White
Write-Host ""
Write-Host "For nginx (prod compose), copy certs to nginx/certs/:" -ForegroundColor Cyan
Write-Host "  Copy-Item $CertsDir\cert.pem nginx\certs\" -ForegroundColor Gray
Write-Host "  Copy-Item $CertsDir\key.pem  nginx\certs\" -ForegroundColor Gray
