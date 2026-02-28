# services/vista-distro/synthea-seed/seed-synthea.ps1
# Download Synthea, generate synthetic patients, and produce FHIR bundles
# for VistA ingestion.
#
# Usage:
#   .\services\vista-distro\synthea-seed\seed-synthea.ps1
#   .\services\vista-distro\synthea-seed\seed-synthea.ps1 -Population 50
#   .\services\vista-distro\synthea-seed\seed-synthea.ps1 -State Massachusetts -City Boston
#
# Prerequisites:
#   - Java 11+ (for Synthea)
#   - Internet access (to download Synthea JAR on first run)
#
# Output:
#   services/vista-distro/synthea-seed/output/fhir/  -- FHIR Bundle JSON files
#   services/vista-distro/synthea-seed/output/csv/    -- CSV exports
#
# NOTE: Ingesting FHIR bundles into VistA requires the ZVESYN*.m routines
# (scaffold only -- see README.md for migration plan).

#Requires -Version 5.1
param(
    [int]$Population = 20,
    [string]$State = "Massachusetts",
    [string]$City = "Bedford",
    [string]$SyntheaVersion = "3.3.0",
    [switch]$SkipDownload
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SeedDir = $PSScriptRoot
$OutputDir = Join-Path $SeedDir "output"
$SyntheaJar = Join-Path $SeedDir "synthea-with-dependencies.jar"
$SyntheaUrl = "https://github.com/synthetichealth/synthea/releases/download/v$SyntheaVersion/synthea-with-dependencies.jar"

Write-Host "=== VistA-Evolved Synthea Patient Seeder ===" -ForegroundColor Cyan
Write-Host "  Population: $Population"
Write-Host "  Location:   $City, $State"
Write-Host ""

# --- Step 1: Check Java ---
Write-Host "[1/4] Checking Java..." -ForegroundColor Green
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Java not found. Synthea requires Java 11+." -ForegroundColor Red
    Write-Host "  Install: choco install temurin17  OR  scoop install temurin17-jdk" -ForegroundColor Yellow
    exit 1
}
$javaVersion = (java -version 2>&1 | Select-Object -First 1) -replace '.*"(\d+)\..*', '$1'
Write-Host "  Java version prefix: $javaVersion" -ForegroundColor Gray

# --- Step 2: Download Synthea ---
if (-not $SkipDownload -and -not (Test-Path $SyntheaJar)) {
    Write-Host "[2/4] Downloading Synthea v$SyntheaVersion..." -ForegroundColor Green
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $SyntheaUrl -OutFile $SyntheaJar -UseBasicParsing
        Write-Host "  Downloaded: $SyntheaJar" -ForegroundColor Gray
    } catch {
        Write-Host "ERROR: Failed to download Synthea: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[2/4] Synthea JAR already present, skipping download." -ForegroundColor Gray
}

# --- Step 3: Generate patients ---
Write-Host "[3/4] Generating $Population synthetic patients..." -ForegroundColor Green
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$syntheaArgs = @(
    "-jar", $SyntheaJar,
    "-p", $Population,
    "-s", "42",           # seed for reproducibility
    "--exporter.fhir.export", "true",
    "--exporter.csv.export", "true",
    "--exporter.baseDirectory", $OutputDir,
    $State, $City
)

java @syntheaArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Synthea generation failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

# --- Step 4: Summary ---
$fhirDir = Join-Path $OutputDir "fhir"
$bundleCount = 0
if (Test-Path $fhirDir) {
    $bundleCount = (Get-ChildItem -Path $fhirDir -Filter "*.json").Count
}

Write-Host ""
Write-Host "[4/4] Generation complete!" -ForegroundColor Green
Write-Host "  FHIR bundles: $bundleCount (in $fhirDir)" -ForegroundColor White
Write-Host "  CSV exports:  $(Join-Path $OutputDir 'csv')" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the distro container" -ForegroundColor White
Write-Host "  2. Copy FHIR bundles into the container" -ForegroundColor White
Write-Host "  3. Run the ZVESYN ingest routine (when available)" -ForegroundColor White
Write-Host ""
Write-Host "See README.md for the full ingestion workflow." -ForegroundColor Gray
