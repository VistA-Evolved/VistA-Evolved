<#
.SYNOPSIS
  Select and validate VistA runtime for the current environment.
  Phase 424 (W26 P2).

.DESCRIPTION
  Reads runtime-matrix.json and the current PLATFORM_RUNTIME_MODE to determine:
    1. Which VistA environment should be active
    2. Whether the current adapter configuration is valid
    3. Whether stub adapters are permitted
    4. Domain readiness status

  Can optionally switch between sandbox/distro by updating .env.local.

.PARAMETER Mode
  Runtime mode override. Default: reads PLATFORM_RUNTIME_MODE or "dev".

.PARAMETER Target
  VistA target: "sandbox" (port 9430), "distro" (port 9431), or "auto" (detect).
  Default: "auto".

.PARAMETER Apply
  If set, updates apps/api/.env.local with the selected target's connection params.

.PARAMETER Validate
  If set, validates that the current configuration meets runtime mode requirements.
  This is the default action.

.EXAMPLE
  .\scripts\vista\select-runtime.ps1                      # Validate current config
  .\scripts\vista\select-runtime.ps1 -Target sandbox      # Check sandbox readiness
  .\scripts\vista\select-runtime.ps1 -Target distro -Apply # Switch to distro lane
  .\scripts\vista\select-runtime.ps1 -Mode rc -Validate   # Validate for RC mode
#>

param(
    [ValidateSet("dev", "test", "rc", "prod")]
    [string]$Mode,
    [ValidateSet("sandbox", "distro", "auto")]
    [string]$Target = "auto",
    [switch]$Apply,
    [switch]$Validate
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

# ---- Load runtime matrix ----
$matrixPath = Join-Path $RepoRoot "data\vista\runtime-matrix.json"
if (-not (Test-Path -LiteralPath $matrixPath)) {
    Write-Host "ERROR: runtime-matrix.json not found at $matrixPath" -ForegroundColor Red
    exit 1
}
$matrix = Get-Content -LiteralPath $matrixPath -Raw | ConvertFrom-Json

# ---- Determine runtime mode ----
if (-not $Mode) {
    $Mode = $env:PLATFORM_RUNTIME_MODE
    if (-not $Mode) {
        $Mode = "dev"
    }
}

$modeReqs = $matrix.runtimeModes.$Mode
if (-not $modeReqs) {
    Write-Host "ERROR: Unknown runtime mode '$Mode'" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== VistA Runtime Selector (Phase 424) ===" -ForegroundColor Cyan
Write-Host "  Runtime Mode: $Mode"
Write-Host "  Target:       $Target"
Write-Host "  Description:  $($modeReqs.description)"
Write-Host ""

$failures = @()
$warnings = @()

# ---- Target resolution ----
$targetConfig = @{
    sandbox = @{ host = "127.0.0.1"; port = 9430; instanceId = "worldvista-docker"; container = "wv" }
    distro  = @{ host = "127.0.0.1"; port = 9431; instanceId = "vista-distro"; container = "wv-distro" }
}

if ($Target -eq "auto") {
    # Try distro first (more production-like), fall back to sandbox
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect("127.0.0.1", 9431)
        $tcp.Close()
        $Target = "distro"
        Write-Host "  Auto-detected: distro lane (port 9431)" -ForegroundColor Green
    } catch {
        try {
            $tcp2 = New-Object System.Net.Sockets.TcpClient
            $tcp2.Connect("127.0.0.1", 9430)
            $tcp2.Close()
            $Target = "sandbox"
            Write-Host "  Auto-detected: sandbox (port 9430)" -ForegroundColor Green
        } catch {
            Write-Host "  Auto-detect: no VistA instance found" -ForegroundColor Yellow
            if ($modeReqs.vistaRequired -eq $true) {
                $failures += "VistA is required for '$Mode' mode but no instance is reachable"
            } else {
                $warnings += "No VistA instance detected (OK for $Mode mode)"
            }
        }
    }
}

$selected = $targetConfig[$Target]

# ---- Validation ----
Write-Host "[1/4] VistA connectivity..." -NoNewline
if ($selected) {
    $tcp = New-Object System.Net.Sockets.TcpClient
    try {
        $tcp.Connect($selected.host, $selected.port)
        $tcp.Close()
        Write-Host " OK ($Target on port $($selected.port))" -ForegroundColor Green
    } catch {
        if ($modeReqs.vistaRequired -eq $true) {
            $failures += "VistA ($Target) not reachable on port $($selected.port)"
            Write-Host " FAIL" -ForegroundColor Red
        } else {
            $warnings += "VistA ($Target) not reachable (optional for $Mode)"
            Write-Host " WARN (optional)" -ForegroundColor Yellow
        }
    }
}

Write-Host "[2/4] Adapter configuration..." -NoNewline
$envLocalPath = Join-Path $RepoRoot "apps\api\.env.local"
$adapterIssues = @()
foreach ($adapterName in @("ADAPTER_CLINICAL_ENGINE", "ADAPTER_SCHEDULING", "ADAPTER_BILLING", "ADAPTER_IMAGING", "ADAPTER_MESSAGING")) {
    $val = $env:$adapterName
    if (-not $val) { $val = "vista" }  # default
    if ($val -eq "stub" -and $modeReqs.stubAdaptersAllowed -ne $true) {
        $adapterIssues += "$adapterName=stub not allowed in $Mode mode"
    }
}

if ($adapterIssues.Count -gt 0) {
    foreach ($issue in $adapterIssues) { $failures += $issue }
    Write-Host " $($adapterIssues.Count) issues" -ForegroundColor Red
} else {
    Write-Host " OK" -ForegroundColor Green
}

Write-Host "[3/4] Domain readiness..." -NoNewline
$domainIssues = @()
$domains = $matrix.domainRequirements.PSObject.Properties
foreach ($d in $domains) {
    $domain = $d.Name
    $reqs = $d.Value
    if ($reqs.requiredInProd -eq $true -and $Mode -in @("rc", "prod")) {
        if ($reqs.minimumRpcs.Count -gt 0) {
            # Can't probe RPCs from PowerShell; just note the requirement
            $domainIssues += @{ domain = $domain; minimumRpcs = $reqs.minimumRpcs; status = "needs-runtime-probe" }
        }
    }
}

if ($domainIssues.Count -gt 0 -and $Mode -in @("rc", "prod")) {
    Write-Host " $($domainIssues.Count) domains need runtime probe" -ForegroundColor Yellow
    $warnings += "$($domainIssues.Count) domains require runtime RPC probe verification"
} else {
    Write-Host " OK" -ForegroundColor Green
}

Write-Host "[4/4] Infrastructure requirements..." -NoNewline
$infraIssues = @()
if ($modeReqs.pgRequired -eq $true -and -not $env:PLATFORM_PG_URL -and -not $env:PLATFORM_PG_HOST) {
    $infraIssues += "PostgreSQL required for $Mode mode (set PLATFORM_PG_URL or PLATFORM_PG_HOST)"
}
if ($modeReqs.oidcRequired -eq $true -and $env:OIDC_ENABLED -ne "true") {
    $infraIssues += "OIDC required for $Mode mode (set OIDC_ENABLED=true)"
}

if ($infraIssues.Count -gt 0) {
    foreach ($issue in $infraIssues) { $failures += $issue }
    Write-Host " $($infraIssues.Count) issues" -ForegroundColor Red
} else {
    Write-Host " OK" -ForegroundColor Green
}

# ---- Apply (if requested) ----
if ($Apply -and $selected) {
    Write-Host ""
    Write-Host "Applying $Target configuration to .env.local..." -ForegroundColor Cyan

    if (Test-Path -LiteralPath $envLocalPath) {
        $content = Get-Content -LiteralPath $envLocalPath -Raw
    } else {
        $content = ""
    }

    # Update or add VISTA_HOST and VISTA_PORT
    $updates = @{
        "VISTA_HOST" = $selected.host
        "VISTA_PORT" = $selected.port.ToString()
        "VISTA_INSTANCE_ID" = $selected.instanceId
    }

    foreach ($key in $updates.Keys) {
        $val = $updates[$key]
        if ($content -match "(?m)^$key=") {
            $content = $content -replace "(?m)^$key=.*$", "$key=$val"
        } else {
            $content = $content.TrimEnd() + "`n$key=$val`n"
        }
    }

    [System.IO.File]::WriteAllText($envLocalPath, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  Updated: VISTA_HOST=$($selected.host), VISTA_PORT=$($selected.port), VISTA_INSTANCE_ID=$($selected.instanceId)" -ForegroundColor Green
}

# ---- Summary ----
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "  Failures: $($failures.Count)" -ForegroundColor $(if ($failures.Count -gt 0) { "Red" } else { "Green" })
Write-Host "  Warnings: $($warnings.Count)" -ForegroundColor $(if ($warnings.Count -gt 0) { "Yellow" } else { "Green" })

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "FAILURES:" -ForegroundColor Red
    foreach ($f in $failures) { Write-Host "  - $f" -ForegroundColor Red }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "WARNINGS:" -ForegroundColor Yellow
    foreach ($w in $warnings) { Write-Host "  - $w" -ForegroundColor Yellow }
}

Write-Host ""
exit $(if ($failures.Count -gt 0) { 1 } else { 0 })
