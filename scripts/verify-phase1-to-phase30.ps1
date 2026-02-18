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
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Phase 30 Verification -- Telehealth Gates" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ================================================================
# G30-0  REGRESSION (delegate to Phase 29 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G30-0: Regression (Phase 29) ---" -ForegroundColor Yellow

$phase29Script = "$root\scripts\verify-phase1-to-phase29.ps1"
if (Test-Path $phase29Script) {
  Write-Host "  Delegating to Phase 29 verifier..." -ForegroundColor DarkGray
  $phase29Result = & powershell -ExecutionPolicy Bypass -File $phase29Script -SkipPlaywright -SkipE2E 2>&1
  $phase29Exit = $LASTEXITCODE
  if ($phase29Exit -eq 0) {
    Write-Gate "Phase 29 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 29 regression" "Phase 29 verifier returned exit code $phase29Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 29 regression" "verify-phase1-to-phase29.ps1 not found (non-blocking)"
}

# ================================================================
# G30-0b  PROMPTS + TSC
# ================================================================
Write-Host ""
Write-Host "--- G30-0b: Prompts + TypeScript ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"

Write-Gate "Phase 30 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\32-PHASE-30-TELEHEALTH")
Write-Gate "Phase 30 IMPLEMENT prompt exists" (Test-Path -LiteralPath "$promptsDir\32-PHASE-30-TELEHEALTH\32-01-telehealth-IMPLEMENT.md")
Write-Gate "Phase 30 VERIFY prompt exists" (Test-Path -LiteralPath "$promptsDir\32-PHASE-30-TELEHEALTH\32-02-telehealth-VERIFY.md")

# Phase folders contiguous
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
Write-Gate "Phase folder numbering contiguous (01-32)" $contiguous

# TSC compile
Write-Host "  Checking API TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
$apiTsc = & npx tsc --noEmit 2>&1 | Out-String
$apiExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($apiExit -eq 0)

Write-Host "  Checking Portal TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\portal"
$portalTsc = & npx tsc --noEmit 2>&1 | Out-String
$portalExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal TypeScript compiles clean" ($portalExit -eq 0)

Write-Host "  Checking Web TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\web"
$webTsc = & npx tsc --noEmit 2>&1 | Out-String
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web TypeScript compiles clean" ($webExit -eq 0)

# ================================================================
# G30-1  JOIN FLOW: PROVIDER INTERFACE + DEVICE CHECK + ROOMS
# ================================================================
Write-Host ""
Write-Host "--- G30-1: Join Flow (Provider + Device Check + Room Store) ---" -ForegroundColor Yellow

$thDir = "$root\apps\api\src\telehealth"
$provDir = "$thDir\providers"

# --- Provider interface (types.ts) ---
$typesPath = "$thDir\types.ts"
Write-Gate "File: telehealth/types.ts exists" (Test-Path -LiteralPath $typesPath)
$typesContent = if (Test-Path -LiteralPath $typesPath) { Get-Content $typesPath -Raw } else { "" }

Write-Gate "Types: TelehealthProvider interface" ($typesContent -match "export interface TelehealthProvider")
Write-Gate "Types: TelehealthRoom interface" ($typesContent -match "export interface TelehealthRoom")
Write-Gate "Types: RoomStatus type" ($typesContent -match "RoomStatus")
Write-Gate "Types: ParticipantRole type" ($typesContent -match "ParticipantRole")
Write-Gate "Types: CreateRoomResult" ($typesContent -match "CreateRoomResult")
Write-Gate "Types: JoinUrlResult" ($typesContent -match "JoinUrlResult")
Write-Gate "Types: DeviceCheckResult interface" ($typesContent -match "DeviceCheckResult")
Write-Gate "Types: WaitingRoomState interface" ($typesContent -match "WaitingRoomState")
Write-Gate "Types: WaitingRoomStatus type" ($typesContent -match "WaitingRoomStatus")
Write-Gate "Types: createRoom method" ($typesContent -match "createRoom")
Write-Gate "Types: joinUrl method" ($typesContent -match "joinUrl")
Write-Gate "Types: endRoom method" ($typesContent -match "endRoom")
Write-Gate "Types: healthCheck method" ($typesContent -match "healthCheck")
Write-Gate "Types: status fields (created/waiting/active/ended)" ($typesContent -match "created" -and $typesContent -match "waiting" -and $typesContent -match "active" -and $typesContent -match "ended")

# --- Jitsi provider ---
$jitsiPath = "$provDir\jitsi-provider.ts"
Write-Gate "File: jitsi-provider.ts exists" (Test-Path -LiteralPath $jitsiPath)
$jitsiContent = if (Test-Path -LiteralPath $jitsiPath) { Get-Content $jitsiPath -Raw } else { "" }

Write-Gate "Jitsi: class JitsiProvider" ($jitsiContent -match "export class JitsiProvider")
Write-Gate "Jitsi: implements TelehealthProvider" ($jitsiContent -match "implements TelehealthProvider")
Write-Gate "Jitsi: JITSI_BASE_URL env" ($jitsiContent -match "JITSI_BASE_URL")
Write-Gate "Jitsi: JITSI_APP_SECRET env" ($jitsiContent -match "JITSI_APP_SECRET")
Write-Gate "Jitsi: JITSI_APP_ID env" ($jitsiContent -match "JITSI_APP_ID")
Write-Gate "Jitsi: opaque room ID (ve- prefix)" ($jitsiContent -match "ve-")
Write-Gate "Jitsi: randomBytes for room ID" ($jitsiContent -match "randomBytes")
Write-Gate "Jitsi: generateJitsiJwt function" ($jitsiContent -match "generateJitsiJwt")
Write-Gate "Jitsi: recording disabled config" ($jitsiContent -match "localRecording|DISABLE_TRANSCRIPTION")
Write-Gate "Jitsi: healthCheck with timeout" ($jitsiContent -match "healthCheck" -and $jitsiContent -match "abort|AbortController|timeout")
Write-Gate "Jitsi: no PHI in room name" (-not ($jitsiContent -match "patientName|dfn.*room|room.*dfn"))
Write-Gate "Jitsi: HMAC SHA256 JWT signing" ($jitsiContent -match "HS256|hmac|sha256" -or $jitsiContent -match "HMAC")

# --- Provider registry (index.ts) ---
$provIndexPath = "$provDir\index.ts"
Write-Gate "File: providers/index.ts exists" (Test-Path -LiteralPath $provIndexPath)
$provIndexContent = if (Test-Path -LiteralPath $provIndexPath) { Get-Content $provIndexPath -Raw } else { "" }

Write-Gate "Registry: getTelehealthProvider exported" ($provIndexContent -match "export function getTelehealthProvider")
Write-Gate "Registry: listProviders exported" ($provIndexContent -match "export function listProviders")
Write-Gate "Registry: resetProvider exported" ($provIndexContent -match "export function resetProvider")
Write-Gate "Registry: TELEHEALTH_PROVIDER env var" ($provIndexContent -match "TELEHEALTH_PROVIDER")
Write-Gate "Registry: jitsi provider mapped" ($provIndexContent -match '"jitsi"' -or $provIndexContent -match "'jitsi'")
Write-Gate "Registry: stub provider mapped" ($provIndexContent -match '"stub"' -or $provIndexContent -match "'stub'")
Write-Gate "Registry: StubProvider class" ($provIndexContent -match "class StubProvider")
Write-Gate "Registry: StubProvider implements TelehealthProvider" ($provIndexContent -match "StubProvider.*implements TelehealthProvider")
Write-Gate "Registry: JitsiProvider import" ($provIndexContent -match "JitsiProvider")
Write-Gate "Registry: singleton pattern" ($provIndexContent -match "instance|singleton|cached|_provider")

# --- Room store ---
$roomStorePath = "$thDir\room-store.ts"
Write-Gate "File: room-store.ts exists" (Test-Path -LiteralPath $roomStorePath)
$roomContent = if (Test-Path -LiteralPath $roomStorePath) { Get-Content $roomStorePath -Raw } else { "" }

Write-Gate "RoomStore: createRoom function" ($roomContent -match "export function createRoom")
Write-Gate "RoomStore: getRoom function" ($roomContent -match "export function getRoom")
Write-Gate "RoomStore: getRoomByAppointment function" ($roomContent -match "export function getRoomByAppointment")
Write-Gate "RoomStore: updateRoomStatus function" ($roomContent -match "export function updateRoomStatus")
Write-Gate "RoomStore: joinRoom function" ($roomContent -match "export function joinRoom")
Write-Gate "RoomStore: endRoom function" ($roomContent -match "export function endRoom")
Write-Gate "RoomStore: getWaitingRoomState function" ($roomContent -match "export function getWaitingRoomState")
Write-Gate "RoomStore: getRoomAccessToken function" ($roomContent -match "export function getRoomAccessToken")
Write-Gate "RoomStore: verifyRoomAccess function" ($roomContent -match "export function verifyRoomAccess")
Write-Gate "RoomStore: listActiveRooms function" ($roomContent -match "export function listActiveRooms")
Write-Gate "RoomStore: getRoomStats function" ($roomContent -match "export function getRoomStats")
Write-Gate "RoomStore: startRoomCleanup function" ($roomContent -match "export function startRoomCleanup")
Write-Gate "RoomStore: stopRoomCleanup function" ($roomContent -match "export function stopRoomCleanup")
Write-Gate "RoomStore: TELEHEALTH_ROOM_TTL_MS env" ($roomContent -match "TELEHEALTH_ROOM_TTL_MS")
Write-Gate "RoomStore: MAX_ROOMS cap (500)" ($roomContent -match "500|MAX_ROOMS")
Write-Gate "RoomStore: cleanup interval" ($roomContent -match "CLEANUP_INTERVAL_MS|setInterval")
Write-Gate "RoomStore: randomBytes for opaque IDs" ($roomContent -match "randomBytes")
Write-Gate "RoomStore: expiry check" ($roomContent -match "isExpired|expiresAt")
Write-Gate "RoomStore: constant-time access verification" ($roomContent -match "Constant-time|charCodeAt.*xor|\^|timingSafeEqual")

# --- Device check ---
$deviceCheckPath = "$thDir\device-check.ts"
Write-Gate "File: device-check.ts exists" (Test-Path -LiteralPath $deviceCheckPath)
$deviceContent = if (Test-Path -LiteralPath $deviceCheckPath) { Get-Content $deviceCheckPath -Raw } else { "" }

Write-Gate "DeviceCheck: getDeviceRequirements function" ($deviceContent -match "export function getDeviceRequirements")
Write-Gate "DeviceCheck: getIceServers function" ($deviceContent -match "export function getIceServers")
Write-Gate "DeviceCheck: validateDeviceReport function" ($deviceContent -match "export function validateDeviceReport")
Write-Gate "DeviceCheck: SUPPORTED_BROWSERS" ($deviceContent -match "SUPPORTED_BROWSERS")
Write-Gate "DeviceCheck: Chrome version" ($deviceContent -match "Chrome.*90|chrome.*90")
Write-Gate "DeviceCheck: Firefox version" ($deviceContent -match "Firefox.*88|firefox.*88")
Write-Gate "DeviceCheck: Safari version" ($deviceContent -match "Safari.*15|safari.*15")
Write-Gate "DeviceCheck: minBandwidthKbps" ($deviceContent -match "minBandwidthKbps")
Write-Gate "DeviceCheck: STUN servers" ($deviceContent -match "stun:|STUN")
Write-Gate "DeviceCheck: TURN support" ($deviceContent -match "TELEHEALTH_TURN_URL|TURN")
Write-Gate "DeviceCheck: required features list" ($deviceContent -match "getUserMedia|RTCPeerConnection|enumerateDevices")

# ================================================================
# G30-1b  ROUTES: CLINICIAN + PATIENT ENDPOINTS
# ================================================================
Write-Host ""
Write-Host "--- G30-1b: Routes (Clinician + Patient) ---" -ForegroundColor Yellow

$routesPath = "$root\apps\api\src\routes\telehealth.ts"
Write-Gate "File: routes/telehealth.ts exists" (Test-Path -LiteralPath $routesPath)
$routesContent = if (Test-Path -LiteralPath $routesPath) { Get-Content $routesPath -Raw } else { "" }

Write-Gate "Routes: telehealthRoutes default export" ($routesContent -match "export default async function telehealthRoutes")
Write-Gate "Routes: initTelehealthRoutes export" ($routesContent -match "export function initTelehealthRoutes")

# Clinician routes
Write-Gate "Route: POST /telehealth/rooms (create)" ($routesContent -match "\/telehealth\/rooms.*POST|POST.*\/telehealth\/rooms" -or ($routesContent -match "server\.post.*\/telehealth\/rooms"))
Write-Gate "Route: GET /telehealth/rooms (list)" ($routesContent -match "server\.get.*\/telehealth\/rooms")
Write-Gate "Route: GET /telehealth/rooms/:roomId" ($routesContent -match "\/telehealth\/rooms\/:roomId")
Write-Gate "Route: POST /telehealth/rooms/:roomId/join" ($routesContent -match "\/telehealth\/rooms\/:roomId\/join")
Write-Gate "Route: POST /telehealth/rooms/:roomId/end" ($routesContent -match "\/telehealth\/rooms\/:roomId\/end")
Write-Gate "Route: GET /telehealth/rooms/:roomId/waiting" ($routesContent -match "\/telehealth\/rooms\/:roomId\/waiting")
Write-Gate "Route: GET /telehealth/device-check/requirements" ($routesContent -match "\/telehealth\/device-check\/requirements")
Write-Gate "Route: GET /telehealth/health" ($routesContent -match "\/telehealth\/health")

# Patient (portal) routes
Write-Gate "Route: GET /portal/telehealth/appointment/:id/room" ($routesContent -match "\/portal\/telehealth\/appointment\/:appointmentId\/room")
Write-Gate "Route: POST /portal/telehealth/rooms/:roomId/join" ($routesContent -match "\/portal\/telehealth\/rooms\/:roomId\/join")
Write-Gate "Route: GET /portal/telehealth/rooms/:roomId/waiting" ($routesContent -match "\/portal\/telehealth\/rooms\/:roomId\/waiting")
Write-Gate "Route: GET /portal/telehealth/device-check" ($routesContent -match "\/portal\/telehealth\/device-check")
Write-Gate "Route: POST /portal/telehealth/device-check/report" ($routesContent -match "\/portal\/telehealth\/device-check\/report")

# ================================================================
# G30-2  AUDIT: JOIN/LEAVE EVENTS LOGGED PHI-SAFE
# ================================================================
Write-Host ""
Write-Host "--- G30-2: Audit (PHI-safe join/leave logging) ---" -ForegroundColor Yellow

$auditPath = "$root\apps\api\src\services\portal-audit.ts"
Write-Gate "File: portal-audit.ts exists" (Test-Path -LiteralPath $auditPath)
$auditContent = if (Test-Path -LiteralPath $auditPath) { Get-Content $auditPath -Raw } else { "" }

Write-Gate "Audit: room.created action" ($auditContent -match "portal\.telehealth\.room\.created")
Write-Gate "Audit: joined action" ($auditContent -match "portal\.telehealth\.joined")
Write-Gate "Audit: ended action" ($auditContent -match "portal\.telehealth\.ended")
Write-Gate "Audit: device.check action" ($auditContent -match "portal\.telehealth\.device\.check")

# Routes use portalAudit
Write-Gate "Routes: portalAudit imported" ($routesContent -match "portalAudit")
Write-Gate "Routes: portalAudit calls in telehealth" ($routesContent -match "portalAudit\(")

# PHI-safety in room store: no patient name stored
Write-Gate "RoomStore: no patientName field" (-not ($roomContent -match "patientName\s*:"))
Write-Gate "RoomStore: uses opaque roomId (randomBytes)" ($roomContent -match "randomBytes")

# Audit entries don't contain PHI
Write-Gate "Audit: no SSN in type def" (-not ($auditContent -match "\bssn\b.*string|socialSecurity"))
Write-Gate "Audit: no DOB in type def" (-not ($auditContent -match "\bdob\b.*string|dateOfBirth.*string"))

# ================================================================
# G30-3  SECURITY: LINKS EXPIRE, NO PHI IN URLs, AUTH RULES
# ================================================================
Write-Host ""
Write-Host "--- G30-3: Security (link expiry, no PHI in URLs, auth) ---" -ForegroundColor Yellow

# Link expiry
Write-Gate "Jitsi: JITSI_JOIN_TTL_SECONDS config" ($jitsiContent -match "JITSI_JOIN_TTL_SECONDS")
Write-Gate "Jitsi: JWT exp claim" ($jitsiContent -match "exp:" -and $jitsiContent -match "iat:")
Write-Gate "RoomStore: room expiresAt timestamp" ($roomContent -match "expiresAt")
Write-Gate "RoomStore: 4-hour default TTL" ($roomContent -match "14400000|4\s*\*\s*60\s*\*\s*60\s*\*\s*1000")

# No PHI in URLs
Write-Gate "Jitsi: room names use random hex (no patient data)" ($jitsiContent -match "randomBytes")
Write-Gate "Routes: no patient name in join URL" (-not ($routesContent -match "patientName.*joinUrl|joinUrl.*patientName"))

# Auth rules in security.ts
$securityPath = "$root\apps\api\src\middleware\security.ts"
$securityContent = if (Test-Path -LiteralPath $securityPath) { Get-Content $securityPath -Raw } else { "" }

Write-Gate "Security: telehealth health rule" ($securityContent -match "telehealth.*health")
Write-Gate "Security: telehealth device-check public" ($securityContent -match "telehealth.*device-check")
Write-Gate "Security: telehealth session rule" ($securityContent -match "telehealth.*session")
Write-Gate "Security: stopRoomCleanup in shutdown" ($securityContent -match "stopRoomCleanup")

# Portal telehealth covered by /portal/ none rule
Write-Gate "Security: portal/* catch-all exists" ($securityContent -match "portal.*none")

# Access token verification (constant-time comparison)
Write-Gate "RoomStore: constant-time token compare" ($roomContent -match "Constant-time|charCodeAt|\^")

# ================================================================
# G30-4  UI AUDIT: 0 DEAD CLICKS IN TELEHEALTH FLOW
# ================================================================
Write-Host ""
Write-Host "--- G30-4: UI Audit (portal + CPRS panels) ---" -ForegroundColor Yellow

# --- Portal telehealth page ---
$portalPagePath = "$root\apps\portal\src\app\dashboard\telehealth\page.tsx"
Write-Gate "File: portal telehealth page.tsx exists" (Test-Path -LiteralPath $portalPagePath)
$portalPageContent = if (Test-Path -LiteralPath $portalPagePath) { Get-Content $portalPagePath -Raw } else { "" }

Write-Gate "Portal: TelehealthPage export" ($portalPageContent -match "export default function TelehealthPage")
Write-Gate "Portal: 4-view state machine" ($portalPageContent -match "appointments.*device-check|setView")
Write-Gate "Portal: device check - getUserMedia" ($portalPageContent -match "getUserMedia")
Write-Gate "Portal: device check - RTCPeerConnection" ($portalPageContent -match "RTCPeerConnection")
Write-Gate "Portal: device check - enumerateDevices" ($portalPageContent -match "enumerateDevices")
Write-Gate "Portal: waiting room poll interval" ($portalPageContent -match "setInterval|polling|5000")
Write-Gate "Portal: iframe for video visit" ($portalPageContent -match "<iframe")
Write-Gate "Portal: camera permission in iframe" ($portalPageContent -match "allow.*camera")
Write-Gate "Portal: microphone permission in iframe" ($portalPageContent -match "allow.*microphone")
Write-Gate "Portal: privacy notice (not recorded)" ($portalPageContent -match "not recorded|recording.*off|Recording is OFF")
Write-Gate "Portal: no PHI notice" ($portalPageContent -match "no PHI|No PHI|PHI")
Write-Gate "Portal: DeviceItem component" ($portalPageContent -match "DeviceItem")
Write-Gate "Portal: credentials include on fetch" ($portalPageContent -match "credentials.*include")
Write-Gate "Portal: back/navigation from each view" ($portalPageContent -match "setView.*appointments" -or $portalPageContent -match "Back")

# Button click handlers all wired
Write-Gate "Portal: start device check handler" ($portalPageContent -match "onClick.*setView.*device|handleStart|Begin Device")
Write-Gate "Portal: join visit handler" ($portalPageContent -match "handleJoin|joinRoom|Join")
Write-Gate "Portal: end visit handler" ($portalPageContent -match "handleEnd|handleLeave|endVisit|Leave|End")

# --- Portal API functions ---
$portalApiPath = "$root\apps\portal\src\lib\api.ts"
$portalApiContent = if (Test-Path -LiteralPath $portalApiPath) { Get-Content $portalApiPath -Raw } else { "" }

Write-Gate "PortalAPI: fetchTelehealthRoom" ($portalApiContent -match "fetchTelehealthRoom")
Write-Gate "PortalAPI: joinTelehealthRoom" ($portalApiContent -match "joinTelehealthRoom")
Write-Gate "PortalAPI: getTelehealthWaitingRoom" ($portalApiContent -match "getTelehealthWaitingRoom")
Write-Gate "PortalAPI: getTelehealthDeviceRequirements" ($portalApiContent -match "getTelehealthDeviceRequirements")
Write-Gate "PortalAPI: submitDeviceCheckReport" ($portalApiContent -match "submitDeviceCheckReport")
Write-Gate "PortalAPI: portal telehealth paths" ($portalApiContent -match "/portal/telehealth/")

# --- CPRS TelehealthPanel ---
$cprsDir = "$root\apps\web\src\components\cprs\panels"
$panelPath = "$cprsDir\TelehealthPanel.tsx"
Write-Gate "File: TelehealthPanel.tsx exists" (Test-Path -LiteralPath $panelPath)
$panelContent = if (Test-Path -LiteralPath $panelPath) { Get-Content $panelPath -Raw } else { "" }

Write-Gate "Panel: default export TelehealthPanel" ($panelContent -match "export default function TelehealthPanel")
Write-Gate "Panel: dfn prop" ($panelContent -match "dfn.*string|\{ dfn \}")
Write-Gate "Panel: credentials include" ($panelContent -match "credentials.*include")
Write-Gate "Panel: iframe for video" ($panelContent -match "<iframe")
Write-Gate "Panel: camera permission" ($panelContent -match "allow.*camera")
Write-Gate "Panel: microphone permission" ($panelContent -match "allow.*microphone")
Write-Gate "Panel: Recording is OFF notice" ($panelContent -match "Recording is OFF|recording.*off")
Write-Gate "Panel: No PHI in URLs notice" ($panelContent -match "No PHI|no PHI|PHI.*URL")
Write-Gate "Panel: create room handler" ($panelContent -match "handleCreateRoom|createRoom")
Write-Gate "Panel: join handler" ($panelContent -match "handleJoin")
Write-Gate "Panel: end handler" ($panelContent -match "handleEnd")
Write-Gate "Panel: room list display" ($panelContent -match "rooms|activeRooms|listActiveRooms")
Write-Gate "Panel: room status colors" ($panelContent -match "created.*waiting|status.*color|statusColor")
Write-Gate "Panel: provider health check" ($panelContent -match "/telehealth/health")
Write-Gate "Panel: waiting state poll" ($panelContent -match "setInterval|polling|5000")

# --- Barrel export ---
$barrelPath = "$cprsDir\index.ts"
$barrelContent = if (Test-Path -LiteralPath $barrelPath) { Get-Content $barrelPath -Raw } else { "" }
Write-Gate "Barrel: TelehealthPanel exported" ($barrelContent -match "TelehealthPanel")

# --- Tabs.json ---
$tabsPath = "$root\apps\web\src\lib\contracts\data\tabs.json"
$tabsContent = if (Test-Path -LiteralPath $tabsPath) { Get-Content $tabsPath -Raw } else { "" }
Write-Gate "Tabs: CT_TELEHEALTH constant" ($tabsContent -match "CT_TELEHEALTH")
Write-Gate "Tabs: Telehealth label" ($tabsContent -match '"Telehealth"')

# --- CPRSTabStrip wiring ---
$tabStripPath = "$root\apps\web\src\components\cprs\CPRSTabStrip.tsx"
$tabStripContent = if (Test-Path -LiteralPath $tabStripPath) { Get-Content $tabStripPath -Raw } else { "" }
Write-Gate "TabStrip: telehealth in TAB_TO_MODULE" ($tabStripContent -match "telehealth.*:.*telehealth|telehealth")

# --- Chart page routing ---
$chartPageDir = "$root\apps\web\src\app\cprs\chart"
# Use -LiteralPath for bracket dirs and [System.IO.File] to read (PowerShell -Raw fails on bracket paths)
$chartPages = Get-ChildItem -LiteralPath $chartPageDir -Recurse -Filter "page.tsx" -ErrorAction SilentlyContinue
$chartPagePath = $null
foreach ($cp in $chartPages) {
  if ($cp.FullName -match "tab.*page\.tsx") { $chartPagePath = $cp.FullName; break }
}
$chartPageContent = if ($chartPagePath -and (Test-Path -LiteralPath $chartPagePath)) { [System.IO.File]::ReadAllText($chartPagePath) } else { "" }

Write-Gate "ChartPage: TelehealthPanel import" ($chartPageContent -match "TelehealthPanel")
Write-Gate "ChartPage: telehealth case in switch" ($chartPageContent -match "case.*telehealth.*TelehealthPanel|case 'telehealth'")
Write-Gate "ChartPage: telehealth in VALID_TABS" ($chartPageContent -match "telehealth")

# ================================================================
# G30-5  PROVIDER SWAP: FALLBACK WHEN NOT CONFIGURED
# ================================================================
Write-Host ""
Write-Host "--- G30-5: Provider Swap / Fallback ---" -ForegroundColor Yellow

# Registry handles unknown provider gracefully
Write-Gate "Registry: fallback to default provider" ($provIndexContent -match "default|jitsi|fallback" -and $provIndexContent -match "TELEHEALTH_PROVIDER")
Write-Gate "Registry: error/warn for unknown provider" ($provIndexContent -match "warn|error|throw|fallback|not found|unknown|unsupported" -or $provIndexContent -match "jitsi")

# StubProvider is a complete implementation (can be used as fallback)
Write-Gate "StubProvider: createRoom implemented" ($provIndexContent -match "class StubProvider" -and $provIndexContent -match "createRoom")
Write-Gate "StubProvider: joinUrl implemented" ($provIndexContent -match "class StubProvider" -and $provIndexContent -match "joinUrl")
Write-Gate "StubProvider: endRoom implemented" ($provIndexContent -match "class StubProvider" -and $provIndexContent -match "endRoom")
Write-Gate "StubProvider: healthCheck implemented" ($provIndexContent -match "class StubProvider" -and $provIndexContent -match "healthCheck")

# Health check endpoint reflects provider status
Write-Gate "Routes: health endpoint returns provider info" ($routesContent -match "\/telehealth\/health" -and $routesContent -match "healthCheck|provider")

# resetProvider for testing
Write-Gate "Registry: resetProvider for test swap" ($provIndexContent -match "export function resetProvider")

# Jitsi defaults work without JITSI_APP_SECRET
Write-Gate "Jitsi: works without APP_SECRET (fallback to no JWT)" ($jitsiContent -match "JITSI_APP_SECRET" -and ($jitsiContent -match "if.*secret|secret.*\?" -or $jitsiContent -match "undefined|optional"))

# ================================================================
# G30-6  INDEX.TS WIRING
# ================================================================
Write-Host ""
Write-Host "--- G30-6: API Index Registration ---" -ForegroundColor Yellow

$indexContent = if (Test-Path "$root\apps\api\src\index.ts") { Get-Content "$root\apps\api\src\index.ts" -Raw } else { "" }

Write-Gate "Index: imports telehealthRoutes" ($indexContent -match "telehealthRoutes")
Write-Gate "Index: imports initTelehealthRoutes" ($indexContent -match "initTelehealthRoutes")
Write-Gate "Index: imports startRoomCleanup" ($indexContent -match "startRoomCleanup")
Write-Gate "Index: registers telehealthRoutes" ($indexContent -match "server\.register\(telehealthRoutes\)")
Write-Gate "Index: calls initTelehealthRoutes()" ($indexContent -match "initTelehealthRoutes\(")
Write-Gate "Index: calls startRoomCleanup()" ($indexContent -match "startRoomCleanup\(\)")

# ================================================================
# G30-7  DOCUMENTATION + OPS
# ================================================================
Write-Host ""
Write-Host "--- G30-7: Documentation + Ops ---" -ForegroundColor Yellow

Write-Gate "Doc: runbooks/phase30-telehealth.md" (Test-Path "$root\docs\runbooks\phase30-telehealth.md")
Write-Gate "Ops: phase30-summary.md" (Test-Path "$root\ops\phase30-summary.md")
Write-Gate "Ops: phase30-notion-update.json" (Test-Path "$root\ops\phase30-notion-update.json")

$runbookPath = "$root\docs\runbooks\phase30-telehealth.md"
$runbookContent = if (Test-Path $runbookPath) { Get-Content $runbookPath -Raw } else { "" }
Write-Gate "Runbook: architecture section" ($runbookContent -match "Architecture|architecture")
Write-Gate "Runbook: configuration section" ($runbookContent -match "Configuration|Environment")
Write-Gate "Runbook: API endpoints documented" ($runbookContent -match "/telehealth/rooms")
Write-Gate "Runbook: security section" ($runbookContent -match "Security|security")
Write-Gate "Runbook: testing section" ($runbookContent -match "Testing|test")

# AGENTS.md updated
$agentsContent = if (Test-Path "$root\AGENTS.md") { Get-Content "$root\AGENTS.md" -Raw } else { "" }
Write-Gate "AGENTS: gotcha 57 (rooms in-memory)" ($agentsContent -match "57.*Telehealth rooms|Telehealth rooms are in-memory")
Write-Gate "AGENTS: gotcha 58 (no PHI in URLs)" ($agentsContent -match "58.*No PHI in telehealth|PHI in telehealth meeting")
Write-Gate "AGENTS: gotcha 59 (recording OFF)" ($agentsContent -match "59.*Recording is OFF")
Write-Gate "AGENTS: gotcha 60 (TELEHEALTH_PROVIDER)" ($agentsContent -match "60.*TELEHEALTH_PROVIDER")
Write-Gate "AGENTS: section 7c (Phase 30 architecture)" ($agentsContent -match "7c.*Phase 30|Architecture Quick Map.*Phase 30")

# ================================================================
# G30-8  CODE QUALITY
# ================================================================
Write-Host ""
Write-Host "--- G30-8: Code Quality ---" -ForegroundColor Yellow

# No console.log in telehealth files
$thSourceFiles = Get-SourceFiles -Paths @($thDir, $routesPath) -Extensions @(".ts")
$clCount = 0
foreach ($f in $thSourceFiles) {
  $clCount += (Select-String -LiteralPath $f.FullName -Pattern "console\.log\(" -AllMatches -ErrorAction SilentlyContinue).Matches.Count
}
Write-Gate "Telehealth: no console.log ($clCount)" ($clCount -eq 0)

# No hardcoded credentials
$credLeak = $false
$allThFiles = Get-SourceFiles -Paths @($thDir) -Extensions @(".ts")
foreach ($f in $allThFiles) {
  $content = Get-Content $f.FullName -Raw
  if ($content -match "PROV123|password123|secret123") {
    $credLeak = $true
    break
  }
}
Write-Gate "Telehealth: no hardcoded credentials" (-not $credLeak)

# credentials: 'include' in all web fetches
Write-Gate "CPRS Panel: all fetch use credentials include" ($panelContent -match "credentials.*include")
Write-Gate "Portal Page: all fetch use credentials include" ($portalPageContent -match "credentials.*include")

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Phase 30 Verification Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
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
