<#
  Phase 58 -- VistA-First HL7/HLO Interop Monitor v2 Verification
  Gates:
    G58-01  Capability inventory exists
    G58-02  M routine extended (MSGLIST + MSGDETL)
    G58-03  RPCs registered (registry + exceptions)
    G58-04  API v2 endpoints exist (5 routes)
    G58-05  PHI masking defaults ON
    G58-06  Audit trail for unmask
    G58-07  No raw PHI in M routine output
    G58-08  UI message browser tab
    G58-09  No mock/fake data in interop routes
    G58-10  RPC debug data updated
#>
param([switch]$Verbose)

$pass = 0; $fail = 0; $warn = 0

function Gate([string]$id, [string]$desc, [scriptblock]$check) {
  try {
    $result = & $check
    if ($result) {
      Write-Host "  PASS  $id  $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id  $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id  $desc -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 58 Verification: Interop Monitor v2 ===" -ForegroundColor Cyan

# ---------------------------------------------------------------
Gate "G58-01" "Capability inventory exists" {
  $path = "$PSScriptRoot\..\artifacts\interop\capabilities.json"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $json = Get-Content $path -Raw | ConvertFrom-Json
  $hasExisting = $null -ne $json.rpcs.existing
  $hasNew = $null -ne $json.rpcs.phase58_new
  $hasFiles = $null -ne $json.vistaFiles
  $hasMask = $null -ne $json.masking
  if ($Verbose) { Write-Host "    existing=$hasExisting new=$hasNew files=$hasFiles mask=$hasMask" }
  $hasExisting -and $hasNew -and $hasFiles -and $hasMask
}

# ---------------------------------------------------------------
Gate "G58-02" "M routine extended (MSGLIST + MSGDETL)" {
  $path = "$PSScriptRoot\..\services\vista\ZVEMIOP.m"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $content = Get-Content $path -Raw
  $hasMsgList = $content -match 'MSGLIST\(RESULT'
  $hasMsgDetl = $content -match 'MSGDETL\(RESULT'
  $hasV11 = $content -match ';;1\.1;'
  if ($Verbose) { Write-Host "    MSGLIST=$hasMsgList MSGDETL=$hasMsgDetl v1.1=$hasV11" }
  $hasMsgList -and $hasMsgDetl -and $hasV11
}

# ---------------------------------------------------------------
Gate "G58-03" "RPCs registered (registry + exceptions + installer)" {
  $reg = Get-Content "$PSScriptRoot\..\apps\api\src\vista\rpcRegistry.ts" -Raw
  $ins = Get-Content "$PSScriptRoot\..\services\vista\ZVEMINS.m" -Raw
  $hasMsgListReg = $reg -match 'VE INTEROP MSG LIST'
  $hasMsgDetlReg = $reg -match 'VE INTEROP MSG DETAIL'
  $hasMsgListIns = $ins -match 'VE INTEROP MSG LIST'
  $hasMsgDetlIns = $ins -match 'VE INTEROP MSG DETAIL'
  $has6Rpcs = $ins -match 'register all 6 RPCs'
  if ($Verbose) { Write-Host "    regList=$hasMsgListReg regDetl=$hasMsgDetlReg insList=$hasMsgListIns insDetl=$hasMsgDetlIns 6rpcs=$has6Rpcs" }
  $hasMsgListReg -and $hasMsgDetlReg -and $hasMsgListIns -and $hasMsgDetlIns -and $has6Rpcs
}

# ---------------------------------------------------------------
Gate "G58-04" "API v2 endpoints exist (5 routes)" {
  $path = "$PSScriptRoot\..\apps\api\src\routes\vista-interop.ts"
  $content = Get-Content $path -Raw
  $routes = @(
    '/vista/interop/v2/hl7/messages"',
    '/vista/interop/v2/hl7/messages/:id"',
    '/vista/interop/v2/hl7/messages/:id/unmask',
    '/vista/interop/v2/hl7/summary',
    '/vista/interop/v2/hlo/summary'
  )
  $found = 0
  foreach ($r in $routes) {
    if ($content -match [regex]::Escape($r)) { $found++ }
    elseif ($Verbose) { Write-Host "    MISSING: $r" }
  }
  if ($Verbose) { Write-Host "    found $found / $($routes.Count) routes" }
  $found -ge 5
}

# ---------------------------------------------------------------
Gate "G58-05" "PHI masking defaults ON" {
  $content = Get-Content "$PSScriptRoot\..\apps\api\src\routes\vista-interop.ts" -Raw
  $hasPHISet = $content -match 'PHI_SEGMENT_TYPES'
  $hasPID = $content -match '"PID"'
  $hasNK1 = $content -match '"NK1"'
  $hasMaskedTrue = $content -match 'masked:\s*true'
  $hasAdminOnly = $content -match 'requireRole\(session,\s*\["admin"\]'
  if ($Verbose) { Write-Host "    PHISet=$hasPHISet PID=$hasPID NK1=$hasNK1 maskedTrue=$hasMaskedTrue adminOnly=$hasAdminOnly" }
  $hasPHISet -and $hasPID -and $hasNK1 -and $hasMaskedTrue -and $hasAdminOnly
}

# ---------------------------------------------------------------
Gate "G58-06" "Audit trail for unmask" {
  $audit = Get-Content "$PSScriptRoot\..\apps\api\src\lib\audit.ts" -Raw
  $routes = Get-Content "$PSScriptRoot\..\apps\api\src\routes\vista-interop.ts" -Raw
  $hasAction = $audit -match 'interop\.message-unmask'
  $hasAuditCall = $routes -match 'audit\("interop\.message-unmask"'
  if ($Verbose) { Write-Host "    action=$hasAction auditCall=$hasAuditCall" }
  $hasAction -and $hasAuditCall
}

# ---------------------------------------------------------------
Gate "G58-07" "No raw PHI in M routine output" {
  $content = Get-Content "$PSScriptRoot\..\services\vista\ZVEMIOP.m" -Raw
  # MSGDETL should state content is NOT returned
  $hasNoContent = $content -match 'Raw segment CONTENT is NOT returned'
  # MSGLIST should state NO message body
  $hasNoBody = $content -match 'NO message body'
  if ($Verbose) { Write-Host "    noContent=$hasNoContent noBody=$hasNoBody" }
  $hasNoContent -and $hasNoBody
}

# ---------------------------------------------------------------
Gate "G58-08" "UI message browser tab" {
  $path = "$PSScriptRoot\..\apps\web\src\app\cprs\admin\integrations\page.tsx"
  $content = Get-Content $path -Raw
  $hasTab = $content -match 'msgbrowser'
  $hasFilters = $content -match 'msgDirFilter'
  $hasDetailPanel = $content -match 'Message Detail'
  $hasUnmask = $content -match 'Unmask PHI Segments'
  if ($Verbose) { Write-Host "    tab=$hasTab filters=$hasFilters detail=$hasDetailPanel unmask=$hasUnmask" }
  $hasTab -and $hasFilters -and $hasDetailPanel -and $hasUnmask
}

# ---------------------------------------------------------------
Gate "G58-09" "No mock/fake data in interop routes" {
  $content = (Get-Content "$PSScriptRoot\..\apps\api\src\routes\vista-interop.ts" -Raw).ToLower()
  $banned = @('mock', 'fake', 'dummy', 'hardcoded', 'placeholder', 'todo:')
  $found = @()
  foreach ($word in $banned) {
    if ($content -match "\b$word\b") { $found += $word }
  }
  if ($found.Count -gt 0 -and $Verbose) { Write-Host "    banned words found: $($found -join ', ')" }
  $found.Count -eq 0
}

# ---------------------------------------------------------------
Gate "G58-10" "RPC debug data updated" {
  $content = Get-Content "$PSScriptRoot\..\apps\api\src\vista\rpcDebugData.ts" -Raw
  $hasMsgList = $content -match 'interop\.msg-list'
  $hasMsgDetail = $content -match 'interop\.msg-detail'
  if ($Verbose) { Write-Host "    msgList=$hasMsgList msgDetail=$hasMsgDetail" }
  $hasMsgList -and $hasMsgDetail
}

# ---------------------------------------------------------------
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
  exit 1
} else {
  Write-Host "  All gates passed." -ForegroundColor Green
  exit 0
}
