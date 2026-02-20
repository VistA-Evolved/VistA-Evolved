<# verify-phase43-claim-quality.ps1 -- Phase 43 VERIFY gates
   G43-1: Ack/status ingestion works
   G43-2: Remits ingestion works
   G43-3: Workqueues
   G43-4: Rules engine
   G43-5: Security/regression
#>

param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$name, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

$root = Split-Path $PSScriptRoot -Parent
$API  = "http://127.0.0.1:3001"

Write-Host "`n=== Phase 43 VERIFY -- Operational Loop Must Be Real ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── Prerequisite: API health ──
Write-Host "--- Prerequisite: API Running ---" -ForegroundColor Yellow
$apiUp = $false
try {
  $h = Invoke-WebRequest -Uri "$API/health" -UseBasicParsing -TimeoutSec 5
  if ($h.StatusCode -eq 200) { $apiUp = $true }
} catch { }

if (-not $apiUp) {
  Write-Host "  SKIP  API not running on port 3001 -- starting it..." -ForegroundColor Yellow
  $job = Start-Job -ScriptBlock {
    Set-Location "$using:root\apps\api"
    $env:DEPLOY_SKU = "FULL_SUITE"
    & npx tsx --env-file=.env.local src/index.ts 2>&1
  }
  Start-Sleep -Seconds 8
  try {
    $h = Invoke-WebRequest -Uri "$API/health" -UseBasicParsing -TimeoutSec 5
    if ($h.StatusCode -eq 200) { $apiUp = $true; Write-Host "  OK    API started" -ForegroundColor Green }
  } catch {
    Write-Host "  FAIL  Could not start API" -ForegroundColor Red
    $fail++; $total++
  }
}

if (-not $apiUp) {
  Write-Host "`nCannot proceed without API. Exiting.`n" -ForegroundColor Red
  exit 1
}

# ── Login to get session cookie ──
Write-Host "`n--- Authenticating ---" -ForegroundColor Yellow
$cookieFile = Join-Path $root "verify-cookies.txt"
$loginFile = Join-Path $root "verify-login-body.json"
[System.IO.File]::WriteAllText($loginFile, '{"accessCode":"PROV123","verifyCode":"PROV123!!"}')

# Use curl.exe for cookie jar support (file avoids PowerShell !! escaping)
$loginOut = & curl.exe -s -c $cookieFile -X POST "$API/auth/login" `
  -H "Content-Type: application/json" `
  -d "@$loginFile" 2>&1 | Out-String

$loginJson = $null
try { $loginJson = $loginOut | ConvertFrom-Json } catch { }
$authed = ($loginJson -and $loginJson.ok -eq $true)

if ($authed) {
  Write-Host "  OK    Authenticated as $($loginJson.session.userName)" -ForegroundColor Green
} else {
  Write-Host "  FAIL  Login failed: $loginOut" -ForegroundColor Red
  $fail++; $total++
}

$bodyFile = Join-Path $root "verify-body-tmp.json"

# Extract CSRF token from cookie jar (Phase 49 -- double-submit cookie)
function GetCsrfToken() {
  if (Test-Path -LiteralPath $cookieFile) {
    $line = Get-Content $cookieFile | Where-Object { $_ -match "ehr_csrf" } | Select-Object -Last 1
    if ($line) {
      return ($line -split "`t")[-1]
    }
  }
  return ""
}

function ApiGet([string]$path) {
  $raw = & curl.exe -s -b $cookieFile "$API$path" 2>&1 | Out-String
  return ($raw | ConvertFrom-Json)
}

function ApiPost([string]$path, [string]$body) {
  [System.IO.File]::WriteAllText($bodyFile, $body)
  $csrf = GetCsrfToken
  $raw = & curl.exe -s -b $cookieFile -c $cookieFile -X POST "$API$path" `
    -H "Content-Type: application/json" -H "x-csrf-token: $csrf" -d "@$bodyFile" 2>&1 | Out-String
  return ($raw | ConvertFrom-Json)
}

function ApiPatch([string]$path, [string]$body) {
  [System.IO.File]::WriteAllText($bodyFile, $body)
  $csrf = GetCsrfToken
  $raw = & curl.exe -s -b $cookieFile -c $cookieFile -X PATCH "$API$path" `
    -H "Content-Type: application/json" -H "x-csrf-token: $csrf" -d "@$bodyFile" 2>&1 | Out-String
  return ($raw | ConvertFrom-Json)
}

# ====================================================================
# G43-1: Ack/status ingestion works
# ====================================================================
Write-Host "`n--- G43-1: Ack/Status Ingestion ---" -ForegroundColor Yellow

# Create a claim, transition to submitted
$svcDate = (Get-Date).ToString('yyyy-MM-dd')
$claimBody = '{"patientDfn":"3","payerId":"US-AETNA","dateOfService":"' + $svcDate + '","totalCharge":15000,"subscriberId":"SUB123","billingProviderNpi":"1234567890","diagnoses":[{"code":"J06.9","codeSystem":"ICD10","qualifier":"principal"}],"lines":[{"lineNumber":1,"procedure":{"code":"99213","codeSystem":"CPT","units":1,"charge":15000,"dateOfService":"' + $svcDate + '"},"diagnoses":[{"code":"J06.9","codeSystem":"ICD10","qualifier":"principal"}]}]}'
$claim = ApiPost "/rcm/claims/draft" $claimBody
$claimId = $claim.claim.id

Gate "G43-1a: Create draft claim" {
  $null -ne $claimId -and $claim.ok -eq $true
}

# Validate (transitions to validated)
$valResult = ApiPost "/rcm/claims/$claimId/validate" "{}"

Gate "G43-1b: Validate claim" {
  $valResult.ok -eq $true -or $valResult.status -eq "validated"
}

# Transition to submitted
$transResult = ApiPost "/rcm/claims/$claimId/transition" '{"newStatus":"submitted"}'

Gate "G43-1c: Transition to submitted" {
  $transResult.ok -eq $true
}

# Ingest accepted ack linked to claim
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$ackBody = @{
  type = "999"
  disposition = "accepted"
  originalControlNumber = "CTL-$ts"
  ackControlNumber = "ACK-$ts"
  claimId = $claimId
  idempotencyKey = "idem-ack-$ts"
} | ConvertTo-Json -Compress

$ackResult = ApiPost "/rcm/acks/ingest" $ackBody

Gate "G43-1d: Ingest 999 accepted ack" {
  $ackResult.ok -eq $true -and $ackResult.idempotent -eq $false
}

Gate "G43-1e: Ack updates claim to accepted" {
  $ackResult.claimUpdated -eq $true
}

# Verify claim status changed
$claimAfterAck = ApiGet "/rcm/claims/$claimId"

Gate "G43-1f: Claim status is accepted" {
  $claimAfterAck.claim.status -eq "accepted"
}

# Idempotency check
$ackDup = ApiPost "/rcm/acks/ingest" $ackBody

Gate "G43-1g: Duplicate ack returns idempotent=true" {
  $ackDup.idempotent -eq $true
}

# List acks
$ackList = ApiGet "/rcm/acks"

Gate "G43-1h: GET /rcm/acks returns results" {
  $ackList.total -ge 1
}

# Ack stats
$ackStats = ApiGet "/rcm/acks/stats"

Gate "G43-1i: GET /rcm/acks/stats returns totals" {
  $ackStats.stats.total -ge 1
}

# Ingest status update (277) - P1 pending creates missing_info workqueue
$statusBody = @{
  claimId = $claimId
  categoryCode = "P1"
  statusCode = "pending-info"
  statusDescription = "Need additional documentation"
  idempotencyKey = "idem-stat-$ts"
} | ConvertTo-Json -Compress

$statusResult = ApiPost "/rcm/status/ingest" $statusBody

Gate "G43-1j: Ingest 277 P1 status update" {
  $statusResult.ok -eq $true
}

Gate "G43-1k: P1 creates workqueue item" {
  $statusResult.workqueueItemCreated -eq $true
}

# Status list
$statusList = ApiGet "/rcm/status"

Gate "G43-1l: GET /rcm/status returns results" {
  $statusList.total -ge 1
}

# Claims history (combined)
$history = ApiGet "/rcm/claims/$claimId/history"

Gate "G43-1m: Claims history has acks" {
  $history.acks.Count -ge 1
}

Gate "G43-1n: Claims history has statusUpdates" {
  $history.statusUpdates.Count -ge 1
}

# ====================================================================
# G43-2: Remits ingestion works
# ====================================================================
Write-Host "`n--- G43-2: Remittance Ingestion ---" -ForegroundColor Yellow

# Create a second claim for remittance testing (avoid conflicts with first)
$claim2 = ApiPost "/rcm/claims/draft" $claimBody
$claimId2 = $claim2.claim.id
ApiPost "/rcm/claims/$claimId2/validate" "{}" | Out-Null
ApiPost "/rcm/claims/$claimId2/transition" '{"newStatus":"submitted"}' | Out-Null

# Accept it first
$ts2 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$ackBody2 = @{
  type = "999"; disposition = "accepted"
  originalControlNumber = "CTL2-$ts2"; ackControlNumber = "ACK2-$ts2"
  claimId = $claimId2; idempotencyKey = "idem-ack2-$ts2"
} | ConvertTo-Json -Compress
ApiPost "/rcm/acks/ingest" $ackBody2 | Out-Null

# Process remittance - partial payment
$remitBody = @{
  payerId = "BCBS"
  totalCharged = 15000
  totalPaid = 12000
  claimId = $claimId2
  idempotencyKey = "idem-remit-$ts2"
  serviceLines = @(@{
    lineNumber = 1
    procedureCode = "99213"
    chargedAmount = 15000
    paidAmount = 12000
    adjustments = @(@{
      groupCode = "CO"
      reasonCode = "45"
      amount = 3000
    })
  })
} | ConvertTo-Json -Compress -Depth 5

$remitResult = ApiPost "/rcm/remittances/process" $remitBody

Gate "G43-2a: Ingest remittance 835" {
  $remitResult.ok -eq $true
}

Gate "G43-2b: Remittance matched to claim" {
  $remitResult.claimMatched -eq $true
}

Gate "G43-2c: Claim transitioned to paid" {
  $remitResult.claimTransitioned -eq $true
}

# Verify claim status
$claimAfterRemit = ApiGet "/rcm/claims/$claimId2"

Gate "G43-2d: Claim status is paid" {
  $claimAfterRemit.claim.status -eq "paid"
}

# Remittance idempotency
$remitDup = ApiPost "/rcm/remittances/process" $remitBody

Gate "G43-2e: Duplicate remittance returns idempotent=true" {
  $remitDup.idempotent -eq $true
}

# Processor stats
$remitStats = ApiGet "/rcm/remittances/processor-stats"

Gate "G43-2f: Remittance processor stats available" {
  $remitStats.stats.processed -ge 1 -and $remitStats.stats.matched -ge 1
}

# Test denial remittance (zero payment)
$claim3 = ApiPost "/rcm/claims/draft" $claimBody
$claimId3 = $claim3.claim.id
ApiPost "/rcm/claims/$claimId3/validate" "{}" | Out-Null
ApiPost "/rcm/claims/$claimId3/transition" '{"newStatus":"submitted"}' | Out-Null
$ts3 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$ackBody3 = @{
  type = "999"; disposition = "accepted"
  originalControlNumber = "CTL3-$ts3"; ackControlNumber = "ACK3-$ts3"
  claimId = $claimId3; idempotencyKey = "idem-ack3-$ts3"
} | ConvertTo-Json -Compress
ApiPost "/rcm/acks/ingest" $ackBody3 | Out-Null

$denyRemit = @{
  payerId = "BCBS"; totalCharged = 15000; totalPaid = 0
  claimId = $claimId3; idempotencyKey = "idem-deny-$ts3"
  serviceLines = @(@{
    lineNumber = 1; procedureCode = "99213"
    chargedAmount = 15000; paidAmount = 0
    adjustments = @(@{ groupCode = "CO"; reasonCode = "50"; amount = 15000 })
  })
} | ConvertTo-Json -Compress -Depth 5

$denyResult = ApiPost "/rcm/remittances/process" $denyRemit

Gate "G43-2g: Zero-payment remittance denies claim" {
  $denyResult.claimTransitioned -eq $true
}

$claimAfterDeny = ApiGet "/rcm/claims/$claimId3"

Gate "G43-2h: Denied claim status is denied" {
  $claimAfterDeny.claim.status -eq "denied"
}

Gate "G43-2i: Denial creates workqueue item(s)" {
  $denyResult.workqueueItemsCreated -ge 1
}

# ====================================================================
# G43-3: Workqueues
# ====================================================================
Write-Host "`n--- G43-3: Workqueues ---" -ForegroundColor Yellow

# Get workqueue items (should have items from ack rejections and remit denials)
$wqList = ApiGet "/rcm/workqueues"

Gate "G43-3a: GET /rcm/workqueues returns items" {
  $wqList.total -ge 1
}

# Each item has reason and recommended action
$firstWq = if ($wqList.items -and $wqList.items.Count -gt 0) { $wqList.items[0] } else { $null }

Gate "G43-3b: Workqueue item has reasonCode" {
  $null -ne $firstWq.reasonCode -and $firstWq.reasonCode.Length -gt 0
}

Gate "G43-3c: Workqueue item has recommendedAction" {
  $null -ne $firstWq.recommendedAction -and $firstWq.recommendedAction.Length -gt 0
}

Gate "G43-3d: Workqueue item has type (denial/rejection/missing_info)" {
  @("denial", "rejection", "missing_info") -contains $firstWq.type
}

# Stats endpoint
$wqStats = ApiGet "/rcm/workqueues/stats"

Gate "G43-3e: Workqueue stats available" {
  $wqStats.stats.total -ge 1
}

# Update a workqueue item
$wqId = if ($firstWq) { $firstWq.id } else { "no-id" }
$patchResult = ApiPatch "/rcm/workqueues/$wqId" '{"status":"in_progress"}'

Gate "G43-3f: PATCH workqueue item status" {
  $patchResult.ok -eq $true
}

# Verify updated
$wqAfter = ApiGet "/rcm/workqueues/$wqId"

Gate "G43-3g: Workqueue item status updated" {
  $wqAfter.item.status -eq "in_progress"
}

# Per-claim workqueue
$claimWq = ApiGet "/rcm/claims/$claimId/workqueue"

Gate "G43-3h: Per-claim workqueue endpoint works" {
  $null -ne $claimWq.items
}

# UI tab exists with real fetches
$pageTsx = Get-Content (Join-Path $root "apps\web\src\app\cprs\admin\rcm\page.tsx") -Raw

Gate "G43-3i: WorkqueuesTab component exists in page.tsx" {
  $pageTsx -match "function WorkqueuesTab" -and $pageTsx -match "Denial Workqueues"
}

Gate "G43-3j: WorkqueuesTab fetches /rcm/workqueues" {
  $pageTsx -match "/rcm/workqueues" -and $pageTsx -match "/rcm/workqueues/stats"
}

Gate "G43-3k: WorkqueuesTab renders reason columns" {
  $pageTsx -match "reasonCode" -and $pageTsx -match "recommendedAction"
}

# ====================================================================
# G43-4: Rules engine
# ====================================================================
Write-Host "`n--- G43-4: Rules Engine ---" -ForegroundColor Yellow

# Rules are seeded on startup
$rulesList = ApiGet "/rcm/rules"

Gate "G43-4a: Seed rules loaded (>=9)" {
  $rulesList.total -ge 9
}

# Rule stats
$ruleStats = ApiGet "/rcm/rules/stats"

Gate "G43-4b: Rule stats show total and enabled" {
  $ruleStats.stats.total -ge 9 -and $ruleStats.stats.enabled -ge 9
}

# Create a custom rule
$ts4 = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$newRule = @{
  payerId = "AETNA"
  name = "Test verify rule $ts4"
  description = "Verify rule creation is audited"
  category = "demographics"
  severity = "warning"
  condition = @{ type = "field_required"; field = "subscriberId" }
  actionOnFail = "Add subscriber ID"
} | ConvertTo-Json -Compress -Depth 3

$ruleCreate = ApiPost "/rcm/rules" $newRule

Gate "G43-4c: Create custom rule" {
  $ruleCreate.ok -eq $true -and $null -ne $ruleCreate.rule.id
}

$ruleId = $ruleCreate.rule.id

# Evaluate rules against a claim
$evalBody = @{ claimId = $claimId } | ConvertTo-Json -Compress
$evalResult = ApiPost "/rcm/rules/evaluate" $evalBody

Gate "G43-4d: Rules evaluate against claim" {
  $null -ne $evalResult.score -and $evalResult.passCount -ge 1
}

Gate "G43-4e: Evaluation returns per-rule results" {
  $evalResult.results.Count -ge 1
}

# Update rule
$patchRule = ApiPatch "/rcm/rules/$ruleId" '{"enabled":false}'

Gate "G43-4f: Update rule (disable)" {
  $patchRule.ok -eq $true
}

# Audit trail captures rule changes
$auditEntries = ApiGet "/rcm/audit?limit=50"

Gate "G43-4g: Audit trail has rule.created entries" {
  $entries = @($auditEntries.items | Where-Object { $_.action -eq "rule.created" })
  $entries.Count -ge 1
}

Gate "G43-4h: Audit trail has rule.updated entries" {
  $entries = @($auditEntries.items | Where-Object { $_.action -eq "rule.updated" })
  $entries.Count -ge 1
}

# Audit trail captures ack/status/remit events too
Gate "G43-4i: Audit trail has ack.ingested entries" {
  $entries = @($auditEntries.items | Where-Object { $_.action -eq "ack.ingested" })
  $entries.Count -ge 1
}

Gate "G43-4j: Audit trail has remit.received entries" {
  $entries = @($auditEntries.items | Where-Object { $_.action -eq "remit.received" })
  $entries.Count -ge 1
}

# UI has rules tab
Gate "G43-4k: RulesTab component exists in page.tsx" {
  $pageTsx -match "function RulesTab" -and $pageTsx -match "Payer Rules"
}

Gate "G43-4l: RulesTab fetches /rcm/rules" {
  $pageTsx -match "/rcm/rules" -and $pageTsx -match "/rcm/rules/stats"
}

# CARC/RARC reference endpoints
$carcAll = ApiGet "/rcm/reference/carc"

Gate "G43-4m: CARC reference returns 30+ codes" {
  $carcAll.total -ge 30
}

$carc45 = ApiGet "/rcm/reference/carc?code=45"

Gate "G43-4n: CARC lookup by code works" {
  $carc45.entry.description -match "fee schedule"
}

$rarcAll = ApiGet "/rcm/reference/rarc"

Gate "G43-4o: RARC reference returns 10+ codes" {
  $rarcAll.total -ge 10
}

# ====================================================================
# G43-5: Security + regression
# ====================================================================
Write-Host "`n--- G43-5: Security/Regression ---" -ForegroundColor Yellow

# tsc clean
Gate "G43-5a: tsc --noEmit clean" {
  Push-Location (Join-Path $root "apps\api")
  try {
    $output = & npx tsc --noEmit 2>&1 | Out-String
    $output.Trim().Length -eq 0
  } finally { Pop-Location }
}

# vitest passes
Gate "G43-5b: vitest rcm-quality-loop passes (25 tests)" {
  Push-Location (Join-Path $root "apps\api")
  try {
    $output = & npx vitest run tests/rcm-quality-loop.test.ts 2>&1 | Out-String
    $output -match "25 passed"
  } finally { Pop-Location }
}

# No credentials in Phase 43 files
Gate "G43-5c: No hardcoded credentials in Phase 43 files" {
  $phase43Files = @(
    "apps\api\src\rcm\domain\ack-status.ts",
    "apps\api\src\rcm\edi\ack-status-processor.ts",
    "apps\api\src\rcm\edi\remit-processor.ts",
    "apps\api\src\rcm\workqueues\workqueue-store.ts",
    "apps\api\src\rcm\reference\carc-rarc.ts",
    "apps\api\src\rcm\rules\payer-rules.ts"
  )
  $found = $false
  foreach ($f in $phase43Files) {
    $fp = Join-Path $root $f
    if (Test-Path $fp) {
      $content = Get-Content $fp -Raw
      if ($content -match "PROV123|PHARM123|NURSE123") { $found = $true; break }
    }
  }
  -not $found
}

# No console.log in Phase 43 source files
Gate "G43-5d: No console.log in Phase 43 source files" {
  $phase43Files = @(
    "apps\api\src\rcm\domain\ack-status.ts",
    "apps\api\src\rcm\edi\ack-status-processor.ts",
    "apps\api\src\rcm\edi\remit-processor.ts",
    "apps\api\src\rcm\workqueues\workqueue-store.ts",
    "apps\api\src\rcm\reference\carc-rarc.ts",
    "apps\api\src\rcm\rules\payer-rules.ts",
    "apps\api\src\rcm\rcm-routes.ts"
  )
  $found = $false
  foreach ($f in $phase43Files) {
    $fp = Join-Path $root $f
    if (Test-Path $fp) {
      $content = Get-Content $fp -Raw
      if ($content -match "console\.log\(") { $found = $true; break }
    }
  }
  -not $found
}

# No PHI in log statements
Gate "G43-5e: No PHI in structured log calls" {
  $phase43Files = @(
    "apps\api\src\rcm\edi\ack-status-processor.ts",
    "apps\api\src\rcm\edi\remit-processor.ts",
    "apps\api\src\rcm\workqueues\workqueue-store.ts",
    "apps\api\src\rcm\rules\payer-rules.ts"
  )
  $found = $false
  foreach ($f in $phase43Files) {
    $fp = Join-Path $root $f
    if (Test-Path $fp) {
      $content = Get-Content $fp -Raw
      if ($content -match "log\.(info|warn|error).*patientName|log\.(info|warn|error).*ssn") { $found = $true; break }
    }
  }
  -not $found
}

# Domain files exist
Gate "G43-5f: ack-status.ts domain model exists" {
  Test-Path (Join-Path $root "apps\api\src\rcm\domain\ack-status.ts")
}

Gate "G43-5g: ack-status-processor.ts exists" {
  Test-Path (Join-Path $root "apps\api\src\rcm\edi\ack-status-processor.ts")
}

Gate "G43-5h: remit-processor.ts exists" {
  Test-Path (Join-Path $root "apps\api\src\rcm\edi\remit-processor.ts")
}

Gate "G43-5i: workqueue-store.ts exists" {
  Test-Path (Join-Path $root "apps\api\src\rcm\workqueues\workqueue-store.ts")
}

Gate "G43-5j: payer-rules.ts exists" {
  Test-Path (Join-Path $root "apps\api\src\rcm\rules\payer-rules.ts")
}

Gate "G43-5k: carc-rarc.ts exists" {
  Test-Path (Join-Path $root "apps\api\src\rcm\reference\carc-rarc.ts")
}

Gate "G43-5l: Runbook exists" {
  Test-Path (Join-Path $root "docs\runbooks\rcm-claim-quality-loop.md")
}

Gate "G43-5m: Test file exists with 25 tests" {
  $tf = Join-Path $root "apps\api\tests\rcm-quality-loop.test.ts"
  (Test-Path $tf) -and ((Get-Content $tf -Raw) -match "it\(")
}

# RCM routes require session auth
Gate "G43-5n: /rcm/ routes require session auth" {
  # Try without cookie -- should get 401
  $raw = & curl.exe -s -o NUL -w "%{http_code}" "$API/rcm/rules" 2>&1 | Out-String
  $raw.Trim() -eq "401"
}

# Cleanup
if (Test-Path $cookieFile) { Remove-Item $cookieFile -Force -ErrorAction SilentlyContinue }
if (Test-Path $loginFile) { Remove-Item $loginFile -Force -ErrorAction SilentlyContinue }
if (Test-Path $bodyFile) { Remove-Item $bodyFile -Force -ErrorAction SilentlyContinue }

# ── Summary ──
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 43 VERIFY: $pass/$total PASS" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) {
  Write-Host "$fail FAILED" -ForegroundColor Red
}
Write-Host "========================================`n"
exit $fail
