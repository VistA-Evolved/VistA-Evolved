<#
Phase 59 -- CPOE Parity (Orders + Order Checks + Signing) Verification
Gates:
  G59-01  Inventory artifact exists
  G59-02  Order plan artifact exists
  G59-03  Order list endpoint (ORWORR AGET)
  G59-04  Lab order endpoint
  G59-05  Imaging order endpoint
  G59-06  Order checks endpoint
  G59-07  Signing endpoint
  G59-08  Registry updated (ORWORR AGET, ORWDXC ACCEPT, ORWOR1 SIG)
  G59-09  Audit actions (order-lab, order-imaging, order-check)
  G59-10  OrdersPanel upgraded (real API, order checks, sign button)
  G59-11  No PHI in logs, no fake success
  G59-12  Dead-click audit (no silent no-ops)
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

Write-Host "`n=== Phase 59 Verification: CPOE Parity (Orders + Order Checks + Signing) ===" -ForegroundColor Cyan

$root = "$PSScriptRoot\.."

# ---------------------------------------------------------------
Gate "G59-01" "Inventory artifact exists" {
  $path = "$root\artifacts\phase59\inventory.json"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $json = Get-Content $path -Raw | ConvertFrom-Json
  $hasUI = $null -ne $json.ui
  $hasApi = $null -ne $json.api
  $hasRegistry = ($null -ne $json.rpcRegistry) -or ($null -ne $json.registry)
  if ($Verbose) { Write-Host "    ui=$hasUI api=$hasApi registry=$hasRegistry" }
  $hasUI -and $hasApi -and $hasRegistry
}

# ---------------------------------------------------------------
Gate "G59-02" "Order plan artifact exists" {
  $path = "$root\artifacts\phase59\order-plan.json"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $json = Get-Content $path -Raw | ConvertFrom-Json
  $flows = $json.flows
  $count = ($flows | Get-Member -MemberType NoteProperty).Count
  if ($Verbose) { Write-Host "    flowCount=$count" }
  $count -ge 5
}

# ---------------------------------------------------------------
Gate "G59-03" "Order list endpoint calls ORWORR AGET" {
  $path = "$root\apps\api\src\routes\cprs\orders-cpoe.ts"
  if (-not (Test-Path -LiteralPath $path)) { return $false }
  $content = Get-Content $path -Raw
  $hasRoute = $content -match 'GET.*\/vista\/cprs\/orders' -or $content -match 'server\.get.*\/vista\/cprs\/orders'
  $hasRpc = $content -match 'ORWORR AGET'
  if ($Verbose) { Write-Host "    hasRoute=$hasRoute hasRpc=$hasRpc" }
  $hasRoute -and $hasRpc
}

# ---------------------------------------------------------------
Gate "G59-04" "Lab order endpoint with LOCK/UNLOCK" {
  $path = "$root\apps\api\src\routes\cprs\orders-cpoe.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/orders\/lab'
  $hasLock = $content -match 'ORWDX LOCK'
  $hasUnlock = $content -match 'ORWDX UNLOCK'
  $hasAudit = $content -match 'clinical\.order-lab'
  if ($Verbose) { Write-Host "    route=$hasRoute lock=$hasLock unlock=$hasUnlock audit=$hasAudit" }
  $hasRoute -and $hasLock -and $hasUnlock -and $hasAudit
}

# ---------------------------------------------------------------
Gate "G59-05" "Imaging order endpoint" {
  $path = "$root\apps\api\src\routes\cprs\orders-cpoe.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/orders\/imaging'
  $hasAudit = $content -match 'clinical\.order-imaging'
  $hasPending = $content -match 'integration.pending' -or $content -match 'integrationPending'
  if ($Verbose) { Write-Host "    route=$hasRoute audit=$hasAudit pending=$hasPending" }
  $hasRoute -and $hasAudit -and $hasPending
}

# ---------------------------------------------------------------
Gate "G59-06" "Order checks endpoint (ORWDXC)" {
  $path = "$root\apps\api\src\routes\cprs\orders-cpoe.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/order-checks'
  $hasRpc = $content -match 'ORWDXC'
  $hasAudit = $content -match 'clinical\.order-check'
  if ($Verbose) { Write-Host "    route=$hasRoute rpc=$hasRpc audit=$hasAudit" }
  $hasRoute -and $hasRpc -and $hasAudit
}

# ---------------------------------------------------------------
Gate "G59-07" "Signing endpoint (ORWOR1 SIG)" {
  $path = "$root\apps\api\src\routes\cprs\orders-cpoe.ts"
  $content = Get-Content $path -Raw
  $hasRoute = $content -match '\/vista\/cprs\/orders\/sign'
  $hasRpc = $content -match 'ORWOR1 SIG'
  $hasAudit = $content -match 'clinical\.order-sign'
  if ($Verbose) { Write-Host "    route=$hasRoute rpc=$hasRpc audit=$hasAudit" }
  $hasRoute -and $hasRpc -and $hasAudit
}

# ---------------------------------------------------------------
Gate "G59-08" "Registry updated with new CPOE RPCs" {
  $path = "$root\apps\api\src\vista\rpcRegistry.ts"
  $content = Get-Content $path -Raw
  $hasAGET = $content -match 'ORWORR AGET'
  $hasACCEPT = $content -match 'ORWDXC ACCEPT'
  $hasSIG = $content -match 'ORWOR1 SIG'
  $hasDISPLAY = $content -match 'ORWDXC DISPLAY'
  if ($Verbose) { Write-Host "    AGET=$hasAGET ACCEPT=$hasACCEPT SIG=$hasSIG DISPLAY=$hasDISPLAY" }
  $hasAGET -and $hasACCEPT -and $hasSIG -and $hasDISPLAY
}

# ---------------------------------------------------------------
Gate "G59-09" "Audit actions for CPOE flows" {
  $path = "$root\apps\api\src\lib\audit.ts"
  $content = Get-Content $path -Raw
  $hasLab = $content -match 'clinical\.order-lab'
  $hasImaging = $content -match 'clinical\.order-imaging'
  $hasConsult = $content -match 'clinical\.order-consult'
  $hasCheck = $content -match 'clinical\.order-check'
  $hasOrdersView = $content -match 'phi\.orders-view'
  if ($Verbose) { Write-Host "    lab=$hasLab imaging=$hasImaging consult=$hasConsult check=$hasCheck ordersView=$hasOrdersView" }
  $hasLab -and $hasImaging -and $hasConsult -and $hasCheck -and $hasOrdersView
}

# ---------------------------------------------------------------
Gate "G59-10" "OrdersPanel upgraded with real API calls" {
  $path = "$root\apps\web\src\components\cprs\panels\OrdersPanel.tsx"
  $content = Get-Content $path -Raw
  $hasOrdersFetch = $content -match '\/vista\/cprs\/orders'
  # Lab/imaging via dynamic URL: /vista/cprs/orders/${type} where type=lab|imaging
  $hasTypedPost = $content -match 'orders\/\$\{type\}' -or $content -match '\/vista\/cprs\/orders\/lab'
  $hasSignPost = $content -match '\/vista\/cprs\/orders\/sign'
  $hasOrderChecks = $content -match '\/vista\/cprs\/order-checks'
  $hasIntPending = $content -match 'integration.pending' -or $content -match 'integrationPending'
  if ($Verbose) { Write-Host "    fetch=$hasOrdersFetch typed=$hasTypedPost sign=$hasSignPost checks=$hasOrderChecks pending=$hasIntPending" }
  $hasOrdersFetch -and $hasTypedPost -and $hasSignPost -and $hasOrderChecks -and $hasIntPending
}

# ---------------------------------------------------------------
Gate "G59-11" "No PHI in logs, no fake success, no console.log" {
  $path = "$root\apps\api\src\routes\cprs\orders-cpoe.ts"
  $content = Get-Content $path -Raw
  $noConsoleLog = -not ($content -match 'console\.log')
  $noFakeSuccess = -not ($content -match 'mock|fake|dummy|hardcoded')
  $noPHI = -not ($content -match 'SSN|socialSecurity|dateOfBirth')
  if ($Verbose) { Write-Host "    noConsoleLog=$noConsoleLog noFakeSuccess=$noFakeSuccess noPHI=$noPHI" }
  $noConsoleLog -and $noFakeSuccess -and $noPHI
}

# ---------------------------------------------------------------
Gate "G59-12" "No dead clicks in OrdersPanel" {
  $path = "$root\apps\web\src\components\cprs\panels\OrdersPanel.tsx"
  $content = Get-Content $path -Raw
  # Every order type button calls a real API endpoint or shows integration-pending
  $noSaveAsDraftOnly = -not ($content -match 'Save as Draft')
  # Sign button calls real API (not just cache.updateOrderStatus for signing)
  $signCallsApi = $content -match 'handleSignOrder'
  # Order checks button exists
  $orderChecksBtn = $content -match 'Run Order Checks' -or $content -match 'handleOrderChecks'
  if ($Verbose) { Write-Host "    noDraftOnly=$noSaveAsDraftOnly signApi=$signCallsApi checksBtn=$orderChecksBtn" }
  $noSaveAsDraftOnly -and $signCallsApi -and $orderChecksBtn
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
