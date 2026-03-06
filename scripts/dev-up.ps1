<#
.SYNOPSIS
    VistA-Evolved -- Single canonical dev environment entrypoint (Windows/PowerShell).

.DESCRIPTION
    Starts the correct VistA runtime lane, waits for health, runs verification,
    and runs the fast QA gauntlet. Exits non-zero on any failure.

    Two profiles are supported:
      compose -- All-in-one root docker-compose.yml (worldvista-ehr, broker 9210)
      vehu    -- VEHU fidelity profile (worldvista/vehu, broker 9431) + local API/Web

    Evidence docs (VISTA_CONNECTIVITY_RESULTS.md) are generated under the VEHU profile.

.PARAMETER RuntimeLane
    Which VistA runtime lane to start. Must be "compose" or "vehu". Default: vehu.

.PARAMETER SkipVerify
    Skip pnpm verify:vista and pnpm qa:gauntlet:fast. Useful when you just
    want the Docker services running.

.PARAMETER SkipGauntlet
    Skip pnpm qa:gauntlet:fast but still run verify:vista.

.EXAMPLE
    .\scripts\dev-up.ps1 -RuntimeLane vehu
    .\scripts\dev-up.ps1 -RuntimeLane compose
    .\scripts\dev-up.ps1 -RuntimeLane vehu -SkipVerify
#>
[CmdletBinding()]
param(
    [ValidateSet("compose", "vehu")]
    [string]$RuntimeLane = "vehu",

    [switch]$SkipVerify,
    [switch]$SkipGauntlet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Definition)
Push-Location $ROOT

# ---------------------------------------------------------------------
# Runtime lane definitions
# ---------------------------------------------------------------------

$RUNTIME_LANES = @{
    compose = @{
        Label          = "All-in-one compose (worldvista-ehr)"
        ComposeFile    = "docker-compose.yml"
        ComposeArgs    = @()
        BrokerHost     = "127.0.0.1"
        BrokerPort     = 9210
        AccessCode     = $env:VISTA_ACCESS_CODE
        VerifyCode     = $env:VISTA_VERIFY_CODE
        InstanceId     = "compose-dev"
        HealthEndpoint = "http://127.0.0.1:9210"
        HealthTcp      = $true
        Notes          = @(
            "VistA broker on port 9210, Web UI on 8001"
            "PostgreSQL on 5432, Redis on 6379"
            "API on 4000 (containerized), Web on 5173 (containerized)"
            "Credentials: set VISTA_ACCESS_CODE / VISTA_VERIFY_CODE in your shell or .env"
            "Requires: .env at repo root (copy from .env.example)"
        )
    }
    vehu = @{
        Label          = "VEHU fidelity profile (worldvista/vehu)"
        ComposeFile    = "services/vista/docker-compose.yml"
        ComposeArgs    = @("--profile", "vehu")
        PgComposeFile  = "services/platform-db/docker-compose.yml"
        BrokerHost     = "127.0.0.1"
        BrokerPort     = 9431
        AccessCode     = "PRO1234"
        VerifyCode     = "PRO1234!!"
        InstanceId     = "vehu-dev"
        HealthEndpoint = "http://127.0.0.1:9431"
        HealthTcp      = $true
        Notes          = @(
            "VistA VEHU broker on port 9431, SSH on 2223"
            "PostgreSQL on 5433"
            "API runs locally on 3001, Web runs locally on 3000"
            "Credentials: PRO1234 / PRO1234!!"
            "Requires: apps/api/.env.local (copy from apps/api/.env.example)"
            "Evidence docs generated under this profile"
        )
    }
}

$P = $RUNTIME_LANES[$RuntimeLane]

if ([string]::IsNullOrWhiteSpace($P.AccessCode)) {
    $P.AccessCode = "PRO1234"
}
if ([string]::IsNullOrWhiteSpace($P.VerifyCode)) {
    $P.VerifyCode = "PRO1234!!"
}

# ---------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  VistA-Evolved Dev-Up  --  Profile: $RuntimeLane" -ForegroundColor Cyan
Write-Host "  $($P.Label)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
foreach ($note in $P.Notes) {
    Write-Host "  * $note" -ForegroundColor DarkGray
}
Write-Host ""

# ---------------------------------------------------------------------
# Step 0: Preflight checks
# ---------------------------------------------------------------------

Write-Host "[0/6] Preflight checks..." -ForegroundColor Yellow

# Docker
$savedEAP2 = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw "docker info failed" }
    Write-Host "  [OK] Docker is running" -ForegroundColor Green
} catch {
    $ErrorActionPreference = $savedEAP2
    Write-Host "  [FAIL] Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    Pop-Location; exit 1
}
$ErrorActionPreference = $savedEAP2

# pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "  [FAIL] pnpm not found. Install via: corepack enable" -ForegroundColor Red
    Pop-Location; exit 1
}
Write-Host "  [OK] pnpm available" -ForegroundColor Green

# Env file check
if ($RuntimeLane -eq "compose") {
    if (-not (Test-Path -LiteralPath "$ROOT\.env")) {
        if (Test-Path -LiteralPath "$ROOT\.env.example") {
            Write-Host "  [WARN] .env not found -- copying from .env.example" -ForegroundColor DarkYellow
            Copy-Item "$ROOT\.env.example" "$ROOT\.env"
            Write-Host "  [ACTION] Edit .env and set POSTGRES_PASSWORD + VISTA credentials, then rerun." -ForegroundColor Red
            Pop-Location; exit 1
        } else {
            Write-Host "  [FAIL] Neither .env nor .env.example found at repo root." -ForegroundColor Red
            Pop-Location; exit 1
        }
    }
    Write-Host "  [OK] .env exists" -ForegroundColor Green
} else {
    if (-not (Test-Path -LiteralPath "$ROOT\apps\api\.env.local")) {
        Write-Host "  [WARN] apps/api/.env.local not found." -ForegroundColor DarkYellow
        Write-Host "         Creating from .env.example with VEHU defaults..." -ForegroundColor DarkYellow
        if (Test-Path -LiteralPath "$ROOT\apps\api\.env.example") {
            $envContent = Get-Content "$ROOT\apps\api\.env.example" -Raw
            # Patch VEHU defaults
            $envContent = $envContent -replace 'VISTA_PORT=9430', 'VISTA_PORT=9431'
            $envContent = $envContent -replace 'VISTA_ACCESS_CODE=', 'VISTA_ACCESS_CODE=PRO1234'
            $envContent = $envContent -replace 'VISTA_VERIFY_CODE=', 'VISTA_VERIFY_CODE=PRO1234!!'
            # Add PG URL if not present
            if ($envContent -notmatch 'PLATFORM_PG_URL=') {
                $envContent += "`nPLATFORM_PG_URL=postgresql://ve_api:ve_dev_only_change_in_prod@127.0.0.1:5433/ve_platform`n"
            }
            [System.IO.File]::WriteAllText("$ROOT\apps\api\.env.local", $envContent)
            Write-Host "  [OK] apps/api/.env.local created with VEHU defaults. Review and rerun if needed." -ForegroundColor Green
        } else {
            Write-Host "  [FAIL] apps/api/.env.example not found." -ForegroundColor Red
            Pop-Location; exit 1
        }
    }
    Write-Host "  [OK] apps/api/.env.local exists" -ForegroundColor Green
}

# node_modules
if (-not (Test-Path -LiteralPath "$ROOT\node_modules")) {
    Write-Host "  [INFO] node_modules missing -- running pnpm install..." -ForegroundColor DarkYellow
    pnpm install --frozen-lockfile 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] pnpm install failed." -ForegroundColor Red
        Pop-Location; exit 1
    }
    Write-Host "  [OK] pnpm install complete" -ForegroundColor Green
} else {
    Write-Host "  [OK] node_modules present" -ForegroundColor Green
}

# ---------------------------------------------------------------------
# Step 1: Start Docker services
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[1/6] Starting Docker services for profile: $RuntimeLane ..." -ForegroundColor Yellow

# Docker compose writes status to stderr even on success.
# Temporarily relax ErrorActionPreference so stderr lines don't throw.
$savedEAP = $ErrorActionPreference
$ErrorActionPreference = "Continue"

if ($RuntimeLane -eq "compose") {
    Write-Host "  docker compose -f docker-compose.yml up -d" -ForegroundColor DarkGray
    docker compose -f $P.ComposeFile up -d 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        $ErrorActionPreference = $savedEAP
        Write-Host "  [FAIL] docker compose up failed." -ForegroundColor Red
        Pop-Location; exit 1
    }
} else {
    # VEHU: start VistA + PostgreSQL from separate compose files
    $vistaArgs = @("-f", $P.ComposeFile) + $P.ComposeArgs + @("up", "-d")
    Write-Host "  docker compose $($vistaArgs -join ' ')" -ForegroundColor DarkGray
    docker compose @vistaArgs 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        $ErrorActionPreference = $savedEAP
        Write-Host "  [FAIL] VistA docker compose up failed." -ForegroundColor Red
        Pop-Location; exit 1
    }

    Write-Host "  docker compose -f $($P.PgComposeFile) up -d" -ForegroundColor DarkGray
    docker compose -f $P.PgComposeFile up -d 2>&1 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    if ($LASTEXITCODE -ne 0) {
        $ErrorActionPreference = $savedEAP
        Write-Host "  [FAIL] PostgreSQL docker compose up failed." -ForegroundColor Red
        Pop-Location; exit 1
    }
}

$ErrorActionPreference = $savedEAP

Write-Host "  [OK] Docker services started" -ForegroundColor Green

# ---------------------------------------------------------------------
# Step 2: Wait for VistA broker health
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[2/6] Waiting for VistA broker on port $($P.BrokerPort) ..." -ForegroundColor Yellow

$maxWait = 120  # seconds
$elapsed = 0
$healthy = $false

while ($elapsed -lt $maxWait) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect($P.BrokerHost, $P.BrokerPort)
        $tcp.Close()
        $healthy = $true
        break
    } catch {
        # not ready yet
    }
    Start-Sleep -Seconds 3
    $elapsed += 3
    Write-Host "  ... waiting ($elapsed s / $maxWait s)" -ForegroundColor DarkGray
}

if (-not $healthy) {
    Write-Host "  [FAIL] VistA broker not reachable on port $($P.BrokerPort) after $maxWait s." -ForegroundColor Red
    Pop-Location; exit 1
}

Write-Host "  [OK] VistA broker is accepting connections ($elapsed s)" -ForegroundColor Green

# ---------------------------------------------------------------------
# Step 3: Set environment variables for verify step
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "[3/6] Setting environment for verification..." -ForegroundColor Yellow

$env:VISTA_HOST = $P.BrokerHost
$env:VISTA_PORT = "$($P.BrokerPort)"
$env:VISTA_ACCESS_CODE = $P.AccessCode
$env:VISTA_VERIFY_CODE = $P.VerifyCode
$env:VISTA_CONTEXT = "OR CPRS GUI CHART"
$env:VISTA_INSTANCE_ID = $P.InstanceId

Write-Host "  VISTA_HOST        = $env:VISTA_HOST" -ForegroundColor DarkGray
Write-Host "  VISTA_PORT        = $env:VISTA_PORT" -ForegroundColor DarkGray
Write-Host "  VISTA_INSTANCE_ID = $env:VISTA_INSTANCE_ID" -ForegroundColor DarkGray
Write-Host "  VISTA_ACCESS_CODE = (set)" -ForegroundColor DarkGray
Write-Host "  VISTA_VERIFY_CODE = (set)" -ForegroundColor DarkGray
Write-Host "  [OK] Environment configured" -ForegroundColor Green

# ---------------------------------------------------------------------
# Step 4: Run pnpm verify:vista
# ---------------------------------------------------------------------

$exitCode = 0

if (-not $SkipVerify) {
    Write-Host ""
    Write-Host "[4/6] Running pnpm verify:vista ..." -ForegroundColor Yellow

    pnpm verify:vista 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] verify:vista failed (exit $LASTEXITCODE)" -ForegroundColor Red
        $exitCode = 1
    } else {
        Write-Host "  [PASS] verify:vista succeeded" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "[4/6] Skipped (--SkipVerify)" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------
# Step 5: Run pnpm qa:gauntlet:fast
# ---------------------------------------------------------------------

if (-not $SkipVerify -and -not $SkipGauntlet) {
    Write-Host ""
    Write-Host "[5/6] Running pnpm qa:gauntlet:fast ..." -ForegroundColor Yellow

    pnpm qa:gauntlet:fast 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] qa:gauntlet:fast failed (exit $LASTEXITCODE)" -ForegroundColor Red
        $exitCode = 1
    } else {
        Write-Host "  [PASS] qa:gauntlet:fast succeeded" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "[5/6] Skipped" -ForegroundColor DarkGray
}

# ---------------------------------------------------------------------
# Step 6: Summary
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Profile: $RuntimeLane  --  $($P.Label)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  VistA Broker : $($P.BrokerHost):$($P.BrokerPort)" -ForegroundColor White

if ($RuntimeLane -eq "compose") {
    Write-Host "  API          : http://127.0.0.1:4000  (containerized)" -ForegroundColor White
    Write-Host "  Web          : http://127.0.0.1:5173  (containerized)" -ForegroundColor White
    Write-Host "  PostgreSQL   : 127.0.0.1:5432" -ForegroundColor White
    Write-Host "  Redis        : 127.0.0.1:6379" -ForegroundColor White
    Write-Host "  VistA Web UI : http://127.0.0.1:8001" -ForegroundColor White
} else {
    Write-Host "  PostgreSQL   : 127.0.0.1:5433" -ForegroundColor White
    Write-Host "  API          : Start manually: cd apps/api; npx tsx --env-file=.env.local src/index.ts" -ForegroundColor White
    Write-Host "  Web          : Start manually: cd apps/web; pnpm dev" -ForegroundColor White
}

Write-Host ""

if ($exitCode -ne 0) {
    Write-Host "  RESULT: FAIL" -ForegroundColor Red
} else {
    Write-Host "  RESULT: PASS" -ForegroundColor Green
}

Write-Host ""
Pop-Location
exit $exitCode
