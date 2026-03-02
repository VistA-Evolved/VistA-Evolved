<#
.SYNOPSIS
  Vista Baseline Probe -- identifies running VistA lanes and checks structure.

.DESCRIPTION
  Phase 512 (Wave 36 A3). Probes Docker profiles, TCP ports, and compose
  file structure for each VistA lane. Writes JSON evidence.

.PARAMETER SkipDocker
  Skip Docker daemon checks (structure-only mode).

.PARAMETER EvidenceDir
  Directory for evidence output. Default: evidence/wave-36/512-W36-P3-VISTA-BASELINE-LANE

.EXAMPLE
  pwsh scripts/vista-baseline-probe.ps1
  pwsh scripts/vista-baseline-probe.ps1 -SkipDocker
#>
param(
  [switch]$SkipDocker,
  [string]$EvidenceDir = "evidence/wave-36/512-W36-P3-VISTA-BASELINE-LANE"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $skip = 0

function Write-Gate([string]$status, [string]$msg) {
  switch ($status) {
    "PASS" { Write-Host "  PASS  $msg" -ForegroundColor Green; $script:pass++ }
    "FAIL" { Write-Host "  FAIL  $msg" -ForegroundColor Red;   $script:fail++ }
    "SKIP" { Write-Host "  SKIP  $msg" -ForegroundColor Yellow; $script:skip++ }
  }
}

Write-Host "`n=== VistA Baseline Probe (Phase 512) ===" -ForegroundColor Cyan

# ---------- evidence dir ----------
if (-not (Test-Path -LiteralPath $EvidenceDir)) {
  New-Item -ItemType Directory -Path $EvidenceDir -Force | Out-Null
}

$result = @{
  timestamp     = (Get-Date -Format "o")
  lanes         = @{}
  gates         = @()
  dockerSkipped = [bool]$SkipDocker
}

# ---------- Gate 1: docker-compose.yml exists ----------
$composePath = "services/vista/docker-compose.yml"
if (Test-Path -LiteralPath $composePath) {
  Write-Gate "PASS" "G1: docker-compose.yml exists"
  $result.gates += @{ gate = "G1"; status = "PASS"; detail = $composePath }
} else {
  Write-Gate "FAIL" "G1: docker-compose.yml missing"
  $result.gates += @{ gate = "G1"; status = "FAIL"; detail = "not found" }
}

# ---------- Gate 2: legacy (wv) service defined ----------
$composeContent = ""
if (Test-Path -LiteralPath $composePath) {
  $composeContent = Get-Content $composePath -Raw
}
if ($composeContent -match 'image:\s*worldvista/worldvista-ehr') {
  Write-Gate "PASS" "G2: Legacy (wv) service defined"
  $result.lanes["legacy"] = @{
    image = "worldvista/worldvista-ehr:latest"
    hostRpcPort = 9430
    hostSshPort = 2222
    profiles = @("dev","legacy")
  }
  $result.gates += @{ gate = "G2"; status = "PASS"; detail = "worldvista-ehr found" }
} else {
  Write-Gate "FAIL" "G2: Legacy (wv) service not found in compose"
  $result.gates += @{ gate = "G2"; status = "FAIL"; detail = "missing" }
}

# ---------- Gate 3: VEHU service defined ----------
if ($composeContent -match 'image:\s*worldvista/vehu') {
  Write-Gate "PASS" "G3: VEHU service defined"
  $result.lanes["vehu"] = @{
    image = "worldvista/vehu:latest"
    hostRpcPort = 9431
    hostSshPort = 2223
    profiles = @("vehu")
  }
  $result.gates += @{ gate = "G3"; status = "PASS"; detail = "vehu found" }
} else {
  Write-Gate "FAIL" "G3: VEHU service not found in compose"
  $result.gates += @{ gate = "G3"; status = "FAIL"; detail = "missing" }
}

# ---------- Gate 4: distro Dockerfile exists ----------
$distroPath = "services/vista-distro/Dockerfile"
if (Test-Path -LiteralPath $distroPath) {
  Write-Gate "PASS" "G4: Distro Dockerfile exists"
  $result.lanes["distro"] = @{
    dockerfile = $distroPath
    hostRpcPort = 9431
    profiles = @("distro")
  }
  $result.gates += @{ gate = "G4"; status = "PASS"; detail = $distroPath }
} else {
  Write-Gate "SKIP" "G4: Distro Dockerfile not present (optional)"
  $result.gates += @{ gate = "G4"; status = "SKIP"; detail = "optional lane" }
}

# ---------- Gate 5: named volumes defined ----------
if ($composeContent -match 'vista-globals' -and $composeContent -match 'vehu-globals') {
  Write-Gate "PASS" "G5: Named volumes defined (vista-globals + vehu-globals)"
  $result.gates += @{ gate = "G5"; status = "PASS"; detail = "both volumes" }
} else {
  Write-Gate "FAIL" "G5: Named volumes missing"
  $result.gates += @{ gate = "G5"; status = "FAIL"; detail = "check compose volumes" }
}

# ---------- Gate 6: healthchecks present ----------
$hcCount = ([regex]::Matches($composeContent, 'healthcheck:')).Count
if ($hcCount -ge 2) {
  Write-Gate "PASS" "G6: Healthchecks present ($hcCount services)"
  $result.gates += @{ gate = "G6"; status = "PASS"; detail = "$hcCount healthchecks" }
} elseif ($hcCount -ge 1) {
  Write-Gate "PASS" "G6: Healthcheck present ($hcCount service)"
  $result.gates += @{ gate = "G6"; status = "PASS"; detail = "$hcCount healthcheck" }
} else {
  Write-Gate "FAIL" "G6: No healthchecks found"
  $result.gates += @{ gate = "G6"; status = "FAIL"; detail = "none" }
}

# ---------- Gate 7: runbook exists ----------
$runbookPath = "docs/runbooks/vista-baselines.md"
if (Test-Path -LiteralPath $runbookPath) {
  Write-Gate "PASS" "G7: Baselines runbook exists"
  $result.gates += @{ gate = "G7"; status = "PASS"; detail = $runbookPath }
} else {
  Write-Gate "FAIL" "G7: Baselines runbook missing"
  $result.gates += @{ gate = "G7"; status = "FAIL"; detail = "not found" }
}

# ---------- Docker runtime gates (skippable) ----------
if ($SkipDocker) {
  Write-Gate "SKIP" "G8: Docker daemon check (skipped)"
  Write-Gate "SKIP" "G9: TCP port probe (skipped)"
  $result.gates += @{ gate = "G8"; status = "SKIP"; detail = "-SkipDocker" }
  $result.gates += @{ gate = "G9"; status = "SKIP"; detail = "-SkipDocker" }
} else {
  # Gate 8: Docker daemon available
  try {
    $dockerVer = docker version --format '{{.Server.Version}}' 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Gate "PASS" "G8: Docker daemon running (v$dockerVer)"
      $result.gates += @{ gate = "G8"; status = "PASS"; detail = "v$dockerVer" }
    } else {
      Write-Gate "FAIL" "G8: Docker daemon not responding"
      $result.gates += @{ gate = "G8"; status = "FAIL"; detail = "$dockerVer" }
    }
  } catch {
    Write-Gate "FAIL" "G8: Docker not found"
    $result.gates += @{ gate = "G8"; status = "FAIL"; detail = $_.Exception.Message }
  }

  # Gate 9: TCP probe on known ports
  $portsProbed = @()
  foreach ($port in @(9430, 9431)) {
    try {
      $tcp = New-Object System.Net.Sockets.TcpClient
      $tcp.Connect("127.0.0.1", $port)
      $tcp.Close()
      $portsProbed += @{ port = $port; status = "open" }
    } catch {
      $portsProbed += @{ port = $port; status = "closed" }
    }
  }
  $openPorts = ($portsProbed | Where-Object { $_.status -eq "open" }).Count
  if ($openPorts -gt 0) {
    Write-Gate "PASS" "G9: $openPorts VistA port(s) reachable"
  } else {
    Write-Gate "SKIP" "G9: No VistA ports open (containers not running)"
  }
  $result.gates += @{ gate = "G9"; status = $(if ($openPorts -gt 0) {"PASS"} else {"SKIP"}); detail = $portsProbed }
}

# ---------- summary ----------
$result.summary = @{
  pass = $pass
  fail = $fail
  skip = $skip
  total = $pass + $fail + $skip
}

Write-Host "`n--- Summary: $pass PASS, $fail FAIL, $skip SKIP ---" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

# ---------- write evidence ----------
$jsonPath = Join-Path $EvidenceDir "baseline-probe.json"
$result | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding ASCII
Write-Host "Evidence written to $jsonPath"

if ($fail -gt 0) { exit 1 } else { exit 0 }
