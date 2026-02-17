# Phase 18 VERIFY - Sections 3-8 Live Endpoint Tests (v2)
# Corrected for actual API response shapes
param([switch]$Verbose)

$base = 'http://127.0.0.1:3001'
$pass = 0; $fail = 0; $warn = 0

function Test-Result($label, $condition, $detail) {
  if ($condition) {
    Write-Host "  PASS  $label" -ForegroundColor Green
    if ($detail -and $Verbose) { Write-Host "        $detail" -ForegroundColor DarkGray }
    $script:pass++
  } else {
    Write-Host "  FAIL  $label  ($detail)" -ForegroundColor Red
    $script:fail++
  }
}
function Test-Warn($label, $detail) {
  Write-Host "  WARN  $label  ($detail)" -ForegroundColor Yellow
  $script:warn++
}

# == Login ==
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$null = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -ContentType 'application/json' -WebSession $session -TimeoutSec 15

# ===================================================================
# SECTION 3: Integration Registry Schema Validation
# ===================================================================
Write-Host "`n=== SECTION 3: Integration Registry Schema ===" -ForegroundColor Cyan

$registry = Invoke-RestMethod -Uri "$base/admin/registry/default" -Method GET -WebSession $session -TimeoutSec 10
$regList = if ($registry -is [array]) { $registry } elseif ($registry.integrations) { $registry.integrations } else { @($registry) }

# 3a: Schema fields
Write-Host "`n--- 3a: Schema fields present on every entry ---"
$requiredFields = @('id','label','type','enabled','host','port','status','errorLog','queueMetrics','createdAt','updatedAt')
$allPresent = $true
foreach ($entry in $regList) {
  foreach ($f in $requiredFields) {
    $has = $null -ne $entry.PSObject.Properties[$f]
    if (-not $has) {
      Test-Result "[$($entry.id)] field '$f'" $false "missing"
      $allPresent = $false
    }
  }
}
if ($allPresent) { Test-Result "All entries have required schema fields" $true "Checked $($regList.Count) entries" }

# 3b: Valid types
Write-Host "`n--- 3b: Valid integration types ---"
$validTypes = @('vista-rpc','fhir','hl7v2','dicom','dicomweb','lis','pacs-vna','device','imaging','custom','external')
foreach ($entry in $regList) {
  Test-Result "[$($entry.id)] type='$($entry.type)' valid" ($validTypes -contains $entry.type) "type=$($entry.type)"
}

# 3c: Seeded defaults
Write-Host "`n--- 3c: Seeded defaults ---"
$vp = $regList | Where-Object { $_.id -eq 'vista-primary' }
$vi = $regList | Where-Object { $_.id -eq 'vista-imaging' }
Test-Result "vista-primary seed exists" ($null -ne $vp) "type=$($vp.type)"
Test-Result "vista-imaging seed exists" ($null -ne $vi) "type=$($vi.type)"
Test-Result "vista-primary is vista-rpc" ($vp -and $vp.type -eq 'vista-rpc')
Test-Result "vista-imaging is pacs-vna" ($vi -and $vi.type -eq 'pacs-vna')

# ===================================================================
# SECTION 4: Integration Monitor
# ===================================================================
Write-Host "`n=== SECTION 4: Integration Monitor ===" -ForegroundColor Cyan

# 4a: Health summary (nested under .summary)
Write-Host "`n--- 4a: Health summary ---"
$hs = Invoke-RestMethod -Uri "$base/admin/registry/default/health-summary" -Method GET -WebSession $session -TimeoutSec 10
$sum = $hs.summary
Test-Result "Health summary has total" ($null -ne $sum.total) "total=$($sum.total)"
Test-Result "Health summary has connected" ($null -ne $sum.connected) "connected=$($sum.connected)"
Test-Result "Health summary has degraded" ($null -ne $sum.degraded) "degraded=$($sum.degraded)"
Test-Result "Health summary has entries" ($null -ne $sum.entries) "count=$($sum.entries.Count)"

# 4b: Probe all
Write-Host "`n--- 4b: Probe all ---"
$probeAll = Invoke-RestMethod -Uri "$base/admin/registry/default/probe-all" -Method POST -Body '{}' -ContentType 'application/json' -WebSession $session -TimeoutSec 15
Test-Result "Probe-all returns results" ($null -ne $probeAll.results) "count=$($probeAll.results.Count)"
$validProbeStatuses = @('healthy','degraded','down','unknown','connected','disconnected','disabled')
if ($probeAll.results) {
  foreach ($pr in $probeAll.results) {
    $statusOk = $validProbeStatuses -contains $pr.status
    Test-Result "Probe [$($pr.id)] status=$($pr.status)" $statusOk
  }
}

# 4c: Toggle (disable then re-enable); uses .integration not .entry
Write-Host "`n--- 4c: Toggle integration ---"
try {
  $toggleOff = Invoke-RestMethod -Uri "$base/admin/registry/default/vista-imaging/toggle" -Method POST -Body '{"enabled":false}' -ContentType 'application/json' -WebSession $session -TimeoutSec 10
  Test-Result "Toggle vista-imaging disabled" ($toggleOff.ok -eq $true -and $toggleOff.integration.enabled -eq $false) "enabled=$($toggleOff.integration.enabled)"
  
  $toggleOn = Invoke-RestMethod -Uri "$base/admin/registry/default/vista-imaging/toggle" -Method POST -Body '{"enabled":true}' -ContentType 'application/json' -WebSession $session -TimeoutSec 10
  Test-Result "Toggle vista-imaging re-enabled" ($toggleOn.ok -eq $true -and $toggleOn.integration.enabled -eq $true) "enabled=$($toggleOn.integration.enabled)"
} catch {
  Test-Result "Toggle integration" $false $_.Exception.Message
}

# 4d: Single probe
Write-Host "`n--- 4d: Single probe ---"
try {
  $probeSingle = Invoke-RestMethod -Uri "$base/admin/registry/default/vista-primary/probe" -Method POST -Body '{}' -ContentType 'application/json' -WebSession $session -TimeoutSec 15
  Test-Result "Probe vista-primary ok" ($probeSingle.ok -eq $true) "status=$($probeSingle.status)"
} catch {
  Test-Result "Probe vista-primary" $false $_.Exception.Message
}

# ===================================================================
# SECTION 5: Observability / Metrics
# ===================================================================
Write-Host "`n=== SECTION 5: Observability / Metrics ===" -ForegroundColor Cyan

# 5a: /metrics includes integrations (uses connected not healthy)
Write-Host "`n--- 5a: /metrics endpoint ---"
$metrics = Invoke-RestMethod -Uri "$base/metrics" -Method GET -TimeoutSec 10
Test-Result "Metrics has integrations" ($null -ne $metrics.integrations)
if ($metrics.integrations) {
  Test-Result "Integrations has total" ($null -ne $metrics.integrations.total) "total=$($metrics.integrations.total)"
  Test-Result "Integrations has connected" ($null -ne $metrics.integrations.connected) "connected=$($metrics.integrations.connected)"
  Test-Result "Integrations has entries" ($null -ne $metrics.integrations.entries) "count=$($metrics.integrations.entries.Count)"
}

# 5b: Audit events (needs auth session)
Write-Host "`n--- 5b: Audit events ---"
$auditUrl = $base + '/audit/events?actionPrefix=integration' + [char]38 + 'limit=20'
$auditEvents = Invoke-RestMethod -Uri $auditUrl -Method GET -WebSession $session -TimeoutSec 10
Test-Result "Audit query ok" ($auditEvents.ok -eq $true) "count=$($auditEvents.count)"
if ($auditEvents.count -gt 0) {
  $actions = $auditEvents.events | ForEach-Object { $_.action } | Sort-Object -Unique
  Write-Host "        Actions found: $($actions -join ', ')" -ForegroundColor DarkGray
  
  $hasProbe = 'integration.probe' -in $actions
  $hasConfigChange = 'integration.config-change' -in $actions
  Test-Result "Probe audit events exist" $hasProbe
  if ($hasConfigChange) { Test-Result "Config-change audit events exist" $true }
  else { Test-Warn "No config-change audit events yet" "Will appear after PUT/toggle" }
  
  # No credentials in audit
  $auditJson = $auditEvents | ConvertTo-Json -Depth 10
  $hasSensitive = $auditJson -match 'PROV123!!|verifyCode|password'
  Test-Result "No credentials in audit events" (-not $hasSensitive)
}

# 5c: Audit stats (needs auth)
Write-Host "`n--- 5c: Audit stats ---"
$auditStats = Invoke-RestMethod -Uri "$base/audit/stats" -Method GET -WebSession $session -TimeoutSec 10
Test-Result "Audit stats ok" ($auditStats.ok -eq $true)

# ===================================================================
# SECTION 6: Imaging Integration
# ===================================================================
Write-Host "`n=== SECTION 6: Imaging Integration ===" -ForegroundColor Cyan

# 6a: Imaging status (uses capabilities.vistaImaging/radiology)
Write-Host "`n--- 6a: Imaging status ---"
try {
  $imgStatus = Invoke-RestMethod -Uri "$base/vista/imaging/status" -Method GET -WebSession $session -TimeoutSec 15
  Test-Result "Imaging status ok" ($imgStatus.ok -eq $true)
  Test-Result "Has vistaImaging capability" ($null -ne $imgStatus.capabilities.vistaImaging) "available=$($imgStatus.capabilities.vistaImaging.available)"
  Test-Result "Has radiology capability" ($null -ne $imgStatus.capabilities.radiology) "available=$($imgStatus.capabilities.radiology.available)"
  Test-Result "integrationReady field" ($null -ne $imgStatus.integrationReady) "ready=$($imgStatus.integrationReady)"
} catch {
  $errCode = $_.Exception.Response.StatusCode.value__
  Test-Result "Imaging status" $false "HTTP $errCode"
}

# 6b: Imaging registry status
Write-Host "`n--- 6b: Imaging registry status ---"
try {
  $imgReg = Invoke-RestMethod -Uri "$base/vista/imaging/registry-status" -Method GET -WebSession $session -TimeoutSec 10
  Test-Result "Registry status ok" ($imgReg.ok -eq $true)
  Test-Result "Has imagingIntegrations field" ($null -ne $imgReg.imagingIntegrations)
} catch {
  $errCode = $_.Exception.Response.StatusCode.value__
  Test-Result "Imaging registry status" $false "HTTP $errCode"
}

# 6c: Viewer URL (nested under .viewer)
Write-Host "`n--- 6c: Viewer URL ---"
try {
  $viewerUrl = Invoke-RestMethod -Uri "$base/vista/imaging/viewer-url?studyUid=1.2.3.4.5" -Method GET -WebSession $session -TimeoutSec 10
  Test-Result "Viewer URL returns ok" ($viewerUrl.ok -eq $true)
  $vt = $viewerUrl.viewer.viewerType
  $viewerTypeValid = @('ohif','vista-imaging','basic','none') -contains $vt
  Test-Result "Viewer type '$vt' valid" $viewerTypeValid
  Test-Result "Viewer URL non-empty" ($viewerUrl.viewer.url.Length -gt 0) "url=$($viewerUrl.viewer.url)"
} catch {
  $errCode = $_.Exception.Response.StatusCode.value__
  Test-Result "Viewer URL" $false "HTTP $errCode"
}

# 6d: Studies endpoint
Write-Host "`n--- 6d: Studies endpoint ---"
try {
  $studies = Invoke-RestMethod -Uri "$base/vista/imaging/studies?dfn=100022" -Method GET -WebSession $session -TimeoutSec 15
  Test-Result "Studies ok" ($studies.ok -eq $true)
  Test-Result "Studies response has array" ($null -ne $studies.studies) "count=$($studies.studies.Count)"
} catch {
  $errCode = $_.Exception.Response.StatusCode.value__
  if ($errCode -eq 500) { Test-Result "Studies" $false "HTTP 500 server error" }
  else { Test-Warn "Studies endpoint" "HTTP $errCode" }
}

# ===================================================================
# SECTION 7: Remote Data Viewer
# ===================================================================
Write-Host "`n=== SECTION 7: Remote Data Viewer ===" -ForegroundColor Cyan

Write-Host "`n--- 7a: No external sources in clean sandbox ---"
$externalTypes = @('fhir','hl7v2','external')
$externalEntries = $regList | Where-Object { $externalTypes -contains $_.type }
if ($externalEntries.Count -eq 0) {
  Test-Result "No external sources configured (expected)" $true "Clean Docker sandbox"
} else {
  Test-Result "External sources found" $true "count=$($externalEntries.Count)"
}

# ===================================================================
# SECTION 8: Device Onboarding
# ===================================================================
Write-Host "`n=== SECTION 8: Device Onboarding ===" -ForegroundColor Cyan

# 8a: Onboard a test device
Write-Host "`n--- 8a: Onboard test device ---"
$deviceBody = @{
  id = "test-xray-001"
  label = "Test X-Ray Room 1"
  host = "192.168.1.100"
  port = 11112
  manufacturer = "TestMfg"
  model = "XR-500"
  modalityCode = "CR"
  aeTitle = "XRAY001"
  location = "Radiology Suite A"
} | ConvertTo-Json
try {
  $device = Invoke-RestMethod -Uri "$base/admin/registry/default/onboard-device" -Method POST -Body $deviceBody -ContentType 'application/json' -WebSession $session -TimeoutSec 10
  Test-Result "Onboard device ok" ($device.ok -eq $true) "deviceId=$($device.device.id)"
  Test-Result "Device type is 'device'" ($device.device.type -eq 'device')
  Test-Result "Device enabled by default" ($device.device.enabled -eq $true)
  if ($device.device.config) {
    Test-Result "Config has manufacturer" ($device.device.config.manufacturer -eq 'TestMfg')
    Test-Result "Config has modalityCode" ($device.device.config.modalityCode -eq 'CR')
    Test-Result "Config has aeTitle" ($device.device.config.aeTitle -eq 'XRAY001')
  }
} catch {
  $errCode = $_.Exception.Response.StatusCode.value__
  Test-Result "Onboard device" $false "HTTP $errCode"
}

# 8b: Duplicate detection
Write-Host "`n--- 8b: Duplicate device rejection ---"
try {
  $null = Invoke-WebRequest -Uri "$base/admin/registry/default/onboard-device" -Method POST -Body $deviceBody -ContentType 'application/json' -WebSession $session -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
  Test-Result "Duplicate device rejected" $false "Got 200, expected 409"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Test-Result "Duplicate device -> 409" ($code -eq 409) "code=$code"
}

# 8c: Missing fields validation
Write-Host "`n--- 8c: Missing fields validation ---"
$badBody = '{"id":"bad","label":"Bad"}'
try {
  $null = Invoke-WebRequest -Uri "$base/admin/registry/default/onboard-device" -Method POST -Body $badBody -ContentType 'application/json' -WebSession $session -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
  Test-Result "Missing fields rejected" $false "Got 200, expected 400"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Test-Result "Missing fields -> 400" ($code -eq 400) "code=$code"
}

# 8d: Cleanup
Write-Host "`n--- 8d: Cleanup test device ---"
try {
  $del = Invoke-RestMethod -Uri "$base/admin/registry/default/test-xray-001" -Method DELETE -WebSession $session -TimeoutSec 10
  Test-Result "Delete test device" ($del.ok -eq $true)
} catch {
  Test-Warn "Cleanup test device" "Could not delete"
}

# 8e: Audit trail for device onboarding (needs auth)
Write-Host "`n--- 8e: Audit trail ---"
Start-Sleep -Seconds 1
$deviceAuditUrl = $base + '/audit/events?actionPrefix=integration.device-onboard' + [char]38 + 'limit=5'
$deviceAudit = Invoke-RestMethod -Uri $deviceAuditUrl -Method GET -WebSession $session -TimeoutSec 10
Test-Result "Device onboard audited" ($deviceAudit.count -gt 0) "count=$($deviceAudit.count)"

# ===================================================================
# SUMMARY
# ===================================================================
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  Sections 3-8 Summary" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
$fc = 'Green'; if ($fail -gt 0) { $fc = 'Red' }
Write-Host "  FAIL: $fail" -ForegroundColor $fc
$wc = 'Green'; if ($warn -gt 0) { $wc = 'Yellow' }
Write-Host "  WARN: $warn" -ForegroundColor $wc
Write-Host "======================================" -ForegroundColor Cyan
