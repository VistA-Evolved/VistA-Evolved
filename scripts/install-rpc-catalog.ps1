<#
.SYNOPSIS
  Installs the VE LIST RPCS RPC into the WorldVistA Docker sandbox.

.DESCRIPTION
  Phase 37B -- Copies ZVERPC.m into the container and runs INSTALL^ZVERPC
  to register the RPC in File 8994 and add it to OR CPRS GUI CHART context.

.NOTES
  Idempotent -- safe to run multiple times.
  Requires Docker container 'wv' to be running.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$containerName = 'wv'
$mFile = Join-Path $PSScriptRoot '..\services\vista\ZVERPC.m'

# --- 1. Check container ---
Write-Host "`n=== Step 1: Checking Docker container '$containerName' ===" -ForegroundColor Cyan
$running = docker ps --filter "name=$containerName" --format '{{.Names}}' 2>$null
if ($running -ne $containerName) {
    Write-Host "  Container '$containerName' is not running. Start it first." -ForegroundColor Red
    exit 1
}
Write-Host "  Container is running." -ForegroundColor Green

# --- 2. Copy M routine ---
Write-Host "`n=== Step 2: Copying ZVERPC.m to container ===" -ForegroundColor Cyan
docker cp $mFile "${containerName}:/home/wv/r/ZVERPC.m"
Write-Host "  Copied ZVERPC.m" -ForegroundColor Green

# --- 3. Run installer ---
Write-Host "`n=== Step 3: Running INSTALL^ZVERPC ===" -ForegroundColor Cyan
docker exec -it $containerName su - wv -c "mumps -run INSTALL^ZVERPC"

# --- 4. Verify ---
Write-Host "`n=== Step 4: Verification ===" -ForegroundColor Cyan
docker exec -it $containerName su - wv -c "mumps -run CHECK^ZVERPC"

Write-Host "`n=== Done ===" -ForegroundColor Green
