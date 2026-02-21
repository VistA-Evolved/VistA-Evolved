<# Phase 64 -- Secure Messaging v1 (MailMan Bridge) Verifier #>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0
function Gate($id, $desc, $expr) {
  if ($expr) { Write-Host "  PASS  $id  $desc" -F Green; $script:pass++ }
  else       { Write-Host "  FAIL  $id  $desc" -F Red;   $script:fail++ }
}

Write-Host "`n=== Phase 64 -- Secure Messaging v1 (MailMan Bridge) ===" -F Cyan

# --- G64-01: MailMan Plan Artifact ---
Write-Host "`n--- G64-01: MailMan Plan Artifact ---"
$plan = "artifacts/phase64/mailman-plan.json"
Gate "G64-01a" "mailman-plan.json exists" (Test-Path -LiteralPath $plan)
if (Test-Path -LiteralPath $plan) {
  $planContent = Get-Content $plan -Raw
  Gate "G64-01b" "plan has vivianRpcs array" ($planContent -match '"vivianRpcs"')
  Gate "G64-01c" "plan references DSIC SEND MAIL MSG" ($planContent -match 'DSIC SEND MAIL MSG')
  Gate "G64-01d" "plan references ORQQXMB MAIL GROUPS" ($planContent -match 'ORQQXMB MAIL GROUPS')
  Gate "G64-01e" "plan has keySequences" ($planContent -match '"keySequences"')
  Gate "G64-01f" "plan documents read-inbox gap" ($planContent -match '"readInboxGap"')
} else {
  1..5 | ForEach-Object { Gate "G64-01$_" "plan content check" $false }
}

# --- G64-02: Secure Messaging Service ---
Write-Host "`n--- G64-02: Secure Messaging Service ---"
$svc = "apps/api/src/services/secure-messaging.ts"
Gate "G64-02a" "secure-messaging.ts exists" (Test-Path -LiteralPath $svc)
if (Test-Path -LiteralPath $svc) {
  $svcContent = Get-Content $svc -Raw
  Gate "G64-02b" "service has sendViaMailMan function" ($svcContent -match 'sendViaMailMan')
  Gate "G64-02c" "service calls DSIC SEND MAIL MSG" ($svcContent -match 'DSIC SEND MAIL MSG')
  Gate "G64-02d" "service has fetchMailGroups function" ($svcContent -match 'fetchMailGroups')
  Gate "G64-02e" "service has rate limiting" ($svcContent -match 'checkRateLimit')
  Gate "G64-02f" "service has getInbox function" ($svcContent -match 'getInbox')
  Gate "G64-02g" "service has portalSendToClinic" ($svcContent -match 'portalSendToClinic')
  Gate "G64-02h" "service never logs body" (-not ($svcContent -match 'log\.(info|warn|error).*body'))
} else {
  1..7 | ForEach-Object { Gate "G64-02$_" "service check" $false }
}

# --- G64-03: Messaging Routes ---
Write-Host "`n--- G64-03: Messaging Routes ---"
$routes = "apps/api/src/routes/messaging/index.ts"
Gate "G64-03a" "messaging routes file exists" (Test-Path -LiteralPath $routes)
if (Test-Path -LiteralPath $routes) {
  $routeContent = Get-Content $routes -Raw
  Gate "G64-03b" "GET /messaging/inbox defined" ($routeContent -match '/messaging/inbox')
  Gate "G64-03c" "GET /messaging/sent defined" ($routeContent -match '/messaging/sent')
  Gate "G64-03d" "GET /messaging/message/:id defined" ($routeContent -match '/messaging/message/:id')
  Gate "G64-03e" "POST /messaging/compose defined" ($routeContent -match '/messaging/compose')
  Gate "G64-03f" "GET /messaging/mail-groups defined" ($routeContent -match '/messaging/mail-groups')
  Gate "G64-03g" "POST /messaging/portal/send defined" ($routeContent -match '/messaging/portal/send')
  Gate "G64-03h" "GET /messaging/portal/inbox defined" ($routeContent -match '/messaging/portal/inbox')
  Gate "G64-03i" "GET /messaging/health defined" ($routeContent -match '/messaging/health')
  Gate "G64-03j" "routes never log message body" (-not ($routeContent -match 'log\.(info|warn|error).*\.body'))
} else {
  1..9 | ForEach-Object { Gate "G64-03$_" "routes check" $false }
}

# --- G64-04: Audit Actions ---
Write-Host "`n--- G64-04: Audit Actions ---"
$audit = "apps/api/src/lib/immutable-audit.ts"
if (Test-Path -LiteralPath $audit) {
  $auditContent = Get-Content $audit -Raw
  Gate "G64-04a" "messaging.send audit action exists" ($auditContent -match '"messaging\.send"')
  Gate "G64-04b" "messaging.read audit action exists" ($auditContent -match '"messaging\.read"')
  Gate "G64-04c" "messaging.portal-send audit action exists" ($auditContent -match '"messaging\.portal-send"')
} else {
  1..3 | ForEach-Object { Gate "G64-04$_" "audit check" $false }
}

# --- G64-05: Routes Use Correct Audit Actions ---
Write-Host "`n--- G64-05: Routes Use Correct Audit ---"
if (Test-Path -LiteralPath $routes) {
  $routeContent = Get-Content $routes -Raw
  Gate "G64-05a" "routes call immutableAudit for messaging.send" ($routeContent -match 'immutableAudit\("messaging\.send"')
  Gate "G64-05b" "routes call immutableAudit for messaging.read" ($routeContent -match 'immutableAudit\("messaging\.read"')
  Gate "G64-05c" "routes call immutableAudit for messaging.portal-send" ($routeContent -match 'immutableAudit\("messaging\.portal-send"')
  Gate "G64-05d" "audit sanitizes to metadata only" ($routeContent -match 'sanitizeForAudit')
} else {
  1..4 | ForEach-Object { Gate "G64-05$_" "audit wiring" $false }
}

# --- G64-06: Security ---
Write-Host "`n--- G64-06: Security ---"
$sec = "apps/api/src/middleware/security.ts"
if (Test-Path -LiteralPath $sec) {
  $secContent = Get-Content $sec -Raw
  Gate "G64-06a" "/messaging/portal/ auth rule (none -- own check)" ($secContent -match 'messaging.*portal.*auth.*none')
  Gate "G64-06b" "/messaging/ auth rule (session)" ($secContent -match 'messaging.*auth.*session')
} else {
  Gate "G64-06a" "security.ts check" $false
  Gate "G64-06b" "security.ts check" $false
}

# --- G64-07: Wired in index.ts ---
Write-Host "`n--- G64-07: Wired in index.ts ---"
$idx = "apps/api/src/index.ts"
if (Test-Path -LiteralPath $idx) {
  $idxContent = Get-Content $idx -Raw
  Gate "G64-07a" "import messagingRoutes" ($idxContent -match 'import messagingRoutes')
  Gate "G64-07b" "server.register(messagingRoutes)" ($idxContent -match 'server\.register\(messagingRoutes\)')
} else {
  Gate "G64-07a" "index.ts check" $false
  Gate "G64-07b" "index.ts check" $false
}

# --- G64-08: Clinician UI ---
Write-Host "`n--- G64-08: Clinician Messaging UI ---"
$clinUi = "apps/web/src/app/cprs/messages/page.tsx"
Gate "G64-08a" "clinician messages page exists" (Test-Path -LiteralPath $clinUi)
if (Test-Path -LiteralPath $clinUi) {
  $clinContent = Get-Content $clinUi -Raw
  Gate "G64-08b" "page has inbox tab" ($clinContent -match "tab.*inbox|'inbox'")
  Gate "G64-08c" "page has sent tab" ($clinContent -match "tab.*sent|'sent'")
  Gate "G64-08d" "page has compose tab" ($clinContent -match "tab.*compose|'compose'")
  Gate "G64-08e" "page fetches /messaging/inbox" ($clinContent -match '/messaging/inbox')
  Gate "G64-08f" "page fetches /messaging/compose" ($clinContent -match '/messaging/compose')
  Gate "G64-08g" "page fetches /messaging/mail-groups" ($clinContent -match '/messaging/mail-groups')
  Gate "G64-08h" "page has Reply button" ($clinContent -match 'Reply')
  Gate "G64-08i" "page has Send Message button" ($clinContent -match 'Send Message')
} else {
  1..8 | ForEach-Object { Gate "G64-08$_" "clinician UI check" $false }
}

# --- G64-09: Portal Messaging Wired ---
Write-Host "`n--- G64-09: Portal Messaging Posture ---"
$portalUi = "apps/portal/src/app/dashboard/messages/page.tsx"
if (Test-Path -LiteralPath $portalUi) {
  $portalContent = Get-Content $portalUi -Raw
  Gate "G64-09a" "portal page references /messaging/portal/send" ($portalContent -match '/messaging/portal/send')
  Gate "G64-09b" "portal page has vistaSync state" ($portalContent -match 'vistaSync')
  Gate "G64-09c" "portal page has VistA MailMan status display" ($portalContent -match 'VistA MailMan')
  Gate "G64-09d" "portal page shows integration-pending when no group configured" ($portalContent -match 'integration.pending')
} else {
  1..4 | ForEach-Object { Gate "G64-09$_" "portal check" $false }
}

# --- G64-10: Dead-Click Audit ---
Write-Host "`n--- G64-10: Dead-Click Audit ---"
if (Test-Path -LiteralPath $clinUi) {
  $clinContent = Get-Content $clinUi -Raw
  Gate "G64-10a" "inbox tab loads data on mount" ($clinContent -match 'fetchInbox')
  Gate "G64-10b" "compose send button calls handleSend" ($clinContent -match 'handleSend')
  Gate "G64-10c" "reply button calls handleReply" ($clinContent -match 'handleReply')
} else {
  1..3 | ForEach-Object { Gate "G64-10$_" "dead-click check" $false }
}
if (Test-Path -LiteralPath $portalUi) {
  $portalContent = Get-Content $portalUi -Raw
  Gate "G64-10d" "portal send calls handleSend" ($portalContent -match 'handleSend')
} else {
  Gate "G64-10d" "portal dead-click check" $false
}

# --- G64-11: No PHI in Audit ---
Write-Host "`n--- G64-11: PHI Safety ---"
if (Test-Path -LiteralPath $routes) {
  $routeContent = Get-Content $routes -Raw
  Gate "G64-11a" "sanitizeForAudit strips body" ($routeContent -match 'sanitizeForAudit')
  Gate "G64-11b" "audit detail has subjectLength not subject text" ($routeContent -match 'subjectLength')
  Gate "G64-11c" "audit detail has recipientCount not names" ($routeContent -match 'recipientCount')
} else {
  1..3 | ForEach-Object { Gate "G64-11$_" "PHI safety" $false }
}

# --- G64-12: verify-latest.ps1 ---
Write-Host "`n--- G64-12: verify-latest.ps1 ---"
$vl = "scripts/verify-latest.ps1"
if (Test-Path -LiteralPath $vl) {
  $vlContent = Get-Content $vl -Raw
  Gate "G64-12a" "verify-latest delegates to phase 64" ($vlContent -match 'phase.?64')
} else {
  Gate "G64-12a" "verify-latest check" $false
}

# --- G64-13: Capabilities ---
Write-Host "`n--- G64-13: Capabilities Config ---"
$caps = "config/capabilities.json"
if (Test-Path -LiteralPath $caps) {
  $capsContent = Get-Content $caps -Raw
  Gate "G64-13a" "messaging.clinician.send capability" ($capsContent -match 'messaging\.clinician\.send')
  Gate "G64-13b" "messaging.mail-groups capability" ($capsContent -match 'messaging\.mail-groups')
  Gate "G64-13c" "messaging.portal.send capability" ($capsContent -match 'messaging\.portal\.send')
} else {
  1..3 | ForEach-Object { Gate "G64-13$_" "capabilities check" $false }
}

# --- G64-14: Runbook ---
Write-Host "`n--- G64-14: Runbook ---"
$rb = "docs/runbooks/phase64-secure-messaging.md"
Gate "G64-14a" "runbook exists" (Test-Path -LiteralPath $rb)
if (Test-Path -LiteralPath $rb) {
  $rbContent = Get-Content $rb -Raw
  Gate "G64-14b" "runbook mentions DSIC SEND MAIL MSG" ($rbContent -match 'DSIC SEND MAIL MSG')
  Gate "G64-14c" "runbook mentions ORQQXMB MAIL GROUPS" ($rbContent -match 'ORQQXMB MAIL GROUPS')
} else {
  Gate "G64-14b" "runbook content" $false
  Gate "G64-14c" "runbook content" $false
}

# --- G64-15: Ops Artifacts ---
Write-Host "`n--- G64-15: Ops Artifacts ---"
Gate "G64-15a" "ops/phase64-summary.md exists" (Test-Path -LiteralPath "ops/phase64-summary.md")
Gate "G64-15b" "ops/phase64-notion-update.json exists" (Test-Path -LiteralPath "ops/phase64-notion-update.json")

# --- TypeScript ---
Write-Host "`n--- TypeScript ---"
Push-Location apps/api
$tsc = npx tsc --noEmit 2>&1
$tscOk = $LASTEXITCODE -eq 0
Pop-Location
Gate "TSC" "API TypeScript compiles clean" $tscOk

# --- Security: no console.log ---
Write-Host "`n--- Console.log Check ---"
$clFiles = @($svc, $routes)
$clFound = $false
foreach ($f in $clFiles) {
  if (Test-Path -LiteralPath $f) {
    $c = Get-Content $f -Raw
    if ($c -match 'console\.log') { $clFound = $true }
  }
}
Gate "CL-01" "No console.log in messaging code" (-not $clFound)

Write-Host "`n=== Phase 64 Results: $pass/$($pass+$fail) passed, $fail failed ===" -F $(if($fail -eq 0){'Green'}else{'Red'})
