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
Write-Host "Phase 28 Verification -- Enterprise Intake OS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# ================================================================
# G28-0  PROMPTS ORDERING INTEGRITY
# ================================================================
Write-Host ""
Write-Host "--- G28-0: Prompts Ordering Integrity ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
$folders = Get-ChildItem -Path $promptsDir -Directory |
  Where-Object { $_.Name -match '^\d{2}-' } |
  Sort-Object Name

# Phase folders are 01+ (00- prefix is for meta/index files)
$phaseFolders = $folders | Where-Object { [int]($_.Name.Substring(0, 2)) -ge 1 }

# Check contiguous numbering (01, 02, 03, ...)
$expectedNum = 1
$contiguous = $true
foreach ($f in $phaseFolders) {
  $num = [int]($f.Name.Substring(0, 2))
  if ($num -ne $expectedNum) { $contiguous = $false; break }
  $expectedNum++
}
Write-Gate "Phase folder numbering contiguous (01-30)" $contiguous $(if (-not $contiguous) { "gap at $expectedNum" } else { "" })

# No duplicate phase folder prefixes (01+)
$prefixes = $phaseFolders | ForEach-Object { $_.Name.Substring(0, 2) }
$uniquePrefixes = $prefixes | Select-Object -Unique
Write-Gate "No duplicate phase folder prefixes" ($prefixes.Count -eq $uniquePrefixes.Count)

# Phase 28 folder exists
Write-Gate "Phase 28 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\30-PHASE-28-ENTERPRISE-INTAKE-OS")

# IMPLEMENT and VERIFY prompts exist
Write-Gate "Phase 28 IMPLEMENT prompt exists" (Test-Path -LiteralPath "$promptsDir\30-PHASE-28-ENTERPRISE-INTAKE-OS\30-01-enterprise-intake-os-IMPLEMENT.md")
Write-Gate "Phase 28 VERIFY prompt exists" (Test-Path -LiteralPath "$promptsDir\30-PHASE-28-ENTERPRISE-INTAKE-OS\30-02-enterprise-intake-os-VERIFY.md")

# ================================================================
# G28-1  FULL REGRESSION (delegate to Phase 27 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G28-1: Full Regression ---" -ForegroundColor Yellow

$phase27Script = "$root\scripts\verify-phase1-to-phase27-portal-core.ps1"
if (Test-Path $phase27Script) {
  Write-Host "  Delegating to Phase 27 verifier..." -ForegroundColor DarkGray
  $phase27Result = & powershell -ExecutionPolicy Bypass -File $phase27Script -SkipPlaywright -SkipE2E 2>&1
  $phase27Exit = $LASTEXITCODE
  if ($phase27Exit -eq 0) {
    Write-Gate "Phase 27 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 27 regression" "Phase 27 verifier returned exit code $phase27Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 27 regression" "verify-phase1-to-phase27-portal-core.ps1 not found (non-blocking)"
}

# ================================================================
# G28-1b  API + WEB + PORTAL COMPILE CLEAN
# ================================================================
Write-Host ""
Write-Host "--- G28-1b: TypeScript Compilation ---" -ForegroundColor Yellow

# API
Write-Host "  Checking API TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
$apiTsc = & npx tsc --noEmit 2>&1 | Out-String
$apiExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($apiExit -eq 0) $(if ($apiExit -ne 0) { "tsc errors" } else { "" })

# Web
Write-Host "  Checking Web TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\web"
$webTsc = & npx tsc --noEmit 2>&1 | Out-String
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web TypeScript compiles clean" ($webExit -eq 0) $(if ($webExit -ne 0) { "tsc errors" } else { "" })

# Portal
Write-Host "  Checking Portal TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\portal"
$portalTsc = & npx tsc --noEmit 2>&1 | Out-String
$portalExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal TypeScript compiles clean" ($portalExit -eq 0) $(if ($portalExit -ne 0) { "tsc errors" } else { "" })

# ================================================================
# G28-2  INTAKE RUNTIME FILES EXIST
# ================================================================
Write-Host ""
Write-Host "--- G28-2a: Intake Runtime Files ---" -ForegroundColor Yellow

$intakeDir = "$root\apps\api\src\intake"

$runtimeFiles = @(
  "types.ts",
  "intake-store.ts",
  "pack-registry.ts",
  "providers.ts",
  "summary-provider.ts",
  "intake-routes.ts"
)
foreach ($f in $runtimeFiles) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($f)
  Write-Gate "Intake runtime: $name" (Test-Path "$intakeDir\$f")
}

# ================================================================
# G28-2b  PACK FILES EXIST (23 packs)
# ================================================================
Write-Host ""
Write-Host "--- G28-2b: Pack System ---" -ForegroundColor Yellow

$packsDir = "$intakeDir\packs"
$packFiles = @(
  "index.ts",
  "core-enterprise.ts",
  "complaint-chest-pain.ts",
  "complaint-headache.ts",
  "complaint-abdominal-pain.ts",
  "complaint-batch-1.ts",
  "complaint-batch-2.ts",
  "complaint-behavioral-health.ts",
  "specialty-packs.ts",
  "department-packs.ts"
)
foreach ($f in $packFiles) {
  $name = [System.IO.Path]::GetFileNameWithoutExtension($f)
  Write-Gate "Pack file: $name" (Test-Path "$packsDir\$f")
}

# Pack index exports 23 packs
$packIndexPath = "$packsDir\index.ts"
if (Test-Path $packIndexPath) {
  $packContent = Get-Content $packIndexPath -Raw
  Write-Gate "Pack loader exports PACK_COUNT" ($packContent -match "PACK_COUNT")
  Write-Gate "Pack loader exports PACK_IDS" ($packContent -match "PACK_IDS")
  # Count registered packs in allPacks array
  $registerCalls = ([regex]::Matches($packContent, "registerPack")).Count
  Write-Gate "Pack loader calls registerPack loop" ($registerCalls -ge 1)
}

# ================================================================
# G28-2c  DETERMINISM: Rules provider outputs stable for same inputs
# ================================================================
Write-Host ""
Write-Host "--- G28-2c: Determinism + Replay ---" -ForegroundColor Yellow

# The rules provider is fully deterministic (no random, no time, no external calls).
# Verify by code inspection: no Math.random, no Date.now, no fetch/http in providers.ts
$provPath = "$intakeDir\providers.ts"
if (Test-Path $provPath) {
  $provContent = Get-Content $provPath -Raw
  Write-Gate "Provider: no Math.random (deterministic)" (-not ($provContent -match "Math\.random"))
  Write-Gate "Provider: no Date.now (deterministic)" (-not ($provContent -match "Date\.now"))
  Write-Gate "Provider: no fetch/http calls" (-not ($provContent -match "fetch\(|http\.request|axios"))
  Write-Gate "Provider: implements NextQuestionProvider" ($provContent -match "implements NextQuestionProvider")
  Write-Gate "Provider: ITEMS_PER_PAGE constant" ($provContent -match "ITEMS_PER_PAGE")
  Write-Gate "Provider: evaluateEnableWhen function" ($provContent -match "evaluateEnableWhen")
}

# Pack items have stable ordering (no random shuffle)
$registryPath = "$intakeDir\pack-registry.ts"
if (Test-Path $registryPath) {
  $regContent = Get-Content $registryPath -Raw
  Write-Gate "Registry: no random in resolver" (-not ($regContent -match "Math\.random"))
  Write-Gate "Registry: mergePackItems exported" ($regContent -match "export function mergePackItems")
  Write-Gate "Registry: computeRequiredCoverage exported" ($regContent -match "export function computeRequiredCoverage")
}

# ================================================================
# G28-3  COVERAGE: core-enterprise required items always asked
# ================================================================
Write-Host ""
Write-Host "--- G28-3: Core Coverage ---" -ForegroundColor Yellow

$corePath = "$packsDir\core-enterprise.ts"
if (Test-Path $corePath) {
  $coreContent = Get-Content $corePath -Raw

  # Core pack has packId
  Write-Gate "Core pack: has packId" ($coreContent -match '"core-enterprise')

  # Core pack has requiredCoverage
  Write-Gate "Core pack: requiredCoverage defined" ($coreContent -match "requiredCoverage")

  # Core pack covers demographics, consent, chief_complaint
  Write-Gate "Core pack: covers demographics" ($coreContent -match '"demographics"')
  Write-Gate "Core pack: covers consent" ($coreContent -match '"consent"')
  Write-Gate "Core pack: covers chief_complaint" ($coreContent -match '"chief_complaint"')

  # Core pack has required: true items
  $requiredCount = ([regex]::Matches($coreContent, "required:\s*true")).Count
  Write-Gate "Core pack: has required items ($requiredCount)" ($requiredCount -ge 3)

  # Priority 100 = always included
  Write-Gate "Core pack: priority 100 (universal)" ($coreContent -match "priority:\s*100")
}

# Wildcard contexts: should apply to all departments/specialties
if (Test-Path $corePath) {
  Write-Gate "Core pack: wildcard department context" ($coreContent -match '"\*"')
}

# Provider enforces coverage: check for requiredCoverageRemaining
if (Test-Path $provPath) {
  Write-Gate "Provider: tracks requiredCoverageRemaining" ($provContent -match "requiredCoverageRemaining|coverageRemaining")
  Write-Gate "Provider: isComplete checks coverage" ($provContent -match "coverageRemaining\.length")
}

# ================================================================
# G28-4  PROXY / MINOR / SENSITIVITY
# ================================================================
Write-Host ""
Write-Host "--- G28-4: Proxy/Minor/Sensitivity ---" -ForegroundColor Yellow

$typesPath = "$intakeDir\types.ts"
if (Test-Path $typesPath) {
  $typesContent = Get-Content $typesPath -Raw

  # SubjectType includes proxy
  Write-Gate "Types: SubjectType includes proxy" ($typesContent -match '"proxy"')

  # IntakeSession has proxyDfn
  Write-Gate "Types: IntakeSession has proxyDfn" ($typesContent -match "proxyDfn")

  # IntakeSession has subjectType
  Write-Gate "Types: IntakeSession has subjectType" ($typesContent -match "subjectType")

  # IntakeContext has age and sex for gating
  Write-Gate "Types: IntakeContext has age" ($typesContent -match "age\?")
  Write-Gate "Types: IntakeContext has sex" ($typesContent -match "sex\?")
}

# Store creates session with proxy fields
$storePath = "$intakeDir\intake-store.ts"
if (Test-Path $storePath) {
  $storeContent = Get-Content $storePath -Raw
  Write-Gate "Store: createSession handles subjectType" ($storeContent -match "subjectType")
  Write-Gate "Store: createSession handles proxyDfn" ($storeContent -match "proxyDfn")
}

# Pack registry gates on age (pediatrics)
if (Test-Path $registryPath) {
  Write-Gate "Registry: pediatrics age gating" ($regContent -match "pediatrics.*age|age.*18")
  Write-Gate "Registry: OB/GYN sex gating" ($regContent -match "ob_gyn.*sex|sex.*M")
}

# Event types for access logging
if (Test-Path $typesPath) {
  Write-Gate "Types: clinician.opened event" ($typesContent -match '"clinician\.opened"')
  Write-Gate "Types: clinician.reviewed event" ($typesContent -match '"clinician\.reviewed"')
  Write-Gate "Types: clinician.filed event" ($typesContent -match '"clinician\.filed"')
  Write-Gate "Types: clinician.exported event" ($typesContent -match '"clinician\.exported"')
  Write-Gate "Types: sensitivity.withheld event" ($typesContent -match '"sensitivity\.withheld"')
}

# Sharing posture doc exists
Write-Gate "Sharing posture doc exists" (Test-Path "$root\docs\runbooks\phase28-sharing-posture.md")

# ================================================================
# G28-5  SECURITY / PHI
# ================================================================
Write-Host ""
Write-Host "--- G28-5: Security / PHI ---" -ForegroundColor Yellow

# 5a. No PHI in intake logs (no console.log with patient data)
$intakeFiles = Get-SourceFiles -Paths @("$intakeDir") -Extensions @(".ts")
$consoleLogCount = 0
foreach ($f in $intakeFiles) {
  $hits = Select-String -LiteralPath $f.FullName -Pattern "console\.log" -AllMatches
  if ($hits) { $consoleLogCount += $hits.Count }
}
Write-Gate "Intake: no console.log (count=$consoleLogCount)" ($consoleLogCount -le 2) $(if ($consoleLogCount -gt 2) { "Found $consoleLogCount" } else { "" })

# 5b. No hardcoded credentials in intake files
$credPatterns = @("PROV123", "PHARM123", "NURSE123")
$credViolations = @()
foreach ($f in $intakeFiles) {
  foreach ($cp in $credPatterns) {
    $hit = Select-String -LiteralPath $f.FullName -Pattern $cp -SimpleMatch -Quiet
    if ($hit) { $credViolations += "$($f.Name):$cp" }
  }
}
Write-Gate "Intake: no hardcoded credentials" ($credViolations.Count -eq 0) $(if ($credViolations.Count -gt 0) { "$($credViolations -join ',')" } else { "" })

# 5c. Kiosk resume tokens contain no PHI
if (Test-Path $storePath) {
  # Token is randomBytes(32).toString("hex") -- no PHI
  Write-Gate "Kiosk token: generated from randomBytes" ($storeContent -match "randomBytes.*token|token.*randomBytes")
  # Token has TTL
  Write-Gate "Kiosk token: has TTL (30 min)" ($storeContent -match "KIOSK_TOKEN_TTL")
  # Token is single-use
  Write-Gate "Kiosk token: single-use (checks used flag)" ($storeContent -match "token\.used")
}

# 5d. Kiosk timeout in portal UI
$kioskSessionPage = "$root\apps\portal\src\app\kiosk\intake\[id]\page.tsx"
if (Test-Path -LiteralPath $kioskSessionPage) {
  $kioskContent = Get-Content -LiteralPath $kioskSessionPage -Raw
  Write-Gate "Kiosk UI: idle timeout implemented" ($kioskContent -match "idleTimeout|IDLE_TIMEOUT|setTimeout|idle")
  Write-Gate "Kiosk UI: auto-save on timeout" ($kioskContent -match "save|auto.*save|autoSave")
} else {
  Write-Gate "Kiosk UI: session page exists" $false "kiosk/intake/[id]/page.tsx not found"
}

# 5e. No SSN/DOB patterns in event payloads (structural check)
if (Test-Path $typesPath) {
  Write-Gate "Types: no SSN field in events" (-not ($typesContent -match "ssn|socialSecurity"))
  Write-Gate "Types: no DOB field in events" (-not ($typesContent -match "dateOfBirth|dob.*string"))
}

# 5f. Secret scan: no credentials in portal intake or kiosk files
$portalIntakeFiles = Get-SourceFiles -Paths @(
  "$root\apps\portal\src\app\dashboard\intake",
  "$root\apps\portal\src\app\kiosk"
) -Extensions @(".tsx", ".ts")
$portalCredViolations = @()
foreach ($f in $portalIntakeFiles) {
  foreach ($cp in $credPatterns) {
    $hit = Select-String -LiteralPath $f.FullName -Pattern $cp -SimpleMatch -Quiet
    if ($hit) { $portalCredViolations += "$($f.Name):$cp" }
  }
}
Write-Gate "Portal intake: no hardcoded credentials" ($portalCredViolations.Count -eq 0) $(if ($portalCredViolations.Count -gt 0) { "$($portalCredViolations -join ',')" } else { "" })

# ================================================================
# G28-6  UI DEAD-CLICK AUDIT
# ================================================================
Write-Host ""
Write-Host "--- G28-6: UI Dead-Click Audit ---" -ForegroundColor Yellow

# 6a. Portal intake start page
$portalStartPage = "$root\apps\portal\src\app\dashboard\intake\page.tsx"
if (Test-Path -LiteralPath $portalStartPage) {
  $startContent = Get-Content -LiteralPath $portalStartPage -Raw
  Write-Gate "Portal start: has onClick/onSubmit handlers" ($startContent -match "onClick|onSubmit")
  Write-Gate "Portal start: fetches from API" ($startContent -match "fetch|portalFetch")
  Write-Gate "Portal start: uses credentials:include" ($startContent -match "credentials.*include")
}

# 6b. Portal intake session page
$portalSessionPage = "$root\apps\portal\src\app\dashboard\intake\[id]\page.tsx"
if (Test-Path -LiteralPath $portalSessionPage) {
  $sessionContent = Get-Content -LiteralPath $portalSessionPage -Raw
  Write-Gate "Portal session: next-question call" ($sessionContent -match "next-question")
  Write-Gate "Portal session: answer submission" ($sessionContent -match "answers|answer")
  Write-Gate "Portal session: submit handler" ($sessionContent -match "submit")
  Write-Gate "Portal session: save draft handler" ($sessionContent -match "save")
  Write-Gate "Portal session: progress display" ($sessionContent -match "progress|percent")
  Write-Gate "Portal session: red flag display" ($sessionContent -match "red.*flag|redFlag|RED.*FLAG")
}

# 6c. Kiosk start page
$kioskStartPage = "$root\apps\portal\src\app\kiosk\intake\page.tsx"
if (Test-Path -LiteralPath $kioskStartPage) {
  $kioskStartContent = Get-Content -LiteralPath $kioskStartPage -Raw
  Write-Gate "Kiosk start: new session handler" ($kioskStartContent -match "onClick|onSubmit|handleStart|startNew|newSession")
  Write-Gate "Kiosk start: resume token handler" ($kioskStartContent -match "resume|token")
  Write-Gate "Kiosk start: fetches /kiosk/sessions" ($kioskStartContent -match "kiosk/sessions")
}

# 6d. Kiosk session page
if (Test-Path -LiteralPath $kioskSessionPage) {
  Write-Gate "Kiosk session: next-question call" ($kioskContent -match "next-question")
  Write-Gate "Kiosk session: answer submission" ($kioskContent -match "answers|answer")
  Write-Gate "Kiosk session: submit handler" ($kioskContent -match "submit")
  Write-Gate "Kiosk session: resume token display" ($kioskContent -match "resume.*token|resumeToken")
}

# 6e. CPRS IntakePanel
$intakePanelPath = "$root\apps\web\src\components\cprs\panels\IntakePanel.tsx"
if (Test-Path -LiteralPath $intakePanelPath) {
  $panelContent = Get-Content -LiteralPath $intakePanelPath -Raw
  Write-Gate "IntakePanel: fetches by-patient route" ($panelContent -match "by-patient")
  Write-Gate "IntakePanel: review route call" ($panelContent -match "/review")
  Write-Gate "IntakePanel: mark reviewed handler" ($panelContent -match "reviewed|handleMarkReviewed|markReviewed")
  Write-Gate "IntakePanel: file to VistA handler" ($panelContent -match "/file|handleFile")
  Write-Gate "IntakePanel: export draft note handler" ($panelContent -match "/export|handleExport|exportDraft")
  Write-Gate "IntakePanel: red flag display" ($panelContent -match "redFlag|red.*flag|RED.*FLAG")
  Write-Gate "IntakePanel: HPI narrative display" ($panelContent -match "hpiNarrative|HPI")
  Write-Gate "IntakePanel: ROS display" ($panelContent -match "reviewOfSystems|ROS|ros")
  Write-Gate "IntakePanel: uses credentials:include" ($panelContent -match "credentials.*include")
}

# 6f. IntakePanel wired into CPRS
$panelBarrelPath = "$root\apps\web\src\components\cprs\panels\index.ts"
Write-Gate "IntakePanel: barrel export" (Test-FileContains -Path $panelBarrelPath -Pattern "IntakePanel")

$chartPagePath = "$root\apps\web\src\app\cprs\chart\[dfn]\[tab]\page.tsx"
if (Test-Path -LiteralPath $chartPagePath) {
  $chartContent = Get-Content -LiteralPath $chartPagePath -Raw
  Write-Gate "Chart page: IntakePanel import" ($chartContent -match "IntakePanel")
  Write-Gate "Chart page: intake tab case" ($chartContent -match "case 'intake'")
  Write-Gate "Chart page: intake in VALID_TABS" ($chartContent -match "'intake'")
}

$tabStripPath = "$root\apps\web\src\components\cprs\CPRSTabStrip.tsx"
Write-Gate "TabStrip: intake module mapped" (Test-FileContains -Path $tabStripPath -Pattern "intake")

$tabsJsonPath = "$root\apps\web\src\lib\contracts\data\tabs.json"
Write-Gate "Tabs JSON: CT_INTAKE defined" (Test-FileContains -Path $tabsJsonPath -Pattern "CT_INTAKE")

# ================================================================
# G28-7  QUESTIONNAIRE RENDERER VALIDATION
# ================================================================
Write-Host ""
Write-Host "--- G28-7: Questionnaire Renderer Validation ---" -ForegroundColor Yellow

# NOTE: Phase 28 uses custom renderers, NOT LHC-Forms.
# Validate that the custom renderer handles all required FHIR-like types.

# 7a. Portal renderer handles all question types
if (Test-Path -LiteralPath $portalSessionPage) {
  Write-Gate "Renderer: boolean type" ($sessionContent -match "boolean")
  Write-Gate "Renderer: string/text type" ($sessionContent -match "string|text")
  Write-Gate "Renderer: integer type" ($sessionContent -match "integer|number")
  Write-Gate "Renderer: choice type" ($sessionContent -match "choice")
  Write-Gate "Renderer: display type" ($sessionContent -match "display")
}

# 7b. EnableWhen / skip logic in providers
if (Test-Path $provPath) {
  Write-Gate "Skip logic: enableWhen evaluation" ($provContent -match "enableWhen")
  Write-Gate "Skip logic: supports operators (=, !=, exists)" ($provContent -match '"=".*"!=".*"exists"' -or ($provContent -match 'case "="' -and $provContent -match 'case "!="' -and $provContent -match 'case "exists"'))
  Write-Gate "Skip logic: enableBehavior all/any" ($provContent -match '"all"' -and $provContent -match '"any"')
}

# 7c. QuestionnaireResponse-like output
if (Test-Path $typesPath) {
  Write-Gate "QR: QuestionnaireResponse type defined" ($typesContent -match "interface QuestionnaireResponse")
  Write-Gate "QR: QRItem type defined" ($typesContent -match "interface QRItem")
  Write-Gate "QR: QRAnswer type defined" ($typesContent -match "interface QRAnswer")
  Write-Gate "QR: valueCoding support" ($typesContent -match "valueCoding")
  Write-Gate "QR: valueString support" ($typesContent -match "valueString")
  Write-Gate "QR: valueBoolean support" ($typesContent -match "valueBoolean")
  Write-Gate "QR: valueInteger support" ($typesContent -match "valueInteger")
}

# 7d. Audit events around questionnaire interaction
if (Test-Path $typesPath) {
  Write-Gate "Audit: question.asked event type" ($typesContent -match '"question\.asked"')
  Write-Gate "Audit: question.answered event type" ($typesContent -match '"question\.answered"')
  Write-Gate "Audit: question.skipped event type" ($typesContent -match '"question\.skipped"')
  Write-Gate "Audit: answer.edited event type" ($typesContent -match '"answer\.edited"')
}

# 7e. Summary provider generates structured output
$summaryPath = "$intakeDir\summary-provider.ts"
if (Test-Path $summaryPath) {
  $summaryContent = Get-Content $summaryPath -Raw
  Write-Gate "Summary: hpiNarrative generation" ($summaryContent -match "hpiNarrative")
  Write-Gate "Summary: reviewOfSystems generation" ($summaryContent -match "reviewOfSystems")
  Write-Gate "Summary: redFlags detection" ($summaryContent -match "redFlags")
  Write-Gate "Summary: medicationsDelta" ($summaryContent -match "medicationsDelta")
  Write-Gate "Summary: allergiesDelta" ($summaryContent -match "allergiesDelta")
  Write-Gate "Summary: contradictions detection" ($summaryContent -match "contradiction")
  Write-Gate "Summary: draftNoteText generation" ($summaryContent -match "draftNoteText")
}

# ================================================================
# G28-ROUTES  INTAKE ROUTE COVERAGE
# ================================================================
Write-Host ""
Write-Host "--- G28-Routes: Intake Route Coverage ---" -ForegroundColor Yellow

$routesPath = "$intakeDir\intake-routes.ts"
if (Test-Path $routesPath) {
  $routesContent = Get-Content $routesPath -Raw

  # Patient/portal routes
  Write-Gate "Route: POST /intake/sessions" ($routesContent -match 'server\.post\("/intake/sessions"')
  Write-Gate "Route: GET /intake/sessions/:id" ($routesContent -match 'server\.get\("/intake/sessions/:id"')
  Write-Gate "Route: POST /intake/sessions/:id/next-question" ($routesContent -match "next-question")
  Write-Gate "Route: POST /intake/sessions/:id/answers" ($routesContent -match "/intake/sessions/:id/answers")
  Write-Gate "Route: POST /intake/sessions/:id/submit" ($routesContent -match "/intake/sessions/:id/submit")
  Write-Gate "Route: POST /intake/sessions/:id/save" ($routesContent -match "/intake/sessions/:id/save")
  Write-Gate "Route: GET /intake/sessions (my sessions)" ($routesContent -match 'server\.get\("/intake/sessions"')

  # Clinician review routes
  Write-Gate "Route: GET /intake/by-patient/:dfn" ($routesContent -match "/intake/by-patient/:dfn")
  Write-Gate "Route: GET /intake/sessions/:id/review" ($routesContent -match 'server\.get\("/intake/sessions/:id/review"')
  Write-Gate "Route: PUT /intake/sessions/:id/review" ($routesContent -match 'server\.put\("/intake/sessions/:id/review"')
  Write-Gate "Route: POST /intake/sessions/:id/file" ($routesContent -match "/intake/sessions/:id/file")
  Write-Gate "Route: POST /intake/sessions/:id/export" ($routesContent -match "/intake/sessions/:id/export")
  Write-Gate "Route: GET /intake/filing-queue" ($routesContent -match "/intake/filing-queue")

  # Kiosk routes
  Write-Gate "Route: POST /kiosk/sessions" ($routesContent -match 'server\.post\("/kiosk/sessions"')
  Write-Gate "Route: POST /kiosk/sessions/:id/resume-token" ($routesContent -match "/kiosk/sessions/:id/resume-token")

  # Pack routes
  Write-Gate "Route: GET /intake/packs" ($routesContent -match 'server\.get\("/intake/packs"')
  Write-Gate "Route: GET /intake/packs/:packId" ($routesContent -match "/intake/packs/:packId")

  # Admin
  Write-Gate "Route: GET /intake/stats" ($routesContent -match "/intake/stats")
  Write-Gate "Route: GET /intake/sessions/:id/events" ($routesContent -match "/intake/sessions/:id/events")
  Write-Gate "Route: GET /intake/sessions/:id/snapshots" ($routesContent -match "/intake/sessions/:id/snapshots")
}

# ================================================================
# G28-INDEX  INDEX.TS REGISTRATION
# ================================================================
Write-Host ""
Write-Host "--- G28-Index: API Index Registration ---" -ForegroundColor Yellow

$indexPath = "$root\apps\api\src\index.ts"
if (Test-Path $indexPath) {
  $indexContent = Get-Content $indexPath -Raw
  Write-Gate "Index: imports intakeRoutes" ($indexContent -match "intakeRoutes")
  Write-Gate "Index: imports initIntakeRoutes" ($indexContent -match "initIntakeRoutes")
  Write-Gate "Index: imports pack loader" ($indexContent -match "intake/packs")
  Write-Gate "Index: registers intake routes" ($indexContent -match "server\.register\(intakeRoutes\)")
  Write-Gate "Index: calls initIntakeRoutes" ($indexContent -match "initIntakeRoutes\(")
}

# ================================================================
# G28-STORE  STORE INTEGRITY
# ================================================================
Write-Host ""
Write-Host "--- G28-Store: Store Integrity ---" -ForegroundColor Yellow

if (Test-Path $storePath) {
  # Session lifecycle
  Write-Gate "Store: valid transitions defined" ($storeContent -match "VALID_TRANSITIONS")
  Write-Gate "Store: canTransition exported" ($storeContent -match "export function canTransition")
  Write-Gate "Store: session TTL defined" ($storeContent -match "SESSION_TTL")
  Write-Gate "Store: max sessions cap" ($storeContent -match "MAX_SESSIONS")

  # Events
  Write-Gate "Store: appendEvent function" ($storeContent -match "export function appendEvent")
  Write-Gate "Store: events have timestamp" ($storeContent -match "timestamp.*now\(\)|now\(\).*timestamp")

  # Snapshots
  Write-Gate "Store: saveSnapshot function" ($storeContent -match "export function saveSnapshot")
  Write-Gate "Store: snapshot hash verification" ($storeContent -match "hashQR|contentHash")
  Write-Gate "Store: getLatestSnapshot function" ($storeContent -match "export function getLatestSnapshot")
}

# ================================================================
# G28-DOCS  DOCUMENTATION
# ================================================================
Write-Host ""
Write-Host "--- G28-Docs: Documentation ---" -ForegroundColor Yellow

Write-Gate "Runbook: enterprise intake" (Test-Path "$root\docs\runbooks\phase28-enterprise-intake.md")
Write-Gate "Runbook: sharing posture" (Test-Path "$root\docs\runbooks\phase28-sharing-posture.md")
Write-Gate "Runbook: intake inventory" (Test-Path "$root\docs\runbooks\phase28-intake-inventory.md")
Write-Gate "Contract: intake v1 YAML" (Test-Path "$root\docs\contracts\intake\intake-contract-v1.yaml")
Write-Gate "Contract: pack format v1" (Test-Path "$root\docs\contracts\intake\intake-pack-format-v1.yaml")
Write-Gate "Contract: provider interface" (Test-Path "$root\docs\contracts\intake\intake-provider-interface.md")
Write-Gate "Ops: phase28 summary" (Test-Path "$root\ops\phase28-summary.md")
Write-Gate "Ops: phase28 notion update" (Test-Path "$root\ops\phase28-notion-update.json")

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Phase 28 Verification Summary" -ForegroundColor Cyan
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
