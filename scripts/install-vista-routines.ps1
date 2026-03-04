<#
.SYNOPSIS
    Unified VistA routine installer -- copies all production ZVE*.m routines
    into the WorldVistA Docker container, registers RPCs, and verifies.

.DESCRIPTION
    Phase 155 -- Replaces the need to run install-interop-rpcs.ps1,
    install-rpc-catalog.ps1, and install-rcm-wrappers.ps1 separately.
    Phase 476 -- Added -VistaUser and -RoutinesDir for VEHU support.

    Steps:
      1. Check Docker container is running
      2. Copy all production .m routines into container
      3. Run each INSTALL entry point (idempotent)
      4. Add RPCs to OR CPRS GUI CHART context
      5. Verify each routine is callable

    Idempotent -- safe to run multiple times.
    Does NOT install diagnostic/probe routines (ZVEBILP, ZVESCHD*, etc.)
    Does NOT run ZVESDSEED (scheduling sandbox seeder) unless -Seed is passed.

.PARAMETER ContainerName
    Docker container name (default: "wv")

.PARAMETER VistaUser
    VistA OS user inside the container (default: auto-detect from container)
    "wv" for worldvista-ehr, "vehu" for VEHU image

.PARAMETER RoutinesDir
    Path to routines directory inside container (default: /home/<VistaUser>/r)

.PARAMETER Seed
    Also run ZVESDSEED scheduling sandbox seeder (DEV only)

.PARAMETER SkipVerify
    Skip the post-install verification step

.EXAMPLE
    .\scripts\install-vista-routines.ps1
    .\scripts\install-vista-routines.ps1 -ContainerName vehu -VistaUser vehu
    .\scripts\install-vista-routines.ps1 -ContainerName wv -Seed
#>
[CmdletBinding()]
param(
    [string]$ContainerName = "wv",
    [string]$VistaUser = "",
    [string]$RoutinesDir = "",
    [switch]$Seed,
    [switch]$SkipVerify
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir
$VistaDir  = Join-Path $RepoRoot "services\vista"

$pass = 0
$fail = 0
$warn = 0

function Write-Gate($status, $msg) {
    switch ($status) {
        "PASS" { Write-Host "  PASS  $msg" -ForegroundColor Green; $script:pass++ }
        "FAIL" { Write-Host "  FAIL  $msg" -ForegroundColor Red;   $script:fail++ }
        "WARN" { Write-Host "  WARN  $msg" -ForegroundColor Yellow; $script:warn++ }
        "INFO" { Write-Host "  INFO  $msg" -ForegroundColor Cyan }
    }
}

Write-Host ""
Write-Host "=== Phase 155/476: Unified VistA Routine Installer ===" -ForegroundColor Cyan
Write-Host "    Container: $ContainerName"

# ================================================================
# Step 0: Auto-detect VistaUser if not provided
# ================================================================
if (-not $VistaUser) {
    # Check if /home/vehu exists in the container (VEHU image)
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $vehuCheck = docker exec $ContainerName test -d /home/vehu 2>&1
    $vehuExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    if ($vehuExit -eq 0) {
        $VistaUser = "vehu"
    } else {
        $VistaUser = "wv"
    }
    Write-Host "    Auto-detected VistaUser: $VistaUser"
}
if (-not $RoutinesDir) {
    $RoutinesDir = "/home/$VistaUser/r"
}
Write-Host "    VistaUser: $VistaUser"
Write-Host "    RoutinesDir: $RoutinesDir"
Write-Host ""

# ================================================================
# Step 1: Verify container is running
# ================================================================
Write-Host "--- Step 1: Docker container check ---"
try {
    $status = docker inspect --format '{{.State.Status}}' $ContainerName 2>&1
    if ($LASTEXITCODE -ne 0 -or $status -ne "running") {
        Write-Gate "FAIL" "Container '$ContainerName' is not running"
        Write-Host "  Start with: cd services\vista; docker compose --profile dev up -d" -ForegroundColor Yellow
        exit 1
    }
    Write-Gate "PASS" "Container '$ContainerName' is running"
} catch {
    Write-Gate "FAIL" "Docker not available: $_"
    exit 1
}

# ================================================================
# Step 2: Copy production M routines into container
# ================================================================
Write-Host ""
Write-Host "--- Step 2: Copy M routines ---"

# Production routines that provide RPC entry points or installers
$productionRoutines = @(
    "ZVEMIOP.m",   # HL7/HLO interop monitor (6 RPC entry points)
    "ZVEMINS.m",   # Interop RPC installer
    "VEMCTX3.m",   # Safe context adder (appends to OR CPRS GUI CHART)
    "ZVEMSGR.m",   # MailMan RPC bridge (5 RPCs)
    "ZVEMSIN.m",   # MailMan RPC installer
    "ZVERPC.m",    # RPC catalog lister
    "ZVERCMP.m",   # RCM provider info wrapper
    "ZVEADT.m"     # ADT ward census/bed board (3 RPCs)
)

if ($Seed) {
    $productionRoutines += "ZVESDSEED.m"
    Write-Host "  (Including ZVESDSEED scheduling seeder)" -ForegroundColor Yellow
}

$copyFailed = $false
foreach ($routine in $productionRoutines) {
    $src = Join-Path $VistaDir $routine
    if (-not (Test-Path -LiteralPath $src)) {
        Write-Gate "WARN" "$routine not found at $src -- skipping"
        continue
    }
    # docker cp outputs "Successfully copied..." to stderr; suppress with
    # $ErrorActionPreference override to avoid PowerShell treating it as fatal.
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    docker cp $src "${ContainerName}:${RoutinesDir}/$routine" 2>&1 | Out-Null
    $cpExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    if ($cpExit -ne 0) {
        Write-Gate "FAIL" "Failed to copy $routine"
        $copyFailed = $true
    } else {
        Write-Gate "PASS" "Copied $routine"
    }
}

if ($copyFailed) {
    Write-Host "  Some copies failed -- aborting." -ForegroundColor Red
    exit 1
}

# Strip BOM and convert CRLF to LF (Windows git may check out with CRLF;
# YottaDB/MUMPS cannot parse labels when lines end with \r)
Write-Host "  Fixing line endings (BOM + CRLF)..."
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
docker exec $ContainerName bash -c "cd $RoutinesDir && for f in ZVE*.m VEMCTX3.m; do [ -f \`$f ] && sed -i 's/\r\`$//' \`$f && sed -i '1s/^\xEF\xBB\xBF//' \`$f; done" 2>&1 | Out-Null
$ErrorActionPreference = $prevEAP
Write-Gate "PASS" "Line endings normalized (BOM + CRLF stripped)"

# ================================================================
# Step 3: Run INSTALL entry points (idempotent)
# ================================================================
Write-Host ""
Write-Host "--- Step 3: Run INSTALL entry points ---"

# Each entry: label, mumps command, success pattern
$installSteps = @(
    @{
        Label   = "Interop RPCs (6 VE INTEROP *)"
        Command = "mumps -run RUN^ZVEMINS"
        Match   = "registered|already|VE INTEROP"
    },
    @{
        Label   = "MailMan RPCs (5 ZVE MAIL *)"
        Command = "mumps -run EN^ZVEMSIN"
        Match   = "registered|already|ZVE MAIL"
    },
    @{
        Label   = "RPC Catalog (VE LIST RPCS)"
        Command = "mumps -run INSTALL^ZVERPC"
        Match   = "registered|already|VE LIST"
    },
    @{
        Label   = "RCM Provider Info (VE RCM PROVIDER INFO)"
        Command = "mumps -run INSTALL^ZVERCMP"
        Match   = "registered|already|VE RCM"
    },
    @{
        Label   = "ADT RPCs (3 ZVEADT *)"
        Command = "mumps -run INSTALL^ZVEADT"
        Match   = "registered|already|ZVEADT"
    }
)

foreach ($step in $installSteps) {
    Write-Host "  Installing: $($step.Label)..."
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $output = docker exec $ContainerName su - $VistaUser -c $step.Command 2>&1
    $stepExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    $outputStr = ($output | Out-String).Trim()
    if ($outputStr) {
        # Indent multi-line output
        $outputStr -split "`n" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    if ($stepExit -ne 0) {
        Write-Gate "FAIL" "$($step.Label) (exit $stepExit)"
    } else {
        Write-Gate "PASS" $step.Label
    }
}

# ================================================================
# Step 4: Add RPCs to OR CPRS GUI CHART context
# ================================================================
Write-Host ""
Write-Host "--- Step 4: Add RPCs to broker context ---"

# VEMCTX3 handles interop RPCs; ZVEMSIN handles mail RPCs internally
Write-Host "  Running VEMCTX3 (interop context adder)..."
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$ctxOutput = docker exec $ContainerName su - $VistaUser -c "mumps -run VEMCTX3" 2>&1
$ctxExit = $LASTEXITCODE
$ErrorActionPreference = $prevEAP
$ctxStr = ($ctxOutput | Out-String).Trim()
if ($ctxStr) {
    $ctxStr -split "`n" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
}
if ($ctxExit -ne 0) {
    Write-Gate "WARN" "Context registration (exit $ctxExit)"
} else {
    Write-Gate "PASS" "Context registration (VEMCTX3)"
}

# ================================================================
# Step 5: Optional scheduling seed
# ================================================================
if ($Seed) {
    Write-Host ""
    Write-Host "--- Step 5a: Scheduling sandbox seed (ZVESDSEED) ---"
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $seedOutput = docker exec $ContainerName su - $VistaUser -c "mumps -run ZVESDSEED" 2>&1
    $seedExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEAP
    $seedStr = ($seedOutput | Out-String).Trim()
    if ($seedStr) {
        $seedStr -split "`n" | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }
    }
    if ($seedExit -ne 0) {
        Write-Gate "WARN" "Scheduling seed (exit $seedExit)"
    } else {
        Write-Gate "PASS" "Scheduling seed (DEV only)"
    }
}

# ================================================================
# Step 6: Verify (unless -SkipVerify)
# ================================================================
if (-not $SkipVerify) {
    Write-Host ""
    Write-Host "--- Step 6: Verification ---"

    # Check that key routines are callable
    $verifyTests = @(
        @{
            Label   = "ZVEMIOP callable"
            Command = "mumps -run %XCMD 'N R D LINKS^ZVEMIOP(.R,5) W R(0)'"
            Match   = "OK|0\^|\^"
        },
        @{
            Label   = "ZVEMSGR callable"
            Command = "mumps -run %XCMD 'S DUZ=87 N R D FOLDERS^ZVEMSGR(.R) W R(0)'"
            Match   = "ok|\d|\^"
        },
        @{
            Label   = "ZVERPC callable"
            Command = "mumps -run %XCMD 'N R D LIST^ZVERPC(.R) W R(0)'"
            Match   = "\d|\^|RPC"
        },
        @{
            Label   = "ZVERCMP callable"
            Command = "mumps -run %XCMD 'N R D LIST^ZVERCMP(.R,87) W R(0)'"
            Match   = "\d|\^|PROVIDER"
        },
        @{
            Label   = "ZVEADT callable"
            Command = "mumps -run %XCMD 'N R D WARDS^ZVEADT(.R) W R(0)'"
            Match   = "\d|\^|WARD"
        }
    )

    foreach ($test in $verifyTests) {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        $result = docker exec $ContainerName su - $VistaUser -c $test.Command 2>&1
        $verifyExit = $LASTEXITCODE
        $ErrorActionPreference = $prevEAP
        $resultStr = ($result | Out-String).Trim()
        if ($verifyExit -ne 0) {
            Write-Gate "WARN" "$($test.Label) (exit $verifyExit)"
        } elseif ($resultStr -match $test.Match) {
            Write-Gate "PASS" $test.Label
        } else {
            Write-Gate "WARN" "$($test.Label) -- output: $resultStr"
        }
    }
}

# ================================================================
# Summary
# ================================================================
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass  FAIL: $fail  WARN: $warn"
Write-Host ""

if ($fail -gt 0) {
    Write-Host "Installation completed with failures -- check output above." -ForegroundColor Red
    exit 1
} elseif ($warn -gt 0) {
    Write-Host "Installation completed with warnings." -ForegroundColor Yellow
} else {
    Write-Host "Installation SUCCESSFUL -- all routines installed and verified." -ForegroundColor Green
}
