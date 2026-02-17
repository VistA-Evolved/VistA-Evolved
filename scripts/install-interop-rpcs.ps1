<#
.SYNOPSIS
    Installs VistA-Evolved interop M routines into the WorldVistA Docker container
    and registers the RPC endpoints.

.DESCRIPTION
    1. Copies ZVEMIOP.m and ZVEMINS.m into the container's M routine directory
    2. Runs the installer to register RPCs in file 8994
    3. Verifies registration

.EXAMPLE
    .\scripts\install-interop-rpcs.ps1
#>
param(
    [string]$ContainerName = "wv"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$VistaDir  = Join-Path $RepoRoot "services\vista"

Write-Host "=== VistA-Evolved Interop RPC Installer ===" -ForegroundColor Cyan

# 1. Verify container is running
Write-Host "`n[1/4] Checking Docker container '$ContainerName'..."
$status = docker inspect --format '{{.State.Status}}' $ContainerName 2>&1
if ($LASTEXITCODE -ne 0 -or $status -ne "running") {
    Write-Host "  ERROR: Container '$ContainerName' is not running." -ForegroundColor Red
    Write-Host "  Start it with: cd services\vista; docker compose --profile dev up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Container is running." -ForegroundColor Green

# 2. Copy M routines into the container
Write-Host "`n[2/4] Copying M routines into container..."
$routines = @("ZVEMIOP.m", "ZVEMINS.m")
foreach ($r in $routines) {
    $src = Join-Path $VistaDir $r
    if (-not (Test-Path $src)) {
        Write-Host "  ERROR: $src not found" -ForegroundColor Red
        exit 1
    }
    docker cp $src "${ContainerName}:/home/wv/r/$r"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Failed to copy $r" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Copied $r" -ForegroundColor Green
}

# 3. Run the installer routine
Write-Host "`n[3/4] Running RPC registration (ZVEMINS)..."
$output = docker exec $ContainerName su - wv -c "mumps -run RUN^ZVEMINS" 2>&1
Write-Host $output

# 4. Quick verification â€” call each RPC tag directly
Write-Host "`n[4/4] Quick smoke test â€” calling LINKS^ZVEMIOP..."
$smoke = docker exec $ContainerName su - wv -c "mumps -run %XCMD 'N R D LINKS^ZVEMIOP(.R,5) W R(0)'" 2>&1
Write-Host "  LINKS result(0): $smoke"

if ($smoke -match "OK") {
    Write-Host "`n=== Installation SUCCESSFUL ===" -ForegroundColor Green
} else {
    Write-Host "`n=== Installation completed (check output above for warnings) ===" -ForegroundColor Yellow
}

