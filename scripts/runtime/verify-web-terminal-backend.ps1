#Requires -Version 5.1
<#
.SYNOPSIS
  Verify backend web terminal path: /terminal/health, /terminal/sessions, and optional WebSocket note.
.DESCRIPTION
  Logs in with session auth, then calls GET /terminal/health and GET /terminal/sessions.
  Does not open a real WebSocket (use browser or a WS client for that).
  For roll-and-scroll path only (SSH bridge). Requires API running and VISTA_SSH_* configured.
.EXAMPLE
  .\scripts\runtime\verify-web-terminal-backend.ps1
  .\scripts\runtime\verify-web-terminal-backend.ps1 -ApiBase "http://127.0.0.1:3001" -AccessCode "PRO1234" -VerifyCode "PRO1234!!"
#>
[CmdletBinding()]
param(
  [string]$ApiBase = "http://127.0.0.1:3001",
  [string]$AccessCode = $env:VISTA_ACCESS_CODE,
  [string]$VerifyCode = $env:VISTA_VERIFY_CODE,
  [switch]$SkipLogin
)

$ErrorActionPreference = "Stop"
$script:PassCount = 0
$script:FailCount = 0

function Test-Gate {
  param([string]$Id, [string]$Desc, [bool]$Ok, [string]$Detail = "")
  if ($Ok) {
    Write-Host "  PASS  $Id -- $Desc" -ForegroundColor Green
    if ($Detail) { Write-Host "        $Detail" -ForegroundColor Gray }
    $script:PassCount++
  } else {
    Write-Host "  FAIL  $Id -- $Desc" -ForegroundColor Red
    if ($Detail) { Write-Host "        $Detail" -ForegroundColor Gray }
    $script:FailCount++
  }
}

Write-Host "`n=== Web terminal backend verification (roll-and-scroll path) ===" -ForegroundColor Cyan
Write-Host "  API: $ApiBase`n"

# Session cookie container
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

if (-not $SkipLogin) {
  if (-not $AccessCode -or -not $VerifyCode) {
    Write-Host "  FAIL  Login skipped: set VISTA_ACCESS_CODE and VISTA_VERIFY_CODE, or pass -AccessCode and -VerifyCode." -ForegroundColor Red
    $script:FailCount++
  } else {
    try {
      $loginBody = @{ accessCode = $AccessCode; verifyCode = $VerifyCode } | ConvertTo-Json -Compress
      $loginResp = Invoke-RestMethod -Uri "$ApiBase/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -WebSession $session -UseBasicParsing
      $role = $loginResp.role
      Test-Gate "G1" "Login (session)" ($null -ne $loginResp) "role=$role"
    } catch {
      Test-Gate "G1" "Login (session)" $false $_.Exception.Message
    }
  }
} else {
  Write-Host "  Skip  Login (SkipLogin)" -ForegroundColor Yellow
}

# GET /terminal/health (admin required)
try {
  $health = Invoke-RestMethod -Uri "$ApiBase/terminal/health" -Method Get -WebSession $session -UseBasicParsing
  $ok = $health.ok -eq $true
  $sshStatus = $health.ssh.status
  Test-Gate "G2" "GET /terminal/health" $ok "ssh.status=$sshStatus"
  if (-not $ok -and $health.ssh.error) {
    Write-Host "        error: $($health.ssh.error)" -ForegroundColor Gray
  }
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  Test-Gate "G2" "GET /terminal/health" $false "HTTP $statusCode / $($_.Exception.Message)"
}

# GET /terminal/sessions
try {
  $sessions = Invoke-RestMethod -Uri "$ApiBase/terminal/sessions" -Method Get -WebSession $session -UseBasicParsing
  $sessionsOk = $sessions.ok -eq $true
  Test-Gate "G3" "GET /terminal/sessions" $sessionsOk "count=$($sessions.count) maxConcurrent=$($sessions.maxConcurrent)"
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  Test-Gate "G3" "GET /terminal/sessions" $false "HTTP $statusCode / $($_.Exception.Message)"
}

Write-Host "`n--- Summary ---"
Write-Host "  PASS: $script:PassCount  FAIL: $script:FailCount" -ForegroundColor $(if ($script:FailCount -eq 0) { "Green" } else { "Yellow" })
Write-Host "  WebSocket /ws/terminal: verify in browser at /cprs/vista-workspace (Terminal mode)." -ForegroundColor Gray
Write-Host ""
if ($script:FailCount -gt 0) { exit 1 }
exit 0
