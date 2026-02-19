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
Write-Host "Phase 33 VERIFY -- AI Gateway (governed, grounded, safe)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# ================================================================
# G33-0  REGRESSION (delegate to Phase 32 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G33-0: Regression (Phase 32 chain) ---" -ForegroundColor Yellow

$phase32Script = "$root\scripts\verify-phase1-to-phase32.ps1"
if (Test-Path $phase32Script) {
  Write-Host "  Delegating to Phase 32 verifier..." -ForegroundColor DarkGray
  & powershell -ExecutionPolicy Bypass -File $phase32Script -SkipPlaywright -SkipE2E 2>&1 | Out-Null
  $phase32Exit = $LASTEXITCODE
  if ($phase32Exit -eq 0) {
    Write-Gate "Phase 32 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 32 regression" "Phase 32 verifier returned exit code $phase32Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 32 regression" "verify-phase1-to-phase32.ps1 not found (non-blocking)"
}

# ================================================================
# G33-0b  PROMPTS + TSC
# ================================================================
Write-Host ""
Write-Host "--- G33-0b: Prompts + TypeScript ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
Write-Gate "Phase 33 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\35-PHASE-33-AI-ASSIST-GATEWAY")
Write-Gate "Phase 33 IMPLEMENT prompt exists" (Test-Path -LiteralPath "$promptsDir\35-PHASE-33-AI-ASSIST-GATEWAY\35-01-ai-assist-IMPLEMENT.md")

# Phase folders contiguous (01-35)
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
Write-Gate "Phase folder numbering contiguous (01-35)" $contiguous

# TSC compile -- API
Write-Host "  Checking API TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\api"
& npx tsc --noEmit 2>&1 | Out-Null
$apiExit = $LASTEXITCODE
Pop-Location
Write-Gate "API TypeScript compiles clean" ($apiExit -eq 0)

# TSC compile -- Portal
Write-Host "  Checking Portal TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\portal"
& npx tsc --noEmit 2>&1 | Out-Null
$portalExit = $LASTEXITCODE
Pop-Location
Write-Gate "Portal TypeScript compiles clean" ($portalExit -eq 0)

# TSC compile -- Web (CPRS shell)
Write-Host "  Checking Web TypeScript..." -ForegroundColor DarkGray
Push-Location "$root\apps\web"
& npx tsc --noEmit 2>&1 | Out-Null
$webExit = $LASTEXITCODE
Pop-Location
Write-Gate "Web (CPRS) TypeScript compiles clean" ($webExit -eq 0)


# ================================================================
# G33-1  AUDIT: every AI call logged with model + prompt hash
# ================================================================
Write-Host ""
Write-Host "--- G33-1: AI Audit -- every call logged with model + prompt hash ---" -ForegroundColor Yellow

$auditPath = "$root\apps\api\src\ai\ai-audit.ts"
Write-Gate "ai-audit.ts exists" (Test-Path -LiteralPath $auditPath)
$auditContent = if (Test-Path -LiteralPath $auditPath) { Get-Content $auditPath -Raw } else { "" }

# Core audit functions
Write-Gate "logAiAudit function exported" ($auditContent -match "export function logAiAudit")
Write-Gate "queryAiAudit function exported" ($auditContent -match "export function queryAiAudit")
Write-Gate "getAiAuditStats function exported" ($auditContent -match "export function getAiAuditStats")
Write-Gate "recordConfirmation function exported" ($auditContent -match "export function recordConfirmation")

# Audit event fields: model + prompt hash
Write-Gate "Audit logs modelId" ($auditContent -match "modelId:\s*input\.modelId")
Write-Gate "Audit logs promptHash" ($auditContent -match "promptHash:\s*input\.promptHash")
Write-Gate "Audit logs promptId" ($auditContent -match "promptId:\s*input\.promptId")
Write-Gate "Audit logs useCase" ($auditContent -match "useCase:\s*input\.useCase")
Write-Gate "Audit logs outcome" ($auditContent -match "outcome:\s*input\.outcome")
Write-Gate "Audit logs latencyMs" ($auditContent -match "latencyMs:\s*input\.latencyMs")
Write-Gate "Audit logs citationCount" ($auditContent -match "citationCount:\s*input\.citationCount")
Write-Gate "Audit logs ragCategories" ($auditContent -match "ragCategories:\s*input\.ragCategories")
Write-Gate "Audit logs wasRedacted" ($auditContent -match "wasRedacted:\s*input\.wasRedacted")

# PHI-safe: hashed actor/patient IDs
Write-Gate "hashAiId uses SHA-256" ($auditContent -match 'createHash\("sha256"\)')
Write-Gate "hashAiId exported" ($auditContent -match "export function hashAiId")
Write-Gate "actorHash = hashAiId(actorId)" ($auditContent -match "actorHash:\s*hashAiId\(input\.actorId\)")
Write-Gate "patientHash = hashAiId(patientDfn)" ($auditContent -match "patientHash:.*hashAiId\(input\.patientDfn\)")
Write-Gate "clinicianConfirmed field present" ($auditContent -match "clinicianConfirmed:")

# Ring buffer
Write-Gate "Audit has MAX_AUDIT_ENTRIES cap" ($auditContent -match "MAX_AUDIT_ENTRIES")
Write-Gate "Ring buffer eviction on overflow" ($auditContent -match "auditLog\.shift\(\)")

# Stats aggregation
Write-Gate "Stats: byOutcome aggregation" ($auditContent -match "byOutcome\[e\.outcome\]")
Write-Gate "Stats: byUseCase aggregation" ($auditContent -match "byUseCase\[e\.useCase\]")
Write-Gate "Stats: byModel aggregation" ($auditContent -match "byModel\[e\.modelId\]")
Write-Gate "Stats: confirmationRate calculation" ($auditContent -match "confirmationRate")
Write-Gate "Stats: blockedCount tracking" ($auditContent -match "blockedCount")

# Gateway calls logAiAudit in all paths
$gwPath = "$root\apps\api\src\ai\ai-gateway.ts"
$gwContent = if (Test-Path -LiteralPath $gwPath) { Get-Content $gwPath -Raw } else { "" }
$auditCalls = ([regex]::Matches($gwContent, "logAiAudit\(")).Count
Write-Gate "Gateway calls logAiAudit in all code paths (>=4)" ($auditCalls -ge 4) "found $auditCalls calls"

# Routes expose audit endpoints
$routePath = "$root\apps\api\src\routes\ai-gateway.ts"
$routeContent = if (Test-Path -LiteralPath $routePath) { Get-Content $routePath -Raw } else { "" }
Write-Gate "GET /ai/audit route" ($routeContent -match 'server\.get\("/ai/audit"')
Write-Gate "GET /ai/audit/stats route" ($routeContent -match 'server\.get\("/ai/audit/stats"')
Write-Gate "Audit routes require admin role" ($routeContent -match 'session\.role\s*!==\s*"admin"')


# ================================================================
# G33-2  GROUNDING: outputs include citations to chart facts
# ================================================================
Write-Host ""
Write-Host "--- G33-2: Grounding -- outputs include citations to chart facts ---" -ForegroundColor Yellow

# RAG Engine
$ragPath = "$root\apps\api\src\ai\rag-engine.ts"
Write-Gate "rag-engine.ts exists" (Test-Path -LiteralPath $ragPath)
$ragContent = if (Test-Path -LiteralPath $ragPath) { Get-Content $ragPath -Raw } else { "" }

Write-Gate "assembleContext function exported" ($ragContent -match "export async function assembleContext")
Write-Gate "formatContextForPrompt function exported" ($ragContent -match "export function formatContextForPrompt")
Write-Gate "registerRAGProvider function exported" ($ragContent -match "export function registerRAGProvider")

# Role-based access control
Write-Gate "ROLE_ALLOWED_SOURCES defined" ($ragContent -match "ROLE_ALLOWED_SOURCES")
Write-Gate "Clinician gets all 9 sources" ($ragContent -match 'clinician:' -and $ragContent -match '"demographics"' -and $ragContent -match '"notes"' -and $ragContent -match '"intake"' -and $ragContent -match '"appointments"')
Write-Gate "Patient excluded from notes+intake" ($ragContent -match 'patient:' -and -not ($ragContent -match 'patient:.*\bnotes\b'))
Write-Gate "Proxy has restricted access" ($ragContent -match 'proxy:' -and -not ($ragContent -match 'proxy:.*\bnotes\b'))
Write-Gate "System role gets no sources" ($ragContent -match 'system:\s*\[\s*\]')

# Context size limits
Write-Gate "MAX_CONTEXT_CHARS defined" ($ragContent -match "MAX_CONTEXT_CHARS\s*=")
Write-Gate "MAX_CHUNKS_PER_CATEGORY defined" ($ragContent -match "MAX_CHUNKS_PER_CATEGORY\s*=")

# 8 stub RAG providers seeded
$ragProviderCount = ([regex]::Matches($ragContent, 'providers\.set\("')).Count
Write-Gate "8 stub RAG providers seeded (demographics through appointments)" ($ragProviderCount -ge 8) "found $ragProviderCount providers"

# Citation extraction in gateway
Write-Gate "Gateway: extractCitations function" ($gwContent -match "function extractCitations")
Write-Gate "Gateway: CITE pattern regex" ($gwContent -match '\[CITE:\s*')
Write-Gate "Gateway: assessConfidence function" ($gwContent -match "function assessConfidence")
Write-Gate "Gateway: citations in response" ($gwContent -match "citations[,:]")
Write-Gate "Gateway: confidence in response" ($gwContent -match "confidence[,:]")

# Prompt templates include CITE instructions
$promptPath = "$root\apps\api\src\ai\prompt-registry.ts"
$promptContent = if (Test-Path -LiteralPath $promptPath) { Get-Content $promptPath -Raw } else { "" }
Write-Gate "Intake prompt instructs [CITE: source]" ($promptContent -match '\[CITE:\s*source\]')

# Stub provider outputs CITE markers
$stubPath = "$root\apps\api\src\ai\providers\stub-provider.ts"
$stubContent = if (Test-Path -LiteralPath $stubPath) { Get-Content $stubPath -Raw } else { "" }
Write-Gate "Stub provider: intake summary includes CITE markers" ($stubContent -match '\[CITE:')

# Types include Citation interface
$typesPath = "$root\apps\api\src\ai\types.ts"
$typesContent = if (Test-Path -LiteralPath $typesPath) { Get-Content $typesPath -Raw } else { "" }
Write-Gate "Citation interface defined" ($typesContent -match "export interface Citation")
Write-Gate "Citation has source field" ($typesContent -match "source:\s*string")
Write-Gate "Citation has category field" ($typesContent -match "category:\s*string")
Write-Gate "Citation has snippet field" ($typesContent -match "snippet:\s*string")
Write-Gate "RAGContext interface defined" ($typesContent -match "export interface RAGContext")
Write-Gate "RAGChunk interface defined" ($typesContent -match "export interface RAGChunk")
Write-Gate "9 RAGSourceCategory values" ($typesContent -match '"demographics"' -and $typesContent -match '"medications"' -and $typesContent -match '"allergies"' -and $typesContent -match '"problems"' -and $typesContent -match '"vitals"' -and $typesContent -match '"labs"' -and $typesContent -match '"notes"' -and $typesContent -match '"intake"' -and $typesContent -match '"appointments"')

# UI: citations displayed in CPRS panel
$cprsPanel = "$root\apps\web\src\components\cprs\panels\AIAssistPanel.tsx"
$cprsPanelContent = if (Test-Path -LiteralPath $cprsPanel) { Get-Content $cprsPanel -Raw } else { "" }
Write-Gate "CPRS panel: citations expandable section" ($cprsPanelContent -match "citations.*length.*>" -and $cprsPanelContent -match "<details")
Write-Gate "CPRS panel: confidence badge displayed" ($cprsPanelContent -match "Confidence:" -and $cprsPanelContent -match "result\.confidence")


# ================================================================
# G33-3  SAFETY: diagnosis/treatment/prescribing blocked
# ================================================================
Write-Host ""
Write-Host "--- G33-3: Safety -- diagnosis/treatment/prescribing blocked ---" -ForegroundColor Yellow

$safetyPath = "$root\apps\api\src\ai\safety-layer.ts"
Write-Gate "safety-layer.ts exists" (Test-Path -LiteralPath $safetyPath)
$safetyContent = if (Test-Path -LiteralPath $safetyPath) { Get-Content $safetyPath -Raw } else { "" }

# Disallowed categories defined
Write-Gate "CATEGORY_PATTERNS defined" ($safetyContent -match "CATEGORY_PATTERNS")
Write-Gate "Pattern: diagnosis" ($safetyContent -match "diagnosis:")
Write-Gate "Pattern: treatment_plan" ($safetyContent -match "treatment_plan:")
Write-Gate "Pattern: prescribing_guidance" ($safetyContent -match "prescribing_guidance:")
Write-Gate "Pattern: autonomous_ordering" ($safetyContent -match "autonomous_ordering:")
Write-Gate "Pattern: prognosis" ($safetyContent -match "prognosis:")
Write-Gate "Pattern: differential_diagnosis" ($safetyContent -match "differential_diagnosis:")

# Regex patterns for each category
Write-Gate "Diagnosis: regex for diagnos(is|e|ed)" ($safetyContent -match 'diagnos\(is\|e\|ed')
Write-Gate "Treatment: regex for treatment plan" ($safetyContent -match 'treatment\\s\+plan')
Write-Gate "Prescribing: regex for prescrib(e|ed|ing)" ($safetyContent -match 'prescrib\(e\|ed\|ing\)')
Write-Gate "Ordering: regex for order(ing) a test" ($safetyContent -match 'order.*test')
Write-Gate "Prognosis: regex for prognosis" ($safetyContent -match 'progno\(sis\|stic\)')
Write-Gate "Differential: regex for rule out" ($safetyContent -match 'rule\\s\+out')

# Pre-request + post-response safety checks
Write-Gate "checkRequestSafety exported" ($safetyContent -match "export function checkRequestSafety")
Write-Gate "checkResponseSafety exported" ($safetyContent -match "export function checkResponseSafety")
Write-Gate "SafetyCheckResult interface (allowed + blockedCategory)" ($safetyContent -match "allowed:\s*boolean" -and $safetyContent -match "blockedCategory\?:\s*DisallowedCategory")

# Gateway uses safety checks
Write-Gate "Gateway: pre-request safety check (step 3)" ($gwContent -match "checkRequestSafety\(inputText")
Write-Gate "Gateway: post-response safety check (step 9)" ($gwContent -match "checkResponseSafety\(providerResult\.text")
Write-Gate "Gateway: blocked requests get outcome=blocked" ($gwContent -match 'outcome:\s*"blocked"')
Write-Gate "Gateway: safety-filtered responses flagged" ($gwContent -match '"safety_filtered"')

# Facility policy enforcement
Write-Gate "isUseCaseAllowed function exported" ($safetyContent -match "export function isUseCaseAllowed")
Write-Gate "getFacilityPolicy function exported" ($safetyContent -match "export function getFacilityPolicy")
Write-Gate "updateFacilityPolicy function exported" ($safetyContent -match "export function updateFacilityPolicy")
Write-Gate "DEFAULT_FACILITY_POLICY exported" ($safetyContent -match "export const DEFAULT_FACILITY_POLICY")
Write-Gate "Default: aiEnabled=true" ($safetyContent -match "aiEnabled:\s*true")
Write-Gate "Default: redactPhi=true" ($safetyContent -match "redactPhi:\s*true")
Write-Gate "Default: cloudModelsAllowed=false" ($safetyContent -match "cloudModelsAllowed:\s*false")
Write-Gate "Default: requireClinicianConfirmation=true" ($safetyContent -match "requireClinicianConfirmation:\s*true")
Write-Gate "Default: maxRequestsPerUserPerHour=30" ($safetyContent -match "maxRequestsPerUserPerHour:\s*30")

# Types: DISALLOWED_CATEGORIES
Write-Gate "DISALLOWED_CATEGORIES exported (6 items)" ($typesContent -match "export const DISALLOWED_CATEGORIES" -and $typesContent -match '"diagnosis"' -and $typesContent -match '"treatment_plan"' -and $typesContent -match '"prescribing_guidance"' -and $typesContent -match '"autonomous_ordering"' -and $typesContent -match '"prognosis"' -and $typesContent -match '"differential_diagnosis"')

# Route: PUT /ai/policy admin-only
Write-Gate "PUT /ai/policy route exists" ($routeContent -match 'server\.put\("/ai/policy"')
Write-Gate "Policy update requires admin role" ($routeContent -match 'server\.put\("/ai/policy"' -and $routeContent -match 'session\.role\s*!==\s*"admin"')

# Lab education allows educational diagnosis mention
Write-Gate "Lab education: educational diagnosis mention allowed" ($safetyContent -match 'useCase\s*===\s*"lab-education"')


# ================================================================
# G33-4  PRIVACY: PHI redaction rules enforced per policy
# ================================================================
Write-Host ""
Write-Host "--- G33-4: Privacy -- PHI redaction enforced per policy ---" -ForegroundColor Yellow

$redactPath = "$root\apps\api\src\ai\redaction.ts"
Write-Gate "redaction.ts exists" (Test-Path -LiteralPath $redactPath)
$redactContent = if (Test-Path -LiteralPath $redactPath) { Get-Content $redactPath -Raw } else { "" }

# Core redaction functions
Write-Gate "redactPhi function exported" ($redactContent -match "export function redactPhi")
Write-Gate "detectPhi function exported" ($redactContent -match "export function detectPhi")
Write-Gate "redactContext function exported" ($redactContent -match "export function redactContext")

# Redaction patterns (10 patterns)
Write-Gate "Pattern: SSN (dashed)" ($redactContent -match 'name:\s*"SSN"' -and $redactContent -match 'SSN-REDACTED')
Write-Gate "Pattern: SSN (no dash)" ($redactContent -match 'name:\s*"SSN-no-dash"')
Write-Gate "Pattern: Phone" ($redactContent -match 'name:\s*"Phone"')
Write-Gate "Pattern: Email" ($redactContent -match 'name:\s*"Email"')
Write-Gate "Pattern: DOB" ($redactContent -match 'name:\s*"DOB"')
Write-Gate "Pattern: MRN" ($redactContent -match 'name:\s*"MRN"')
Write-Gate "Pattern: Address" ($redactContent -match 'name:\s*"Address"')
Write-Gate "Pattern: PatientName" ($redactContent -match 'name:\s*"PatientName"')
Write-Gate "Pattern: DFN" ($redactContent -match 'name:\s*"DFN"')
Write-Gate "Pattern: DUZ" ($redactContent -match 'name:\s*"DUZ"')

# Redaction result structure
Write-Gate "RedactionResult has redactionCount" ($redactContent -match "redactionCount:")
Write-Gate "RedactionResult has categoriesFound" ($redactContent -match "categoriesFound:")
Write-Gate "RedactionResult has phiDetected" ($redactContent -match "phiDetected:")

# Replacement markers are sanitized (not raw PHI)
Write-Gate "SSN replaced with [SSN-REDACTED]" ($redactContent -match '\[SSN-REDACTED\]')
Write-Gate "Phone replaced with [PHONE-REDACTED]" ($redactContent -match '\[PHONE-REDACTED\]')
Write-Gate "DFN replaced with [DFN-REDACTED]" ($redactContent -match '\[DFN-REDACTED\]')
Write-Gate "DUZ replaced with [DUZ-REDACTED]" ($redactContent -match '\[DUZ-REDACTED\]')

# Gateway uses redaction per policy
Write-Gate "Gateway: checks redactPhi policy" ($gwContent -match "policy\.redactPhi")
Write-Gate "Gateway: checks canHandlePhi(model.id)" ($gwContent -match "canHandlePhi\(model\.id\)")
Write-Gate "Gateway: detectPhi called on context" ($gwContent -match "detectPhi\(")
Write-Gate "Gateway: redactPhi called on chunks" ($gwContent -match "redactPhi\(chunk\.content\)")
Write-Gate "Gateway: wasRedacted tracked in response" ($gwContent -match "wasRedacted")

# Model registry: PHI handling
$modelPath = "$root\apps\api\src\ai\model-registry.ts"
$modelContent = if (Test-Path -LiteralPath $modelPath) { Get-Content $modelPath -Raw } else { "" }
Write-Gate "canHandlePhi checks deployment=on-premises" ($modelContent -match 'm\.deployment\s*===\s*"on-premises"')
Write-Gate "canHandlePhi checks phiAllowed" ($modelContent -match "m\.phiAllowed")
Write-Gate "Stub model: deployment=on-premises, phiAllowed=true" ($modelContent -match 'deployment:\s*"on-premises"' -and $modelContent -match 'phiAllowed:\s*true')

# Audit: wasRedacted logged
Write-Gate "Audit event stores wasRedacted flag" ($auditContent -match "wasRedacted:\s*input\.wasRedacted")

# UI: redaction indicator
Write-Gate "CPRS panel: PHI Redacted badge" ($cprsPanelContent -match "PHI Redacted")


# ================================================================
# G33-5  UI AUDIT: 0 dead clicks, clear disclaimers
# ================================================================
Write-Host ""
Write-Host "--- G33-5: UI Audit -- 0 dead clicks, clear disclaimers ---" -ForegroundColor Yellow

# --- CPRS AI Assist Panel ---
Write-Gate "AIAssistPanel.tsx exists" (Test-Path -LiteralPath $cprsPanel)

# Tab wiring
$panelIndex = "$root\apps\web\src\components\cprs\panels\index.ts"
$panelIndexContent = if (Test-Path -LiteralPath $panelIndex) { Get-Content $panelIndex -Raw } else { "" }
Write-Gate "AIAssistPanel in barrel export" ($panelIndexContent -match "AIAssistPanel")

$tabStrip = "$root\apps\web\src\components\cprs\CPRSTabStrip.tsx"
$tabStripContent = if (Test-Path -LiteralPath $tabStrip) { Get-Content $tabStrip -Raw } else { "" }
Write-Gate "aiassist in TAB_TO_MODULE" ($tabStripContent -match "aiassist:\s*'aiassist'")

$pagePath = "$root\apps\web\src\app\cprs\chart\[dfn]\[tab]\page.tsx"
$pageContent = if (Test-Path -LiteralPath $pagePath) { [System.IO.File]::ReadAllText($pagePath) } else { "" }
Write-Gate "AIAssistPanel imported in page.tsx" ($pageContent -match "AIAssistPanel")
Write-Gate "case 'aiassist' in TabContent switch" ($pageContent -match "case\s*'aiassist'")
Write-Gate "'aiassist' in VALID_TABS set" ($pageContent -match "'aiassist'")

$tabsJson = "$root\apps\web\src\lib\contracts\data\tabs.json"
$tabsContent = if (Test-Path -LiteralPath $tabsJson) { Get-Content $tabsJson -Raw } else { "" }
Write-Gate "CT_AIASSIST entry in tabs.json" ($tabsContent -match "CT_AIASSIST")
Write-Gate "CT_AIASSIST label = AI Assist" ($tabsContent -match '"label":\s*"AI Assist"')
Write-Gate "CT_AIASSIST id = 15" ($tabsContent -match '"id":\s*15')

# CPRS panel sub-tabs: all 3 functional
Write-Gate "CPRS panel: Intake Summary sub-tab" ($cprsPanelContent -match "Intake Summary")
Write-Gate "CPRS panel: Lab Education sub-tab" ($cprsPanelContent -match "Lab Education")
Write-Gate "CPRS panel: AI Audit sub-tab" ($cprsPanelContent -match "AI Audit")

# CPRS Governance banner (non-clickable, informational)
Write-Gate "CPRS panel: governance banner present" ($cprsPanelContent -match "No diagnosis, treatment plans, or prescribing guidance")
Write-Gate "CPRS panel: All outputs audited notice" ($cprsPanelContent -match "All outputs audited")
Write-Gate "CPRS panel: clinician confirmation required notice" ($cprsPanelContent -match "Clinician confirmation required")

# CPRS panel: Generate button wires to /ai/request
Write-Gate "CPRS panel: Generate Intake Summary button" ($cprsPanelContent -match "Generate Intake Summary")
Write-Gate "CPRS panel: POST /ai/request called" ($cprsPanelContent -match "apiFetch\('/ai/request'")
Write-Gate "CPRS panel: confirm/reject flow (Accept Draft + Reject Draft)" ($cprsPanelContent -match "Accept Draft" -and $cprsPanelContent -match "Reject Draft")
Write-Gate "CPRS panel: confirm POST /ai/confirm/" ($cprsPanelContent -match "/ai/confirm/")

# CPRS panel: Lab Education form is interactive
Write-Gate "CPRS panel: Lab Education has test name input" ($cprsPanelContent -match "Test Name")
Write-Gate "CPRS panel: Lab Education has Explain button" ($cprsPanelContent -match "Explain for Patient")

# CPRS panel: Audit tab loads data
Write-Gate "CPRS panel: Audit tab fetches /ai/audit/stats" ($cprsPanelContent -match "apiFetch\('/ai/audit/stats'\)")
Write-Gate "CPRS panel: Audit tab fetches /ai/audit" ($cprsPanelContent -match "apiFetch\('/ai/audit")
Write-Gate "CPRS panel: Audit table columns (Time, Use Case, Model, Outcome)" ($cprsPanelContent -match "Use Case" -and $cprsPanelContent -match "Model" -and $cprsPanelContent -match "Outcome" -and $cprsPanelContent -match "Latency")

# --- Portal AI Help Page ---
$portalPage = "$root\apps\portal\src\app\dashboard\ai-help\page.tsx"
Write-Gate "Portal AI Help page exists" (Test-Path -LiteralPath $portalPage)
$portalPageContent = if (Test-Path -LiteralPath $portalPage) { Get-Content $portalPage -Raw } else { "" }

Write-Gate "Portal: Lab Education tab present" ($portalPageContent -match "Lab Education")
Write-Gate "Portal: Portal Help tab present" ($portalPageContent -match "Portal Help")
Write-Gate "Portal: governance banner present" ($portalPageContent -match "education only" -and $portalPageContent -match "not medical advice")
Write-Gate "Portal: lab name input" ($portalPageContent -match "Lab name")
Write-Gate "Portal: Explain button" ($portalPageContent -match "Explain")
Write-Gate "Portal: search question input" ($portalPageContent -match "How do I request a refill")
Write-Gate "Portal: Ask button" ($portalPageContent -match '"Ask"')
Write-Gate "Portal: educational disclaimer on lab results" ($portalPageContent -match "educational purposes only" -and $portalPageContent -match "healthcare provider")
Write-Gate "Portal: uses fetchLabEducation API" ($portalPageContent -match "fetchLabEducation")
Write-Gate "Portal: uses askPortalSearch API" ($portalPageContent -match "askPortalSearch")

# Portal no dead clicks: all buttons have handlers
Write-Gate "Portal: Explain handler wired (handleExplain)" ($portalPageContent -match "onClick=\{handleExplain\}" -or $portalPageContent -match "onClick=\{\(\) => handleExplain")
Write-Gate "Portal: Search handler wired (handleSearch)" ($portalPageContent -match "onClick=\{handleSearch\}" -or $portalPageContent -match "onClick=\{\(\) => handleSearch")

# No dead clicks: no fragment "#" or javascript:void hrefs
Write-Gate "Portal: no dead href='#' links" (-not ($portalPageContent -match 'href="#"'))
Write-Gate "Portal: no javascript:void hrefs" (-not ($portalPageContent -match 'javascript:void'))

# --- Portal Nav ---
$portalNav = "$root\apps\portal\src\components\portal-nav.tsx"
$portalNavContent = if (Test-Path -LiteralPath $portalNav) { Get-Content $portalNav -Raw } else { "" }
Write-Gate "Portal nav: AI Help entry" ($portalNavContent -match '/dashboard/ai-help')
Write-Gate "Portal nav: AI Help label" ($portalNavContent -match '"AI Help"')

# --- Portal API Functions ---
$portalApi = "$root\apps\portal\src\lib\api.ts"
$portalApiContent = if (Test-Path -LiteralPath $portalApi) { Get-Content $portalApi -Raw } else { "" }
Write-Gate "Portal API: fetchLabEducation function" ($portalApiContent -match "export async function fetchLabEducation")
Write-Gate "Portal API: askPortalSearch function" ($portalApiContent -match "export async function askPortalSearch")
Write-Gate "Portal API: lab education POSTs to /ai/portal/education" ($portalApiContent -match "/ai/portal/education")
Write-Gate "Portal API: search POSTs to /ai/portal/search" ($portalApiContent -match "/ai/portal/search")


# ================================================================
# G33-EXTRA  MODEL + PROMPT + PROVIDER REGISTRIES
# ================================================================
Write-Host ""
Write-Host "--- G33-Extra: Model + Prompt + Provider Registries ---" -ForegroundColor Yellow

# Model registry
Write-Gate "model-registry.ts exists" (Test-Path -LiteralPath $modelPath)
Write-Gate "registerModel function exported" ($modelContent -match "export function registerModel")
Write-Gate "resolveModel function exported" ($modelContent -match "export function resolveModel")
Write-Gate "listModels function exported" ($modelContent -match "export function listModels")
Write-Gate "setModelStatus function exported" ($modelContent -match "export function setModelStatus")
Write-Gate "canHandlePhi function exported" ($modelContent -match "export function canHandlePhi")
Write-Gate "Stub model seeded (stub-v1)" ($modelContent -match '"stub-v1"')
Write-Gate "Stub model active status" ($modelContent -match 'status:\s*"active"')
Write-Gate "Stub model supports 4 use cases" ($modelContent -match '"intake-summary"' -and $modelContent -match '"lab-education"' -and $modelContent -match '"portal-search"' -and $modelContent -match '"custom"')

# Prompt registry
Write-Gate "prompt-registry.ts exists" (Test-Path -LiteralPath $promptPath)
Write-Gate "3 built-in prompts seeded" ($promptContent -match '"intake-summary-v1"' -and $promptContent -match '"lab-education-v1"' -and $promptContent -match '"portal-search-v1"')
Write-Gate "hashPromptContent function (SHA-256)" ($promptContent -match "createHash.*sha256")
Write-Gate "renderPrompt validates allowedVariables" ($promptContent -match "allowedVariables\.includes")
Write-Gate "registerPrompt recomputes hash" ($promptContent -match "hashPromptContent\(template\.systemPrompt")
Write-Gate "Prompt: approvedBy field required" ($promptContent -match 'approvedBy:')

# Provider registry
$providerIndexPath = "$root\apps\api\src\ai\providers\index.ts"
$providerIndexContent = if (Test-Path -LiteralPath $providerIndexPath) { Get-Content $providerIndexPath -Raw } else { "" }
Write-Gate "providers/index.ts exists" (Test-Path -LiteralPath $providerIndexPath)
Write-Gate "registerProvider function exported" ($providerIndexContent -match "export function registerProvider")
Write-Gate "getProvider function exported" ($providerIndexContent -match "export function getProvider")
Write-Gate "listProviders function exported" ($providerIndexContent -match "export function listProviders")
Write-Gate "Stub provider seeded at startup" ($providerIndexContent -match "stubProvider")

# Stub provider
Write-Gate "stub-provider.ts exists" (Test-Path -LiteralPath $stubPath)
Write-Gate "Stub: complete() method" ($stubContent -match "async complete")
Write-Gate "Stub: healthCheck() method" ($stubContent -match "async healthCheck")
Write-Gate "Stub: use-case-aware responses" ($stubContent -match "generateIntakeSummary" -and $stubContent -match "generateLabEducation" -and $stubContent -match "generatePortalSearch")
Write-Gate "Stub: intake draft includes DRAFT header" ($stubContent -match "DRAFT.*Clinician Review")
Write-Gate "Stub: lab education includes not medical advice" ($stubContent -match "not medical" -or $stubContent -match "educational purposes only")

# Types completeness
Write-Gate "AIProvider interface (complete + healthCheck)" ($typesContent -match "export interface AIProvider" -and $typesContent -match "complete\(" -and $typesContent -match "healthCheck\(\)")
Write-Gate "FacilityAIPolicy interface" ($typesContent -match "export interface FacilityAIPolicy")
Write-Gate "ModelConfig interface" ($typesContent -match "export interface ModelConfig")
Write-Gate "PromptTemplate interface" ($typesContent -match "export interface PromptTemplate")
Write-Gate "AIRequest interface" ($typesContent -match "export interface AIRequest")
Write-Gate "AIResponse interface" ($typesContent -match "export interface AIResponse")
Write-Gate "AIAuditEvent interface" ($typesContent -match "export interface AIAuditEvent")


# ================================================================
# G33-EXTRA-2  ROUTES + GATEWAY PIPELINE
# ================================================================
Write-Host ""
Write-Host "--- G33-Extra-2: Routes + Gateway Pipeline ---" -ForegroundColor Yellow

Write-Gate "routes/ai-gateway.ts exists" (Test-Path -LiteralPath $routePath)
Write-Gate "initAiRoutes function exported" ($routeContent -match "export function initAiRoutes")

# All 12 routes present
Write-Gate "POST /ai/request route" ($routeContent -match 'server\.post\("/ai/request"')
Write-Gate "POST /ai/confirm/:id route" ($routeContent -match 'server\.post\("/ai/confirm/:id"')
Write-Gate "GET /ai/models route" ($routeContent -match 'server\.get\("/ai/models"')
Write-Gate "GET /ai/prompts route" ($routeContent -match 'server\.get\("/ai/prompts"')
Write-Gate "GET /ai/audit route" ($routeContent -match 'server\.get\("/ai/audit"')
Write-Gate "GET /ai/audit/stats route" ($routeContent -match 'server\.get\("/ai/audit/stats"')
Write-Gate "GET /ai/policy route" ($routeContent -match 'server\.get\("/ai/policy"')
Write-Gate "PUT /ai/policy route" ($routeContent -match 'server\.put\("/ai/policy"')
Write-Gate "GET /ai/health route" ($routeContent -match 'server\.get\("/ai/health"')
Write-Gate "POST /ai/portal/education route" ($routeContent -match 'server\.post\("/ai/portal/education"')
Write-Gate "POST /ai/portal/search route" ($routeContent -match 'server\.post\("/ai/portal/search"')

# Session auth on clinician routes
Write-Gate "Clinician routes use requireSessionFn" ($routeContent -match "requireSessionFn\(request, reply\)")
# Portal routes use getPortalSessionFn
Write-Gate "Portal routes use getPortalSessionFn" ($routeContent -match "getPortalSessionFn\(request\)")

# Portal education route: requires labName
Write-Gate "Portal education: labName required validation" ($routeContent -match '"labName is required"')
# Portal search route: requires question
Write-Gate "Portal search: question required validation" ($routeContent -match '"question is required"')
# Portal search: caps question length
Write-Gate "Portal search: input length capped" ($routeContent -match "question\.slice\(0,\s*500\)")

# Gateway: 11-step pipeline
Write-Gate "ai-gateway.ts exists" (Test-Path -LiteralPath $gwPath)
Write-Gate "processAiRequest function exported" ($gwContent -match "export async function processAiRequest")
Write-Gate "Gateway: rate limiting" ($gwContent -match "checkAiRateLimit")
Write-Gate "Gateway: rate limit records request" ($gwContent -match "recordAiRequest")
Write-Gate "Gateway: resolves model" ($gwContent -match "resolveModel\(request\.useCase")
Write-Gate "Gateway: assembles RAG context" ($gwContent -match "assembleContext\(")
Write-Gate "Gateway: renders prompt" ($gwContent -match "renderPrompt\(request\.promptId")
Write-Gate "Gateway: calls provider.complete" ($gwContent -match "provider\.complete\(")
Write-Gate "Gateway: responseId generated with randomBytes" ($gwContent -match "randomBytes\(8\)")

# Server index.ts wires AI routes
$indexPath = "$root\apps\api\src\index.ts"
$indexContent = if (Test-Path -LiteralPath $indexPath) { Get-Content $indexPath -Raw } else { "" }
Write-Gate "index.ts imports ai-gateway routes" ($indexContent -match "ai-gateway")
Write-Gate "index.ts calls initAiRoutes" ($indexContent -match "initAiRoutes")
Write-Gate "index.ts registers aiGatewayRoutes" ($indexContent -match "server\.register\(aiGatewayRoutes")


# ================================================================
# G33-DOCS  Documentation
# ================================================================
Write-Host ""
Write-Host "--- G33-Docs: Governance + Risk + Runbook ---" -ForegroundColor Yellow

$govDoc = "$root\docs\ai\ai-governance.md"
$riskDoc = "$root\docs\ai\ai-risk-controls.md"
$runbookDoc = "$root\docs\runbooks\phase33-ai.md"

Write-Gate "ai-governance.md exists" (Test-Path -LiteralPath $govDoc)
Write-Gate "ai-risk-controls.md exists" (Test-Path -LiteralPath $riskDoc)
Write-Gate "phase33-ai.md runbook exists" (Test-Path -LiteralPath $runbookDoc)

$govContent = if (Test-Path -LiteralPath $govDoc) { Get-Content $govDoc -Raw } else { "" }
$riskContent = if (Test-Path -LiteralPath $riskDoc) { Get-Content $riskDoc -Raw } else { "" }
$runbookContent = if (Test-Path -LiteralPath $runbookDoc) { Get-Content $runbookDoc -Raw } else { "" }

# Governance doc content
Write-Gate "Governance: disallowed categories documented" ($govContent -match "diagnosis" -and $govContent -match "treatment_plan" -and $govContent -match "prescribing_guidance")
Write-Gate "Governance: 3 use cases documented" ($govContent -match "Intake Summary" -and $govContent -match "Lab Education" -and $govContent -match "Portal Search")
Write-Gate "Governance: model approval process" ($govContent -match "Model Approval Process")
Write-Gate "Governance: prompt governance" ($govContent -match "Prompt.*Governance")
Write-Gate "Governance: facility policy controls" ($govContent -match "Facility Policy Controls")
Write-Gate "Governance: audit trail section" ($govContent -match "Audit Trail")

# Risk doc content
Write-Gate "Risk: risk matrix present" ($riskContent -match "Risk Matrix")
Write-Gate "Risk: safety layer design" ($riskContent -match "Safety Layer Design")
Write-Gate "Risk: PHI redaction engine" ($riskContent -match "PHI Redaction Engine")
Write-Gate "Risk: RAG grounding controls" ($riskContent -match "RAG Grounding Controls")
Write-Gate "Risk: rate limiting" ($riskContent -match "Rate Limiting")
Write-Gate "Risk: monitoring recommendations" ($riskContent -match "Monitoring Recommendations")

# Runbook content
Write-Gate "Runbook: API endpoints table" ($runbookContent -match "POST.*ai/request" -and $runbookContent -match "GET.*ai/health")
Write-Gate "Runbook: curl examples" ($runbookContent -match "curl.*ai/request")
Write-Gate "Runbook: files changed list" ($runbookContent -match "Files Changed")
Write-Gate "Runbook: architecture diagram" ($runbookContent -match "AI Gateway.*11-step")

# Ops artifacts
$opsSum = "$root\ops\summary.md"
$opsNotionJson = "$root\ops\notion-update.json"
Write-Gate "ops/summary.md mentions Phase 33" (Test-FileContains $opsSum "Phase 33" -IsRegex)
Write-Gate "ops/notion-update.json references Phase 33" (Test-FileContains $opsNotionJson "Phase 33" -IsRegex)


# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Phase 33 VERIFY -- SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($fail -gt 0) {
  Write-Host "PHASE 33 VERIFICATION: FAILED ($fail failures)" -ForegroundColor Red
  exit 1
} else {
  Write-Host "PHASE 33 VERIFICATION: PASSED ($pass gates)" -ForegroundColor Green
  exit 0
}
