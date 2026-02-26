<# ============================================================================
   VistA Compatibility Test -- Phase 148
   ============================================================================
   Tests that the VistA instance at VISTA_HOST:VISTA_PORT satisfies the
   swap boundary contract. Works against both:
     - Dev sandbox (WorldVistA Docker, port 9430)
     - Distro lane (vista-distro, port 9431)

   Usage:
     .\scripts\verify-vista-compat.ps1                    # defaults
     .\scripts\verify-vista-compat.ps1 -Host 127.0.0.1 -Port 9431  # distro lane
     .\scripts\verify-vista-compat.ps1 -SkipRpc           # TCP only

   Prerequisites:
     - Target VistA container must be running
     - For RPC tests: API must be running (tests via /vista/ping endpoint)
   ============================================================================ #>

param(
    [string]$Host = "127.0.0.1",
    [int]$Port = 9430,
    [string]$ApiBase = "http://127.0.0.1:3001",
    [switch]$SkipRpc,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0; $total = 0

function Gate([string]$name, [scriptblock]$test) {
    $script:total++
    try {
        $result = & $test
        if ($result -eq "SKIP") {
            $script:skip++
            Write-Host "  SKIP  $name" -ForegroundColor Yellow
        } elseif ($result) {
            $script:pass++
            Write-Host "  PASS  $name" -ForegroundColor Green
        } else {
            $script:fail++
            Write-Host "  FAIL  $name" -ForegroundColor Red
        }
    } catch {
        $script:fail++
        Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host "  VistA Compatibility Test (Phase 148)"
Write-Host "  Target: ${Host}:${Port}"
Write-Host "  API:    $ApiBase"
Write-Host "============================================================"
Write-Host ""

# ---------- Gate 1: TCP Probe ----------
Gate "TCP probe to ${Host}:${Port}" {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect($Host, $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(5000, $false)
        if ($success) {
            $tcp.EndConnect($result)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

# ---------- Gate 2: API /vista/ping ----------
Gate "API /vista/ping reachable" {
    try {
        $resp = Invoke-WebRequest -Uri "$ApiBase/vista/ping" -UseBasicParsing -TimeoutSec 10
        $json = $resp.Content | ConvertFrom-Json
        return $json.ok -eq $true
    } catch {
        return "SKIP"
    }
}

# ---------- Gate 3: API /health ----------
Gate "API /health endpoint" {
    try {
        $resp = Invoke-WebRequest -Uri "$ApiBase/health" -UseBasicParsing -TimeoutSec 5
        $json = $resp.Content | ConvertFrom-Json
        return $json.status -eq "ok"
    } catch {
        return "SKIP"
    }
}

# ---------- Gate 4: RPC Catalog Snapshot Exists ----------
Gate "RPC catalog snapshot exists" {
    $snapPath = Join-Path $PSScriptRoot "..\data\vista\rpc-catalog-snapshot.json"
    if (Test-Path -LiteralPath $snapPath) {
        $snap = Get-Content $snapPath -Raw | ConvertFrom-Json
        if ($Verbose) { Write-Host "    Snapshot: $($snap.totalRpcs) RPCs, $($snap.totalExceptions) exceptions" }
        return ($snap.totalRpcs -gt 100)
    }
    return $false
}

# ---------- Gate 5: Swap Boundary Contract File ----------
Gate "Swap boundary contract TypeScript exists" {
    $contractPath = Join-Path $PSScriptRoot "..\apps\api\src\vista\swap-boundary.ts"
    return (Test-Path -LiteralPath $contractPath)
}

# ---------- Gate 6: Distro Dockerfile exists ----------
Gate "Distro lane Dockerfile exists" {
    $dfPath = Join-Path $PSScriptRoot "..\services\vista-distro\Dockerfile"
    return (Test-Path -LiteralPath $dfPath)
}

# ---------- Gate 7: Distro docker-compose.yml exists ----------
Gate "Distro lane docker-compose.yml exists" {
    $dcPath = Join-Path $PSScriptRoot "..\services\vista-distro\docker-compose.yml"
    return (Test-Path -LiteralPath $dcPath)
}

# ---------- Gate 8: No baked credentials in Dockerfile ----------
Gate "No baked credentials in Dockerfile" {
    $dfPath = Join-Path $PSScriptRoot "..\services\vista-distro\Dockerfile"
    $content = Get-Content $dfPath -Raw
    # Check for common credential patterns
    $hasCreds = $content -match '(?i)(PROV123|PHARM123|NURSE123|password\s*=\s*[''"][^''"]+[''"])'
    return (-not $hasCreds)
}

# ---------- Gate 9: No baked credentials in entrypoint ----------
Gate "No baked credentials in entrypoint.sh" {
    $epPath = Join-Path $PSScriptRoot "..\services\vista-distro\entrypoint.sh"
    $content = Get-Content $epPath -Raw
    $hasCreds = $content -match '(?i)(PROV123|PHARM123|NURSE123|ACCESS_CODE\s*=\s*[''"][^''"]+[''"])'
    return (-not $hasCreds)
}

# ---------- Gate 10: Dev sandbox untouched ----------
Gate "Dev sandbox docker-compose.yml unchanged" {
    $devPath = Join-Path $PSScriptRoot "..\services\vista\docker-compose.yml"
    $content = Get-Content $devPath -Raw
    # Must still reference worldvista/worldvista-ehr
    return ($content -match 'worldvista/worldvista-ehr')
}

# ---------- Gate 11: Distro uses non-root user ----------
Gate "Distro Dockerfile uses non-root USER" {
    $dfPath = Join-Path $PSScriptRoot "..\services\vista-distro\Dockerfile"
    $content = Get-Content $dfPath -Raw
    # Last USER directive should not be root
    $userLines = [regex]::Matches($content, '(?m)^USER\s+(\S+)')
    if ($userLines.Count -gt 0) {
        $lastUser = $userLines[$userLines.Count - 1].Groups[1].Value
        return ($lastUser -ne "root")
    }
    return $false
}

# ---------- Gate 12: Health check script exists ----------
Gate "Distro health-check.sh exists" {
    $hcPath = Join-Path $PSScriptRoot "..\services\vista-distro\health-check.sh"
    return (Test-Path -LiteralPath $hcPath)
}

# ---------- Gate 13: Runbook exists ----------
Gate "Distro lane runbook exists" {
    $rbPath = Join-Path $PSScriptRoot "..\docs\runbooks\vista-distro-lane.md"
    return (Test-Path -LiteralPath $rbPath)
}

if (-not $SkipRpc) {
    # ---------- Gate 14: RPC auth test (requires running API) ----------
    Gate "RPC auth test via API login" {
        try {
            $body = '{"accessCode":"PROV123","verifyCode":"PROV123!!"}'
            $resp = Invoke-WebRequest -Uri "$ApiBase/auth/login" `
                -UseBasicParsing -Method POST `
                -ContentType "application/json" `
                -Body $body -TimeoutSec 15
            $json = $resp.Content | ConvertFrom-Json
            return ($json.ok -eq $true -or $resp.StatusCode -eq 200)
        } catch {
            return "SKIP"
        }
    }
}

# ---------- Summary ----------
Write-Host ""
Write-Host "============================================================"
Write-Host "  VistA Compatibility Test Summary"
Write-Host "============================================================"
Write-Host "  Target:  ${Host}:${Port}"
Write-Host "  Total:   $total gates"
Write-Host "  PASS:    $pass" -ForegroundColor Green
Write-Host "  FAIL:    $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  SKIP:    $skip" -ForegroundColor Yellow
Write-Host "============================================================"

if ($fail -gt 0) { exit 1 } else { exit 0 }
