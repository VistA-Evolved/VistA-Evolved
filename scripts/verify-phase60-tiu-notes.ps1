<#
Phase 60 -- TIU Notes Parity (Create/Edit/Templates/Sign/Cosign/Addenda) Verification
Gates:
  G60-01  TIU plan artifact exists with per-flow RPC sequences
  G60-02  tiu-notes.ts route file exists with 5+ endpoints
  G60-03  Notes list endpoint (TIU DOCUMENTS BY CONTEXT)
  G60-04  Note text endpoint (TIU GET RECORD TEXT)
  G60-05  Sign endpoint with LOCK/SIGN/UNLOCK pattern
  G60-06  Addendum endpoint (TIU CREATE ADDENDUM RECORD)
  G60-07  Titles endpoint (TIU PERSONAL TITLE LIST)
  G60-08  Registry updated with Phase 60 RPCs (6 new entries)
  G60-09  Audit actions (note-sign, note-addendum, note-view-text)
  G60-10  NotesPanel upgraded (text viewer, sign, addendum, refresh, status badges)
  G60-11  No PHI in logs, no fake success, no console.log
  G60-12  No dead clicks (sign/addendum call real API or show pending)
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
    Write-Host "  FAIL  $id  $desc -- $_" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 60 Verification: TIU Notes Parity ===" -ForegroundColor Cyan

$root = "$PSScriptRoot\.."

# ---------------------------------------------------------------
Gate "G60-01" "TIU plan artifact exists with per-flow RPC sequences" {
  $path = "$root\artifacts\phase60\tiu-plan.json"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $json = Get-Content $path -Raw | ConvertFrom-Json
  $flows = $json.flows
  $count = ($flows | Get-Member -MemberType NoteProperty).Count
  if ($Verbose) { Write-Host "    flowCount=$count" }
  $count -ge 5
}

# ---------------------------------------------------------------
Gate "G60-02" "tiu-notes.ts route file exists with 5+ endpoints" {
  $path = "$root\apps\api\src\routes\cprs\tiu-notes.ts"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $content = Get-Content $path -Raw
  $notesList = $content -match '\/vista\/cprs\/notes'
  $notesText = $content -match '\/vista\/cprs\/notes\/text'
  $notesSign = $content -match '\/vista\/cprs\/notes\/sign'
  $notesAddendum = $content -match '\/vista\/cprs\/notes\/addendum'
  $notesTitles = $content -match '\/vista\/cprs\/notes\/titles'
  if ($Verbose) { Write-Host "    list=$notesList text=$notesText sign=$notesSign addendum=$notesAddendum titles=$notesTitles" }
  $notesList -and $notesText -and $notesSign -and $notesAddendum -and $notesTitles
}

# ---------------------------------------------------------------
Gate "G60-03" "Notes list endpoint calls TIU DOCUMENTS BY CONTEXT" {
  $path = "$root\apps\api\src\routes\cprs\tiu-notes.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match 'server\.get.*\/vista\/cprs\/notes'
  $hasRpc = $content -match 'TIU DOCUMENTS BY CONTEXT'
  $hasMerge = $content -match 'signed.*unsigned' -or $content -match 'unsigned.*signed' -or $content -match 'seenIens'
  if ($Verbose) { Write-Host "    route=$hasRoute rpc=$hasRpc merge=$hasMerge" }
  $hasRoute -and $hasRpc -and $hasMerge
}

# ---------------------------------------------------------------
Gate "G60-04" "Note text endpoint calls TIU GET RECORD TEXT" {
  $path = "$root\apps\api\src\routes\cprs\tiu-notes.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/notes\/text'
  $hasRpc = $content -match 'TIU GET RECORD TEXT'
  $hasAudit = $content -match 'clinical\.note-view-text'
  if ($Verbose) { Write-Host "    route=$hasRoute rpc=$hasRpc audit=$hasAudit" }
  $hasRoute -and $hasRpc -and $hasAudit
}

# ---------------------------------------------------------------
Gate "G60-05" "Sign endpoint with LOCK/SIGN/UNLOCK pattern" {
  $path = "$root\apps\api\src\routes\cprs\tiu-notes.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/notes\/sign'
  $hasLock = $content -match 'TIU LOCK RECORD'
  $hasSign = $content -match 'TIU SIGN RECORD'
  $hasUnlock = $content -match 'TIU UNLOCK RECORD'
  $hasAudit = $content -match 'clinical\.note-sign'
  if ($Verbose) { Write-Host "    route=$hasRoute lock=$hasLock sign=$hasSign unlock=$hasUnlock audit=$hasAudit" }
  $hasRoute -and $hasLock -and $hasSign -and $hasUnlock -and $hasAudit
}

# ---------------------------------------------------------------
Gate "G60-06" "Addendum endpoint calls TIU CREATE ADDENDUM RECORD" {
  $path = "$root\apps\api\src\routes\cprs\tiu-notes.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/notes\/addendum'
  $hasRpc = $content -match 'TIU CREATE ADDENDUM RECORD'
  $hasSetText = $content -match 'TIU SET DOCUMENT TEXT'
  $hasAudit = $content -match 'clinical\.note-addendum'
  if ($Verbose) { Write-Host "    route=$hasRoute rpc=$hasRpc setText=$hasSetText audit=$hasAudit" }
  $hasRoute -and $hasRpc -and $hasSetText -and $hasAudit
}

# ---------------------------------------------------------------
Gate "G60-07" "Titles endpoint calls TIU PERSONAL TITLE LIST" {
  $path = "$root\apps\api\src\routes\cprs\tiu-notes.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/notes\/titles'
  $hasRpc = $content -match 'TIU PERSONAL TITLE LIST'
  $hasDefault = $content -match 'GENERAL NOTE'
  if ($Verbose) { Write-Host "    route=$hasRoute rpc=$hasRpc default=$hasDefault" }
  $hasRoute -and $hasRpc -and $hasDefault
}

# ---------------------------------------------------------------
Gate "G60-08" "Registry updated with Phase 60 RPCs (6 new entries)" {
  $path = "$root\apps\api\src\vista\rpcRegistry.ts"
  $content = Get-Content $path -Raw
  $hasSignRecord = $content -match 'TIU SIGN RECORD'
  $hasLockRecord = $content -match 'TIU LOCK RECORD'
  $hasUnlockRecord = $content -match 'TIU UNLOCK RECORD'
  $hasAddendum = $content -match 'TIU CREATE ADDENDUM RECORD'
  $hasCosign = $content -match 'TIU REQUIRES COSIGNATURE'
  $hasTitles = $content -match 'TIU PERSONAL TITLE LIST'
  if ($Verbose) { Write-Host "    sign=$hasSignRecord lock=$hasLockRecord unlock=$hasUnlockRecord addendum=$hasAddendum cosign=$hasCosign titles=$hasTitles" }
  $hasSignRecord -and $hasLockRecord -and $hasUnlockRecord -and $hasAddendum -and $hasCosign -and $hasTitles
}

# ---------------------------------------------------------------
Gate "G60-09" "Audit actions for TIU flows (note-sign, note-addendum, note-view-text)" {
  $path = "$root\apps\api\src\lib\audit.ts"
  $content = Get-Content $path -Raw
  $hasSign = $content -match 'clinical\.note-sign'
  $hasAddendum = $content -match 'clinical\.note-addendum'
  $hasViewText = $content -match 'clinical\.note-view-text'
  if ($Verbose) { Write-Host "    sign=$hasSign addendum=$hasAddendum viewText=$hasViewText" }
  $hasSign -and $hasAddendum -and $hasViewText
}

# ---------------------------------------------------------------
Gate "G60-10" "NotesPanel upgraded (text viewer, sign, addendum, refresh, badges)" {
  $path = "$root\apps\web\src\components\cprs\panels\NotesPanel.tsx"
  $content = Get-Content $path -Raw
  $hasTextFetch = $content -match '\/vista\/cprs\/notes\/text'
  $hasSignBtn = $content -match 'handleSign' -or $content -match 'Apply Signature'
  $hasAddendumBtn = $content -match 'handleAddendum' -or $content -match 'Addendum'
  $hasRefresh = $content -match 'handleRefresh' -or $content -match 'Refresh'
  $hasBadge = $content -match 'statusBadge' -or $content -match 'Unsigned'
  $hasTitles = $content -match '\/vista\/cprs\/notes\/titles'
  if ($Verbose) { Write-Host "    text=$hasTextFetch sign=$hasSignBtn addendum=$hasAddendumBtn refresh=$hasRefresh badge=$hasBadge titles=$hasTitles" }
  $hasTextFetch -and $hasSignBtn -and $hasAddendumBtn -and $hasRefresh -and $hasBadge -and $hasTitles
}

# ---------------------------------------------------------------
Gate "G60-11" "No PHI in logs, no fake success, no console.log" {
  $path = "$root\apps\api\src\routes\cprs\tiu-notes.ts"
  $content = Get-Content $path -Raw
  $noConsoleLog = -not ($content -match 'console\.log')
  $noFakeSuccess = -not ($content -match 'mock|fake|dummy|hardcoded')
  $noPHI = -not ($content -match 'SSN|socialSecurity|dateOfBirth')
  if ($Verbose) { Write-Host "    noConsoleLog=$noConsoleLog noFakeSuccess=$noFakeSuccess noPHI=$noPHI" }
  $noConsoleLog -and $noFakeSuccess -and $noPHI
}

# ---------------------------------------------------------------
Gate "G60-12" "No dead clicks (sign/addendum call real API or show pending)" {
  $path = "$root\apps\web\src\components\cprs\panels\NotesPanel.tsx"
  $content = Get-Content $path -Raw
  # Sign calls the real API endpoint
  $signCallsApi = $content -match '\/vista\/cprs\/notes\/sign'
  # Addendum calls the real API endpoint
  $addendumCallsApi = $content -match '\/vista\/cprs\/notes\/addendum'
  # Note text fetched from real API, not fake
  $textCallsApi = $content -match '\/vista\/cprs\/notes\/text'
  # Note create calls real wave2 endpoint
  $createCallsApi = $content -match '\/vista\/cprs\/notes\/create'
  if ($Verbose) { Write-Host "    sign=$signCallsApi addendum=$addendumCallsApi text=$textCallsApi create=$createCallsApi" }
  $signCallsApi -and $addendumCallsApi -and $textCallsApi -and $createCallsApi
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
