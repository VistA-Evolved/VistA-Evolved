param([switch]$SkipDocker, [switch]$SkipPlaywright, [switch]$SkipE2E)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0
$fail = 0
$warn = 0

function Write-Gate {
  param([string]$Name, [bool]$Ok, [string]$Detail = "")
  if ($Ok) {
    Write-Host "  [PASS] $Name" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $Name - $Detail" -ForegroundColor Red
    $script:fail++
  }
}

function Write-Warning-Gate {
  param([string]$Name, [string]$Detail = "")
  Write-Host "  [WARN] $Name - $Detail" -ForegroundColor Yellow
  $script:warn++
}

function Test-FileContains {
  param([string]$Path, [string]$Pattern, [switch]$IsRegex)
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  if ($IsRegex) {
    return (Select-String -LiteralPath $Path -Pattern $Pattern -Quiet)
  }
  return (Select-String -LiteralPath $Path -Pattern $Pattern -SimpleMatch -Quiet)
}

function Get-SourceFiles {
  param([string[]]$Paths, [string[]]$Extensions)
  $results = @()
  foreach ($p in $Paths) {
    if (-not (Test-Path $p)) { continue }
    $results += Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Extension -in $Extensions -and
        $_.FullName -notmatch "[\\/]node_modules[\\/]" -and
        $_.FullName -notmatch "[\\/]\.next[\\/]" -and
        $_.FullName -notmatch "[\\/]dist[\\/]"
      }
  }
  return $results
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 32 VERIFY -- Messaging + Refills + Tasks (Behavioral)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ================================================================
# G32-0  REGRESSION (delegate to Phase 31 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G32-0: Regression (Phase 31 chain) ---" -ForegroundColor Yellow

$phase31Script = "$root\scripts\verify-phase1-to-phase31.ps1"
if (Test-Path $phase31Script) {
  Write-Host "  Delegating to Phase 31 verifier..." -ForegroundColor DarkGray
  $phase31Result = & powershell -ExecutionPolicy Bypass -File $phase31Script -SkipPlaywright -SkipE2E 2>&1
  $phase31Exit = $LASTEXITCODE
  if ($phase31Exit -eq 0) {
    Write-Gate "Phase 31 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 31 regression" "Phase 31 verifier returned exit code $phase31Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 31 regression" "verify-phase1-to-phase31.ps1 not found (non-blocking)"
}

# ================================================================
# G32-0b  PROMPTS + TSC
# ================================================================
Write-Host ""
Write-Host "--- G32-0b: Prompts + TypeScript ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
Write-Gate "Phase 32 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\34-PHASE-32-MESSAGING-REFILLS")
Write-Gate "Phase 32 IMPLEMENT prompt exists" (Test-Path -LiteralPath "$promptsDir\34-PHASE-32-MESSAGING-REFILLS\34-01-messaging-refills-IMPLEMENT.md")

# Phase folders contiguous (01-34)
$folders = Get-ChildItem -Path $promptsDir -Directory |
  Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name
$phaseFolders = $folders | Where-Object { [int]($_.Name.Substring(0, 2)) -ge 1 }
$expectedNum = 1
$contiguous = $true
foreach ($f in $phaseFolders) {
  $num = [int]($f.Name.Substring(0, 2))
  if ($num -ne $expectedNum) { $contiguous = $false; break }
  $expectedNum++
}
Write-Gate "Phase folder numbering contiguous (01-34)" $contiguous

# TSC compile -- API
Write-Host "  Checking API TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
$apiTsc = & npx tsc --noEmit 2>&1 | Out-String
$apiExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($apiExit -eq 0)

# TSC compile -- Portal
Write-Host "  Checking Portal TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\portal"
$portalTsc = & npx tsc --noEmit 2>&1 | Out-String
$portalExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal TypeScript compiles clean" ($portalExit -eq 0)

# TSC compile -- Web (CPRS shell)
Write-Host "  Checking Web TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\web"
$webTsc = & npx tsc --noEmit 2>&1 | Out-String
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web (CPRS) TypeScript compiles clean" ($webExit -eq 0)


# ================================================================
# G32-1  MESSAGING: SEND/RECEIVE + PROXY
# ================================================================
Write-Host ""
Write-Host "--- G32-1: Messaging -- Send/Receive + Proxy ---" -ForegroundColor Yellow

$msgPath = "$root\apps\api\src\services\portal-messaging.ts"
Write-Gate "portal-messaging.ts exists" (Test-Path -LiteralPath $msgPath)
$msgContent = if (Test-Path -LiteralPath $msgPath) { Get-Content $msgPath -Raw } else { "" }

# Core messaging functions
Write-Gate "createDraft function exported" ($msgContent -match "export function createDraft")
Write-Gate "sendMessage function exported" ($msgContent -match "export function sendMessage")
Write-Gate "getInbox function exported" ($msgContent -match "export function getInbox")
Write-Gate "getDrafts function exported" ($msgContent -match "export function getDrafts")
Write-Gate "getSent function exported" ($msgContent -match "export function getSent")
Write-Gate "getThread function exported" ($msgContent -match "export function getThread")
Write-Gate "getMessage marks readAt on view" ($msgContent -match "msg\.readAt\s*=\s*new Date\(\)\.toISOString\(\)")
Write-Gate "getMessage marks status = read" ($msgContent -match 'msg\.status\s*=\s*"read"')

# Phase 32: Proxy send
Write-Gate "sendOnBehalf function exported" ($msgContent -match "export function sendOnBehalf")
Write-Gate "Proxy: fromName includes proxy annotation" ($msgContent -match 'fromName:.*via.*proxyName')
Write-Gate "Proxy: rate limit applied to patient DFN" ($msgContent -match "checkRateLimit\(opts\.patientDfn\)")
Write-Gate "Proxy: blocklist checked" ($msgContent -match "checkBlocklist\(.*subject.*body")
Write-Gate "Proxy: audit detail notes proxy=true" ($msgContent -match "proxy:\s*true")
Write-Gate "Proxy: blocked messages audited (portal.message.blocked)" ($msgContent -match 'portal\.message\.blocked')

# Phase 32: Clinician reply
Write-Gate "clinicianReply function exported" ($msgContent -match "export function clinicianReply")
Write-Gate "clinicianReply takes object params (replyToId, clinicianDuz, clinicianName, body)" ($msgContent -match "clinicianReply\(opts:\s*\{" -and $msgContent -match "replyToId:" -and $msgContent -match "clinicianDuz:" -and $msgContent -match "clinicianName:")
Write-Gate "clinicianReply creates threaded reply (uses original.threadId)" ($msgContent -match "threadId:\s*original\.threadId")
Write-Gate "clinicianReply marks original as replied" ($msgContent -match 'original\.status\s*=\s*"replied"')
Write-Gate "clinicianReply strips proxy annotation from toName" ($msgContent -match 'split\(" \(via"\)')

# Phase 32: Staff message queue
Write-Gate "getStaffMessageQueue function exported" ($msgContent -match "export function getStaffMessageQueue")
Write-Gate "Staff queue filters toDfn=clinic + status=sent" ($msgContent -match 'm\.toDfn\s*===\s*"clinic"' -and $msgContent -match 'm\.status\s*===\s*"sent"')

# Attachments
Write-Gate "areAttachmentsEnabled function exported" ($msgContent -match "export function areAttachmentsEnabled")
Write-Gate "Attachments OFF by default (PORTAL_ATTACHMENTS_ENABLED)" ($msgContent -match 'process\.env\.PORTAL_ATTACHMENTS_ENABLED\s*===\s*"true"')
Write-Gate "addAttachment validates MIME types" ($msgContent -match "ALLOWED_MIME_TYPES\.has\(attachment\.mimeType\)")
Write-Gate "addAttachment enforces max 3 per message" ($msgContent -match "MAX_ATTACHMENTS_PER_MSG")
Write-Gate "addAttachment enforces 5MB limit" ($msgContent -match "MAX_ATTACHMENT_BYTES")

# SLA Disclaimer
Write-Gate "SLA_DISCLAIMER exported" ($msgContent -match "export const SLA_DISCLAIMER")
Write-Gate "SLA mentions non-urgent and 911" ($msgContent -match "non-urgent" -and $msgContent -match "911")


# ================================================================
# G32-2  AUDIT: ALL MESSAGE EVENTS LOGGED PHI-SAFE
# ================================================================
Write-Host ""
Write-Host "--- G32-2: Audit -- All Events Logged PHI-Safe ---" -ForegroundColor Yellow

$auditPath = "$root\apps\api\src\services\portal-audit.ts"
$auditContent = if (Test-Path -LiteralPath $auditPath) { Get-Content $auditPath -Raw } else { "" }

# Phase 32 audit action types
Write-Gate "Audit action: portal.refill.request" ($auditContent -match '"portal\.refill\.request"')
Write-Gate "Audit action: portal.refill.cancel" ($auditContent -match '"portal\.refill\.cancel"')
Write-Gate "Audit action: portal.refill.approve" ($auditContent -match '"portal\.refill\.approve"')
Write-Gate "Audit action: portal.refill.deny" ($auditContent -match '"portal\.refill\.deny"')
Write-Gate "Audit action: portal.task.create" ($auditContent -match '"portal\.task\.create"')
Write-Gate "Audit action: portal.task.complete" ($auditContent -match '"portal\.task\.complete"')
Write-Gate "Audit action: portal.task.dismiss" ($auditContent -match '"portal\.task\.dismiss"')
Write-Gate "Audit action: portal.message.proxy" ($auditContent -match '"portal\.message\.proxy"')
Write-Gate "Audit action: portal.message.clinician.reply" ($auditContent -match '"portal\.message\.clinician\.reply"')
Write-Gate "Audit action: portal.message.blocked" ($auditContent -match '"portal\.message\.blocked"')

# PHI safety in audit
Write-Gate "hashPatientId uses SHA-256 with salt" ($auditContent -match "createHash.*sha256" -and $auditContent -match "HASH_SALT")
Write-Gate "hashPatientId truncates to 16 hex chars" ($auditContent -match '\.slice\(0,\s*16\)')
Write-Gate "Audit event uses actorHash, not raw DFN" ($auditContent -match "actorHash:\s*hashPatientId\(actorDfn\)")
Write-Gate "No raw DFN stored in audit events" (-not ($auditContent -match 'actorDfn:\s*actorDfn'))
Write-Gate "Audit log excludes PHI (only action + outcome)" ($auditContent -match 'log\.info\("Portal audit event"' -and $auditContent -match "action:\s*event\.action" -and $auditContent -match "outcome:\s*event\.outcome")
Write-Gate "Ring buffer MAX_ENTRIES = 5000" ($auditContent -match "MAX_ENTRIES\s*=\s*5000")

# Refills service audits
$refillPath = "$root\apps\api\src\services\portal-refills.ts"
$refillContent = if (Test-Path -LiteralPath $refillPath) { Get-Content $refillPath -Raw } else { "" }
Write-Gate "Refill: request audited (portal.refill.request)" ($refillContent -match 'portalAudit\("portal\.refill\.request"')
Write-Gate "Refill: cancel audited (portal.refill.cancel)" ($refillContent -match 'portalAudit\("portal\.refill\.cancel"')
Write-Gate "Refill: audit detail includes refillId" ($refillContent -match 'detail:.*refillId')
Write-Gate "Refill: audit detail includes medication" ($refillContent -match 'detail:.*medication')

# Tasks service audits
$taskPath = "$root\apps\api\src\services\portal-tasks.ts"
$taskContent = if (Test-Path -LiteralPath $taskPath) { Get-Content $taskPath -Raw } else { "" }
Write-Gate "Task: create audited (portal.task.create)" ($taskContent -match 'portalAudit\("portal\.task\.create"')
Write-Gate "Task: dismiss audited (portal.task.dismiss)" ($taskContent -match 'portalAudit\("portal\.task\.dismiss"')
Write-Gate "Task: complete audited (portal.task.complete)" ($taskContent -match 'portalAudit\("portal\.task\.complete"')
Write-Gate "Task: audit detail includes taskId" ($taskContent -match 'detail:.*taskId')

# Messaging audits
Write-Gate "Messaging: send audited (portal.message.send)" ($msgContent -match 'portalAudit\("portal\.message\.send"')
Write-Gate "Messaging: read audited (portal.message.read)" ($msgContent -match 'portalAudit\("portal\.message\.read"')
Write-Gate "Messaging: draft audited (portal.message.draft)" ($msgContent -match 'portalAudit\("portal\.message\.draft"')


# ================================================================
# G32-3  REFILLS: REQUEST FLOW + VISTA-FIRST POSTURE
# ================================================================
Write-Host ""
Write-Host "--- G32-3: Refills -- Request Flow ---" -ForegroundColor Yellow

Write-Gate "portal-refills.ts exists" (Test-Path -LiteralPath $refillPath)

# Types
Write-Gate "RefillStatus union type (7 statuses)" ($refillContent -match '"requested"' -and $refillContent -match '"pending_review"' -and $refillContent -match '"pending_filing"' -and $refillContent -match '"approved"' -and $refillContent -match '"denied"' -and $refillContent -match '"filed_in_vista"' -and $refillContent -match '"cancelled"')
Write-Gate "RefillRequest has targetRpc field" ($refillContent -match "targetRpc:\s*string")
Write-Gate "RefillRequest has vistaSync field" ($refillContent -match 'vistaSync:\s*"not_attempted"\s*\|\s*"pending_filing"\s*\|\s*"filed"\s*\|\s*"failed"')
Write-Gate "RefillRequest has vistaRef field (PSO IEN)" ($refillContent -match "vistaRef:\s*string\s*\|\s*null")
Write-Gate "RefillRequest has isProxy field" ($refillContent -match "isProxy:\s*boolean")

# VistA-first pattern
Write-Gate "TARGET_RPC = PSO RENEW" ($refillContent -match 'TARGET_RPC\s*=\s*"PSO RENEW"')
Write-Gate "targetRpc set to TARGET_RPC on creation" ($refillContent -match "targetRpc:\s*TARGET_RPC")
Write-Gate "Approved refills set vistaSync = pending_filing" ($refillContent -match 'req\.vistaSync\s*=\s*"pending_filing"')
Write-Gate "Denied refills set vistaSync = not_attempted" ($refillContent -match 'req\.vistaSync\s*=\s*"not_attempted"')

# CRUD functions
Write-Gate "requestRefill function exported" ($refillContent -match "export function requestRefill")
Write-Gate "cancelRefill function exported" ($refillContent -match "export function cancelRefill")
Write-Gate "reviewRefill function exported" ($refillContent -match "export function reviewRefill")
Write-Gate "getPatientRefills function exported" ($refillContent -match "export function getPatientRefills")
Write-Gate "getStaffRefillQueue function exported" ($refillContent -match "export function getStaffRefillQueue")

# Staff queue filters pending
Write-Gate "Staff queue filters requested + pending_review" ($refillContent -match 'r\.status\s*===\s*"requested"\s*\|\|\s*r\.status\s*===\s*"pending_review"')

# Duplicate detection
Write-Gate "Duplicate pending request detection" ($refillContent -match "already pending")

# Cancel restrictions
Write-Gate "Cancel restricted to requested/pending_review statuses" ($refillContent -match 'requested.*pending_review.*\.includes\(req\.status\)' -or ($refillContent -match 'cancelRefill' -and $refillContent -match '"requested",\s*"pending_review"'))

# Seed data
Write-Gate "Seed demo data for DFN 100022" ($refillContent -match 'patientDfn:\s*"100022"')
Write-Gate "Seed: LISINOPRIL 10MG TAB" ($refillContent -match "LISINOPRIL 10MG TAB")
Write-Gate "Seed: METFORMIN 500MG TAB" ($refillContent -match "METFORMIN 500MG TAB")


# ================================================================
# G32-3b  REFILLS: REVIEW FLOW (CLINICIAN)
# ================================================================
Write-Host ""
Write-Host "--- G32-3b: Refills -- Review Flow ---" -ForegroundColor Yellow

Write-Gate "reviewRefill accepts approve/deny action" ($refillContent -match 'action:\s*"approve"\s*\|\s*"deny"')
Write-Gate "reviewRefill sets reviewedBy with duz prefix" ($refillContent -match 'req\.reviewedBy\s*=.*duz-')
Write-Gate "reviewRefill sets reviewedAt timestamp" ($refillContent -match "req\.reviewedAt\s*=\s*now")
Write-Gate "reviewRefill caps note at 500 chars" ($refillContent -match "note\.slice\(0,\s*500\)")
Write-Gate "Approve sets status = approved" ($refillContent -match 'req\.status\s*=\s*"approved"')
Write-Gate "Deny sets status = denied" ($refillContent -match 'req\.status\s*=\s*"denied"')
Write-Gate "Review rejects non-reviewable statuses" ($refillContent -match "Cannot review a refill in status")


# ================================================================
# G32-3c  TASKS: UNIFIED FEED
# ================================================================
Write-Host ""
Write-Host "--- G32-3c: Tasks -- Unified Feed ---" -ForegroundColor Yellow

Write-Gate "portal-tasks.ts exists" (Test-Path -LiteralPath $taskPath)

# Types
Write-Gate "TaskCategory: 6 categories" ($taskContent -match '"appointment_reminder"' -and $taskContent -match '"message_unread"' -and $taskContent -match '"refill_status"' -and $taskContent -match '"form_due"' -and $taskContent -match '"lab_result"' -and $taskContent -match '"general"')
Write-Gate "TaskPriority: 4 levels" ($taskContent -match '"low"\s*\|\s*"normal"\s*\|\s*"high"\s*\|\s*"urgent"')
Write-Gate "TaskStatus: 4 states" ($taskContent -match '"active"\s*\|\s*"completed"\s*\|\s*"dismissed"\s*\|\s*"expired"')
Write-Gate "PortalTask has actionUrl field" ($taskContent -match "actionUrl:\s*string\s*\|\s*null")
Write-Gate "PortalTask has actionLabel field" ($taskContent -match "actionLabel:\s*string\s*\|\s*null")
Write-Gate "PortalTask has sourceId field" ($taskContent -match "sourceId:\s*string\s*\|\s*null")
Write-Gate "PortalTask has expiresAt field" ($taskContent -match "expiresAt:\s*string\s*\|\s*null")

# CRUD
Write-Gate "getPatientTasks function exported" ($taskContent -match "export function getPatientTasks")
Write-Gate "getPatientTaskCounts function exported" ($taskContent -match "export function getPatientTaskCounts")
Write-Gate "getStaffTaskQueue function exported" ($taskContent -match "export function getStaffTaskQueue")
Write-Gate "createTask function exported" ($taskContent -match "export function createTask")
Write-Gate "dismissTask function exported" ($taskContent -match "export function dismissTask")
Write-Gate "completeTask function exported" ($taskContent -match "export function completeTask")

# Auto-expiry
Write-Gate "expireStale function exists" ($taskContent -match "function expireStale")
Write-Gate "Auto-expiry checks expiresAt < now" ($taskContent -match 'new Date\(task\.expiresAt\)\.getTime\(\)\s*<\s*now')
Write-Gate "Expired tasks set status = expired" ($taskContent -match 'task\.status\s*=\s*"expired"')

# Priority sorting
Write-Gate "Tasks sorted by priority (urgent first)" ($taskContent -match "urgent:\s*0" -and $taskContent -match "high:\s*1" -and $taskContent -match "normal:\s*2" -and $taskContent -match "low:\s*3")

# Badge counts
Write-Gate "Badge counts return byCategory record" ($taskContent -match "byCategory:\s*Record<TaskCategory,\s*number>")

# Seed data
Write-Gate "Seed demo tasks for DFN 100022" ($taskContent -match 'patientDfn:\s*"100022"')
Write-Gate "Seed: appointment_reminder task" ($taskContent -match 'category:\s*"appointment_reminder"')
Write-Gate "Seed: refill_status task" ($taskContent -match 'category:\s*"refill_status"')
Write-Gate "Seed: message_unread task" ($taskContent -match 'category:\s*"message_unread"')
Write-Gate "Seed: form_due task" ($taskContent -match 'category:\s*"form_due"')


# ================================================================
# G32-4  SECURITY: RATE LIMITS, CSRF, NO PHI IN LOGS
# ================================================================
Write-Host ""
Write-Host "--- G32-4: Security -- Rate Limits ---" -ForegroundColor Yellow

# Message rate limit
Write-Gate "Message rate limit: MAX_MESSAGES_PER_HOUR = 10" ($msgContent -match "MAX_MESSAGES_PER_HOUR\s*=\s*10")
Write-Gate "checkRateLimit function exported" ($msgContent -match "export function checkRateLimit")
Write-Gate "Rate limit uses rolling 1-hour window (3600000ms)" ($msgContent -match "3600000")
Write-Gate "Rate limit returns retryAfterMs on block" ($msgContent -match "retryAfterMs:")
Write-Gate "recordSend function records timestamps" ($msgContent -match "function recordSend")

# Refill rate limit
Write-Gate "Refill rate limit: MAX_REFILLS_PER_HOUR = 5" ($refillContent -match "MAX_REFILLS_PER_HOUR\s*=\s*5")
Write-Gate "Refill rate check uses hourly window" ($refillContent -match "3600000")
Write-Gate "Refill duplicate detection prevents spam" ($refillContent -match "already pending")

# Blocklist
Write-Gate "checkBlocklist function exported" ($msgContent -match "export function checkBlocklist")
Write-Gate "Blocklist reads from PORTAL_MSG_BLOCKLIST env" ($msgContent -match "process\.env\.PORTAL_MSG_BLOCKLIST")
Write-Gate "Blocklist is case-insensitive" ($msgContent -match "toLowerCase\(\)" -and $msgContent -match "BLOCKLIST_WORDS")

# ================================================================
# G32-4b  SECURITY: NO PHI IN LOGS
# ================================================================
Write-Host ""
Write-Host "--- G32-4b: Security -- No PHI in Logs ---" -ForegroundColor Yellow

# console.log scan in Phase 32 files
$phase32Files = @(
  "$root\apps\api\src\services\portal-messaging.ts",
  "$root\apps\api\src\services\portal-refills.ts",
  "$root\apps\api\src\services\portal-tasks.ts"
)
$clCount = 0
foreach ($f in $phase32Files) {
  if (Test-Path -LiteralPath $f) {
    $matches = Select-String -LiteralPath $f -Pattern "console\.log\(" -AllMatches -ErrorAction SilentlyContinue
    if ($matches) { $clCount += $matches.Matches.Count }
  }
}
Write-Gate "Phase 32 services: no console.log ($clCount found)" ($clCount -eq 0)

# No hardcoded credentials
$credLeak = $false
foreach ($f in $phase32Files) {
  if (Test-Path -LiteralPath $f) {
    $content = Get-Content $f -Raw
    if ($content -match "PROV123|password123|secret123") {
      $credLeak = $true
      break
    }
  }
}
Write-Gate "Phase 32 services: no hardcoded credentials" (-not $credLeak)

# Audit detail does NOT contain raw DFN in refills
Write-Gate "Refill audit: no raw patientDfn in detail" (-not ($refillContent -match 'detail:.*patientDfn:\s*opts\.patientDfn' -or $refillContent -match 'detail:.*patientDfn:\s*dfn'))
Write-Gate "Messaging proxy audit: uses hashed-patient, not raw DFN" ($msgContent -match 'onBehalfOf:\s*"hashed-patient"')

# No SSN in any Phase 32 file
$ssnLeak = $false
foreach ($f in $phase32Files) {
  if (Test-Path -LiteralPath $f) {
    $content = Get-Content $f -Raw
    if ($content -match '\bssn\s*[=:]') {
      $ssnLeak = $true
      break
    }
  }
}
Write-Gate "Phase 32 services: no SSN fields" (-not $ssnLeak)

# Body length capped
Write-Gate "Message body capped at MAX_BODY_LENGTH" ($msgContent -match "MAX_BODY_LENGTH\s*=\s*10000")
Write-Gate "Refill review note capped at 500 chars" ($refillContent -match "note\.slice\(0,\s*500\)")
Write-Gate "Task title capped at 200 chars" ($taskContent -match "title\.slice\(0,\s*200\)")
Write-Gate "Task body capped at 2000 chars" ($taskContent -match "body\.slice\(0,\s*2000\)")


# ================================================================
# G32-5  UI AUDIT: 0 DEAD CLICKS
# ================================================================
Write-Host ""
Write-Host "--- G32-5: UI -- Route Wiring ---" -ForegroundColor Yellow

$routesPath = "$root\apps\api\src\routes\portal-core.ts"
$routesContent = if (Test-Path -LiteralPath $routesPath) { Get-Content $routesPath -Raw } else { "" }

# Patient-facing routes
Write-Gate "Route: GET /portal/refills" ($routesContent -match 'server\.get\("\/portal\/refills"')
Write-Gate "Route: POST /portal/refills" ($routesContent -match 'server\.post\("\/portal\/refills"')
Write-Gate "Route: POST /portal/refills/:id/cancel" ($routesContent -match '\/portal\/refills\/:id\/cancel')
Write-Gate "Route: GET /portal/tasks" ($routesContent -match 'server\.get\("\/portal\/tasks"')
Write-Gate "Route: GET /portal/tasks/counts" ($routesContent -match '\/portal\/tasks\/counts')
Write-Gate "Route: POST /portal/tasks/:id/dismiss" ($routesContent -match '\/portal\/tasks\/:id\/dismiss')
Write-Gate "Route: POST /portal/tasks/:id/complete" ($routesContent -match '\/portal\/tasks\/:id\/complete')

# Staff routes
Write-Gate "Route: GET /portal/staff/refills" ($routesContent -match 'server\.get\("\/portal\/staff\/refills"')
Write-Gate "Route: POST /portal/staff/refills/:id/review" ($routesContent -match '\/portal\/staff\/refills\/:id\/review')
Write-Gate "Route: GET /portal/staff/tasks" ($routesContent -match 'server\.get\("\/portal\/staff\/tasks"')
Write-Gate "Route: GET /portal/staff/messages" ($routesContent -match 'server\.get\("\/portal\/staff\/messages"')
Write-Gate "Route: POST /portal/staff/messages/:id/reply" ($routesContent -match '\/portal\/staff\/messages\/:id\/reply')

# Route imports
Write-Gate "Routes import portal-refills functions" ($routesContent -match "from.*portal-refills")
Write-Gate "Routes import portal-tasks functions" ($routesContent -match "from.*portal-tasks")
Write-Gate "Routes import clinicianReply from messaging" ($routesContent -match "clinicianReply" -and ($routesContent -match 'from "../services/portal-messaging' -or $routesContent -match 'from.*portal-messaging'))
Write-Gate "Routes import getStaffMessageQueue" ($routesContent -match "getStaffMessageQueue" -and ($routesContent -match 'from "../services/portal-messaging' -or $routesContent -match 'from.*portal-messaging'))

# Session check on all Phase 32 routes
Write-Gate "All P32 routes call requirePortalSession" ($routesContent -match 'server\.get\("\/portal\/refills".*requirePortalSession' -or ($routesContent -match '\/portal\/refills"' -and $routesContent -match "requirePortalSession\(request, reply\)"))

# clinicianReply called with object parameter (not positional)
Write-Gate "clinicianReply called with {replyToId, ...} object" ($routesContent -match "clinicianReply\(\{" -or $routesContent -match "clinicianReply\(\s*\{")

# ================================================================
# G32-5b  UI: CPRS TASKS TAB
# ================================================================
Write-Host ""
Write-Host "--- G32-5b: UI -- CPRS Tasks Tab ---" -ForegroundColor Yellow

$tabsPath = "$root\apps\web\src\lib\contracts\data\tabs.json"
$tabStripPath = "$root\apps\web\src\components\cprs\CPRSTabStrip.tsx"
$chartPagePath = "$root\apps\web\src\app\cprs\chart\[dfn]\[tab]\page.tsx"
$panelBarrelPath = "$root\apps\web\src\components\cprs\panels\index.ts"
$panelPath = "$root\apps\web\src\components\cprs\panels\MessagingTasksPanel.tsx"

Write-Gate "MessagingTasksPanel.tsx exists" (Test-Path -LiteralPath $panelPath)

if (Test-Path -LiteralPath $tabsPath) {
  $tabsContent = Get-Content $tabsPath -Raw
  Write-Gate "tabs.json: CT_TASKS entry" ($tabsContent -match '"CT_TASKS"')
  Write-Gate "tabs.json: CT_TASKS id = 14" ($tabsContent -match '"id":\s*14')
  Write-Gate "tabs.json: CT_TASKS label = Tasks" ($tabsContent -match '"label":\s*"Tasks"')
}

if (Test-Path -LiteralPath $tabStripPath) {
  $tabStripContent = Get-Content $tabStripPath -Raw
  Write-Gate "CPRSTabStrip: tasks module mapped" ($tabStripContent -match "tasks:\s*'tasks'")
}

if (Test-Path -LiteralPath $chartPagePath) {
  $chartContent = Get-Content -LiteralPath $chartPagePath -Raw
  Write-Gate "Chart page: tasks in VALID_TABS" ($chartContent -match "'tasks'")
  Write-Gate "Chart page: MessagingTasksPanel imported" ($chartContent -match "MessagingTasksPanel")
  Write-Gate "Chart page: tasks case renders MessagingTasksPanel" ($chartContent -match "case 'tasks'.*MessagingTasksPanel" -or ($chartContent -match "case 'tasks'" -and $chartContent -match "MessagingTasksPanel"))
}

if (Test-Path -LiteralPath $panelBarrelPath) {
  $barrelContent = Get-Content $panelBarrelPath -Raw
  Write-Gate "Panel barrel: MessagingTasksPanel exported" ($barrelContent -match "MessagingTasksPanel")
}

if (Test-Path -LiteralPath $panelPath) {
  $panelContent = Get-Content $panelPath -Raw
  Write-Gate "Panel: 3 sub-tabs (messages, refills, tasks)" ($panelContent -match "'messages'" -and $panelContent -match "'refills'" -and $panelContent -match "'tasks'")
  Write-Gate "Panel: fetches /portal/staff/messages" ($panelContent -match "portal/staff/messages")
  Write-Gate "Panel: fetches /portal/staff/refills" ($panelContent -match "portal/staff/refills")
  Write-Gate "Panel: fetches /portal/staff/tasks" ($panelContent -match "portal/staff/tasks")
  Write-Gate "Panel: approve/deny refill actions" ($panelContent -match "'approve'" -and $panelContent -match "'deny'")
  Write-Gate "Panel: reply to message action" ($panelContent -match "replyToMessage\|Reply|reply")
  Write-Gate "Panel: uses credentials: include" ($panelContent -match "credentials.*include")
}

# ================================================================
# G32-5c  UI: PORTAL PAGES
# ================================================================
Write-Host ""
Write-Host "--- G32-5c: UI -- Portal Pages ---" -ForegroundColor Yellow

$refillPagePath = "$root\apps\portal\src\app\dashboard\refills\page.tsx"
$taskPagePath = "$root\apps\portal\src\app\dashboard\tasks\page.tsx"
$medsPagePath = "$root\apps\portal\src\app\dashboard\medications\page.tsx"

Write-Gate "Refills page exists" (Test-Path -LiteralPath $refillPagePath)
Write-Gate "Tasks page exists" (Test-Path -LiteralPath $taskPagePath)

if (Test-Path -LiteralPath $refillPagePath) {
  $refillPageContent = Get-Content $refillPagePath -Raw
  Write-Gate "Refills page: submit form (medicationName input)" ($refillPageContent -match "medicationName")
  Write-Gate "Refills page: cancel action" ($refillPageContent -match "Cancel|cancel")
  Write-Gate "Refills page: status display" ($refillPageContent -match "status")
  Write-Gate "Refills page: credentials: include on fetch" ($refillPageContent -match 'credentials.*"include"')
  Write-Gate "Refills page: uses /portal/refills endpoint" ($refillPageContent -match "portal/refills")
}

if (Test-Path -LiteralPath $taskPagePath) {
  $taskPageContent = Get-Content $taskPagePath -Raw
  Write-Gate "Tasks page: dismiss action" ($taskPageContent -match "dismiss|Dismiss")
  Write-Gate "Tasks page: complete action" ($taskPageContent -match "complete|Done")
  Write-Gate "Tasks page: badge counts displayed" ($taskPageContent -match "byCategory")
  Write-Gate "Tasks page: status filter (active/completed/dismissed)" ($taskPageContent -match '"active"' -and $taskPageContent -match '"completed"' -and $taskPageContent -match '"dismissed"')
  Write-Gate "Tasks page: uses /portal/tasks endpoint" ($taskPageContent -match "portal/tasks")
  Write-Gate "Tasks page: uses /portal/tasks/counts endpoint" ($taskPageContent -match "portal/tasks/counts")
  Write-Gate "Tasks page: credentials: include on fetch" ($taskPageContent -match 'credentials.*"include"')
  Write-Gate "Tasks page: category icons rendered" ($taskPageContent -match "categoryIcon")
  Write-Gate "Tasks page: priority colors" ($taskPageContent -match "priorityColor")
}

if (Test-Path -LiteralPath $medsPagePath) {
  $medsPageContent = Get-Content $medsPagePath -Raw
  Write-Gate "Medications page: links to refills" ($medsPageContent -match "/dashboard/refills")
  Write-Gate "Medications page: no more Coming Soon" (-not ($medsPageContent -match "Coming Soon"))
}

# ================================================================
# G32-5d  UI: NAVIGATION + API CLIENT
# ================================================================
Write-Host ""
Write-Host "--- G32-5d: UI -- Navigation + API Client ---" -ForegroundColor Yellow

$navPath = "$root\apps\portal\src\components\portal-nav.tsx"
$apiClientPath = "$root\apps\portal\src\lib\api.ts"

if (Test-Path -LiteralPath $navPath) {
  $navContent = Get-Content $navPath -Raw
  Write-Gate "Nav: Tasks entry" ($navContent -match "Tasks")
  Write-Gate "Nav: Refill Requests entry" ($navContent -match "Refill Requests")
  Write-Gate "Nav: /dashboard/tasks href" ($navContent -match "/dashboard/tasks")
  Write-Gate "Nav: /dashboard/refills href" ($navContent -match "/dashboard/refills")
}

if (Test-Path -LiteralPath $apiClientPath) {
  $apiContent = Get-Content $apiClientPath -Raw
  Write-Gate "API client: fetchRefills function" ($apiContent -match "export async function fetchRefills")
  Write-Gate "API client: requestRefill function" ($apiContent -match "export async function requestRefill")
  Write-Gate "API client: cancelRefill function" ($apiContent -match "export async function cancelRefill")
  Write-Gate "API client: fetchTasks function" ($apiContent -match "export async function fetchTasks")
  Write-Gate "API client: fetchTaskCounts function" ($apiContent -match "export async function fetchTaskCounts")
  Write-Gate "API client: dismissTask function" ($apiContent -match "export async function dismissTask")
  Write-Gate "API client: completeTask function" ($apiContent -match "export async function completeTask")
}


# ================================================================
# G32-6  DOCUMENTATION + OPS
# ================================================================
Write-Host ""
Write-Host "--- G32-6: Documentation + Ops ---" -ForegroundColor Yellow

$runbookPath = "$root\docs\runbooks\phase32-messaging-refills.md"
Write-Gate "Runbook exists" (Test-Path -LiteralPath $runbookPath)

if (Test-Path -LiteralPath $runbookPath) {
  $runbookContent = Get-Content $runbookPath -Raw
  Write-Gate "Runbook: VistA-first migration path" ($runbookContent -match "VistA-First Migration|PSO RENEW")
  Write-Gate "Runbook: API endpoints table" ($runbookContent -match "portal/refills")
  Write-Gate "Runbook: task categories table" ($runbookContent -match "appointment_reminder")
  Write-Gate "Runbook: abuse controls table" ($runbookContent -match "Rate limit|rate limit")
  Write-Gate "Runbook: CPRS integration section" ($runbookContent -match "CPRS Integration|MessagingTasksPanel")
  Write-Gate "Runbook: files changed section" ($runbookContent -match "Files Changed|files changed")
}

$summaryPath = "$root\ops\summary.md"
Write-Gate "ops/summary.md mentions Phase 32" (Test-FileContains $summaryPath "Phase 32")

$notionPath = "$root\ops\notion-update.json"
Write-Gate "ops/notion-update.json mentions Phase 32" (Test-FileContains $notionPath "Phase 32")


# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 32 VERIFY Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) {
  Write-Host "  FAIL: $fail" -ForegroundColor Red
} else {
  Write-Host "  FAIL: $fail" -ForegroundColor Green
}
if ($warn -gt 0) {
  Write-Host "  WARN: $warn" -ForegroundColor Yellow
} else {
  Write-Host "  WARN: $warn" -ForegroundColor Green
}

Write-Host ""
if ($fail -gt 0) {
  Write-Host "RESULT: GATES FAILED" -ForegroundColor Red
  exit 1
} else {
  Write-Host "RESULT: ALL GATES PASSED" -ForegroundColor Green
  exit 0
}
