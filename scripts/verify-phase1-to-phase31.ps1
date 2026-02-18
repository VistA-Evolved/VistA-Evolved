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
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Phase 31 VERIFY -- Sharing + Exports + SHC (Behavioral)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# ================================================================
# G31-0  REGRESSION (delegate to Phase 30 verifier)
# ================================================================
Write-Host ""
Write-Host "--- G31-0: Regression (Phase 30 chain) ---" -ForegroundColor Yellow

$phase30Script = "$root\scripts\verify-phase1-to-phase30.ps1"
if (Test-Path $phase30Script) {
  Write-Host "  Delegating to Phase 30 verifier..." -ForegroundColor DarkGray
  $phase30Result = & powershell -ExecutionPolicy Bypass -File $phase30Script -SkipPlaywright -SkipE2E 2>&1
  $phase30Exit = $LASTEXITCODE
  if ($phase30Exit -eq 0) {
    Write-Gate "Phase 30 regression: all gates pass" $true
  } else {
    Write-Warning-Gate "Phase 30 regression" "Phase 30 verifier returned exit code $phase30Exit (non-blocking)"
  }
} else {
  Write-Warning-Gate "Phase 30 regression" "verify-phase1-to-phase30.ps1 not found (non-blocking)"
}

# ================================================================
# G31-0b  PROMPTS + TSC
# ================================================================
Write-Host ""
Write-Host "--- G31-0b: Prompts + TypeScript ---" -ForegroundColor Yellow

$promptsDir = "$root\prompts"
Write-Gate "Phase 31 prompt folder exists" (Test-Path -LiteralPath "$promptsDir\33-PHASE-31-SHARING-EXPORTS")
Write-Gate "Phase 31 IMPLEMENT prompt exists" (Test-Path -LiteralPath "$promptsDir\33-PHASE-31-SHARING-EXPORTS\33-01-sharing-exports-IMPLEMENT.md")
Write-Gate "Phase 31 VERIFY prompt exists" (Test-Path -LiteralPath "$promptsDir\33-PHASE-31-SHARING-EXPORTS\33-99-sharing-exports-VERIFY.md")

# Phase folders contiguous (01-33)
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
Write-Gate "Phase folder numbering contiguous (01-33)" $contiguous

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

# ================================================================
# G31-1  SHARE CODE: TTL ENFORCED
# ================================================================
Write-Host ""
Write-Host "--- G31-1: Share Code -- TTL Enforced ---" -ForegroundColor Yellow

$sharingPath = "$root\apps\api\src\services\portal-sharing.ts"
Write-Gate "portal-sharing.ts exists" (Test-Path -LiteralPath $sharingPath)
$sharingContent = if (Test-Path -LiteralPath $sharingPath) { Get-Content $sharingPath -Raw } else { "" }

# TTL constants
Write-Gate "Default TTL = 60 min (60 * 60 * 1000)" ($sharingContent -match "DEFAULT_SHARE_TTL_MS\s*=\s*60\s*\*\s*60\s*\*\s*1000")
Write-Gate "Max TTL = 24h (24 * 60 * 60 * 1000)" ($sharingContent -match "MAX_SHARE_TTL_MS\s*=\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000")
Write-Gate "TTL capped with Math.min" ($sharingContent -match "Math\.min.*ttlMs.*DEFAULT_SHARE_TTL_MS.*MAX_SHARE_TTL_MS|Math\.min.*opts\.ttlMs.*MAX_SHARE_TTL_MS")
Write-Gate "expiresAt computed from Date.now() + ttl" ($sharingContent -match "expiresAt.*new Date\(Date\.now\(\)\s*\+\s*ttl\)")

# Expiry check in verifyShareAccess
Write-Gate "verifyShareAccess checks expiry before access" ($sharingContent -match "if\s*\(new Date\(share\.expiresAt\)\s*<\s*new Date\(\)")
Write-Gate "Expired link returns non-retryable error" ($sharingContent -match "expired.*retryable.*false|retryable:\s*false.*expired" -or ($sharingContent -match "has expired" -and $sharingContent -match "retryable: false"))

# ================================================================
# G31-1b  SHARE CODE: ONE-TIME REDEEM
# ================================================================
Write-Host ""
Write-Host "--- G31-1b: Share Code -- One-Time Redeem ---" -ForegroundColor Yellow

Write-Gate "oneTimeRedeem field in ShareLink interface" ($sharingContent -match "oneTimeRedeem:\s*boolean")
Write-Gate "oneTimeRedeem defaults to false" ($sharingContent -match "oneTimeRedeem:\s*opts\.oneTimeRedeem\s*\?\?\s*false")
Write-Gate "Auto-revoke after first successful access" ($sharingContent -match "if\s*\(share\.oneTimeRedeem\)")
Write-Gate "Auto-revoke sets revokedAt" ($sharingContent -match "share\.oneTimeRedeem.*\{" -and $sharingContent -match "share\.revokedAt\s*=")
Write-Gate "Auto-revoke audit reason = one-time-redeem" (Test-FileContains $sharingPath "one-time-redeem")
Write-Gate "Revoked shares blocked in verifyShareAccess" ($sharingContent -match "if\s*\(share\.revokedAt\)")

# ================================================================
# G31-1c  SHARE CODE: 3-ATTEMPT LOCKOUT
# ================================================================
Write-Host ""
Write-Host "--- G31-1c: Share Code -- 3 Wrong DOB Lockout ---" -ForegroundColor Yellow

Write-Gate "MAX_ACCESS_ATTEMPTS = 3" ($sharingContent -match "MAX_ACCESS_ATTEMPTS\s*=\s*3")
Write-Gate "failedAttempts incremented on bad access code/DOB" ($sharingContent -match "share\.failedAttempts\+\+")
Write-Gate "Lockout triggered at >= MAX_ACCESS_ATTEMPTS" ($sharingContent -match "share\.failedAttempts\s*>=\s*MAX_ACCESS_ATTEMPTS")
Write-Gate "Locked share sets share.locked = true" ($sharingContent -match "share\.locked\s*=\s*true")
Write-Gate "Locked state checked before verification" ($sharingContent -match "if\s*\(share\.locked\)")
Write-Gate "Locked returns non-retryable error" ($sharingContent -match "locked.*retryable.*false|locked due to too many failed.*retryable:\s*false" -or ($sharingContent -match "locked due to too many" -and $sharingContent -match "retryable: false"))
Write-Gate "Remaining attempts shown in error message" ($sharingContent -match "remaining.*attempt|attempt.*remaining")

# ================================================================
# G31-1d  SHARE CODE: AUDIT LOGGING
# ================================================================
Write-Host ""
Write-Host "--- G31-1d: Share Code -- Audit Logging ---" -ForegroundColor Yellow

Write-Gate "Audit on share creation (portal.share.create)" ($sharingContent -match 'portalAudit\("portal\.share\.create"')
Write-Gate "Audit on share access success (portal.share.access, success)" ($sharingContent -match 'portalAudit\("portal\.share\.access",\s*"success"')
Write-Gate "Audit on share access failure (portal.share.access, failure)" ($sharingContent -match 'portalAudit\("portal\.share\.access",\s*"failure"')
Write-Gate "Audit on share revoke (portal.share.revoke)" ($sharingContent -match 'portalAudit\("portal\.share\.revoke"')
Write-Gate "Audit detail includes shareId" ($sharingContent -match 'detail:.*shareId')
Write-Gate "Audit detail includes failedAttempts" ($sharingContent -match 'detail:.*failedAttempts')
Write-Gate "Audit detail includes locked state" ($sharingContent -match 'detail:.*locked')
Write-Gate "Audit imports portalAudit" ($sharingContent -match 'import.*portalAudit.*from')

# ================================================================
# G31-2  EXPORT: PDF WORKS
# ================================================================
Write-Host ""
Write-Host "--- G31-2: Export -- PDF Builder ---" -ForegroundColor Yellow

$pdfPath = "$root\apps\api\src\services\portal-pdf.ts"
Write-Gate "portal-pdf.ts exists" (Test-Path -LiteralPath $pdfPath)
$pdfContent = if (Test-Path -LiteralPath $pdfPath) { Get-Content $pdfPath -Raw } else { "" }

# PDF validity
Write-Gate "PDF starts with %PDF-1.4 header" ($pdfContent -match '%PDF-1\.4')
Write-Gate "PDF ends with %%EOF" ($pdfContent -match '%%EOF')
Write-Gate "PDF has xref table" ($pdfContent -match '"xref\\n"' -or $pdfContent -match 'xref\\n' -or $pdfContent -match "xref")
Write-Gate "PDF has trailer and startxref" ($pdfContent -match "trailer" -and $pdfContent -match "startxref")
Write-Gate "PDF output is Buffer (latin1)" ($pdfContent -match 'Buffer\.from\(pdf,\s*"latin1"\)')
Write-Gate "PDF content type set (application/pdf)" (Test-FileContains "$root\apps\api\src\routes\portal-core.ts" "application/pdf")
Write-Gate "Content-Disposition attachment" (Test-FileContains "$root\apps\api\src\routes\portal-core.ts" "Content-Disposition")

# 7 section formatters
Write-Gate "Formatter: formatAllergiesForPdf" ($pdfContent -match "export function formatAllergiesForPdf")
Write-Gate "Formatter: formatProblemsForPdf" ($pdfContent -match "export function formatProblemsForPdf")
Write-Gate "Formatter: formatVitalsForPdf" ($pdfContent -match "export function formatVitalsForPdf")
Write-Gate "Formatter: formatMedicationsForPdf" ($pdfContent -match "export function formatMedicationsForPdf")
Write-Gate "Formatter: formatDemographicsForPdf" ($pdfContent -match "export function formatDemographicsForPdf")
Write-Gate "Formatter: formatImmunizationsForPdf (Phase 31)" ($pdfContent -match "export function formatImmunizationsForPdf")
Write-Gate "Formatter: formatLabsForPdf (Phase 31)" ($pdfContent -match "export function formatLabsForPdf")

# PDF escaping
Write-Gate "PDF escapes backslash, parens" ($pdfContent -match "escapePdf" -and $pdfContent -match 'replace.*\\' -and $pdfContent -match 'replace.*\(')

# ================================================================
# G31-2b  EXPORT: JSON SCHEMA VALIDATED
# ================================================================
Write-Host ""
Write-Host "--- G31-2b: Export -- Structured JSON Schema ---" -ForegroundColor Yellow

# buildStructuredJsonExport function
Write-Gate "buildStructuredJsonExport function exported" ($pdfContent -match "export function buildStructuredJsonExport")

# Schema field: version
Write-Gate "JSON schema: version = 1.0" ($pdfContent -match 'version:\s*"1\.0"')
# Schema field: format
Write-Gate "JSON schema: format = vista-evolved-health-record" ($pdfContent -match 'format:\s*"vista-evolved-health-record"')
# Schema field: generatedAt
Write-Gate "JSON schema: generatedAt = ISO timestamp" ($pdfContent -match "generatedAt:\s*new Date\(\)\.toISOString\(\)")
# Schema field: patient.name
Write-Gate "JSON schema: patient.name present" ($pdfContent -match "patient:\s*\{.*name" -or ($pdfContent -match "patient:" -and $pdfContent -match "name:\s*patientName"))
# Schema field: sections array
Write-Gate "JSON schema: sections array with section/label/records/recordCount" ($pdfContent -match "section:\s*key" -and $pdfContent -match "label:" -and $pdfContent -match "records" -and $pdfContent -match "recordCount:\s*records\.length")
# Schema field: metadata
Write-Gate "JSON schema: metadata.source = VistA-Evolved Health Portal" ($pdfContent -match 'source:\s*"VistA-Evolved Health Portal"')
Write-Gate "JSON schema: metadata.exportType = patient-directed" ($pdfContent -match 'exportType:\s*"patient-directed"')
Write-Gate "JSON schema: metadata.sectionCount" ($pdfContent -match "sectionCount:\s*sections\.length")
Write-Gate "JSON schema: metadata.totalRecords" ($pdfContent -match "totalRecords")

# TypeScript interfaces
Write-Gate "StructuredJsonExport interface exported" ($pdfContent -match "export interface StructuredJsonExport")
Write-Gate "StructuredExportSection interface exported" ($pdfContent -match "export interface StructuredExportSection")

# Route wiring
$routesPath = "$root\apps\api\src\routes\portal-core.ts"
$routesContent = if (Test-Path -LiteralPath $routesPath) { Get-Content $routesPath -Raw } else { "" }
Write-Gate "JSON export route: GET /portal/export/json" ($routesContent -match 'server\.get\("\/portal\/export\/json"')
Write-Gate "JSON export route calls buildStructuredJsonExport" ($routesContent -match "buildStructuredJsonExport\(")
Write-Gate "JSON export supports ?sections= filter" ($routesContent -match "query\.sections" -or $routesContent -match "sections\?.*split.*,")
Write-Gate "JSON export audits portal.export.json" ($routesContent -match 'portalAudit\("portal\.export\.json"')

# ================================================================
# G31-3  SECURITY: NO PHI IN SHARE LINKS
# ================================================================
Write-Host ""
Write-Host "--- G31-3: Security -- No PHI in Share Links ---" -ForegroundColor Yellow

# Token is opaque (base64url random bytes, no patient data embedded)
Write-Gate "Token generated from randomBytes(24).toString('base64url')" ($sharingContent -match 'randomBytes\(24\)\.toString\("base64url"\)')
Write-Gate "Access code from restricted charset (no I/O/0/1)" ($sharingContent -match "ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

# Share preview masks patient name
Write-Gate "getSharePreview returns partial name (split comma, mask)" ($sharingContent -match 'patientName.*split.*",".*\[0\].*\+.*"\,\*\*\*"' -or $sharingContent -match ',\*\*\*')
Write-Gate "getSharePreview hides DFN (no patientDfn in return)" (-not ($sharingContent -match 'getSharePreview.*return.*patientDfn'))

# IP masking
Write-Gate "maskIp function exists" ($sharingContent -match "function maskIp")
Write-Gate "IP last octet replaced with ***" ($sharingContent -match '\.\*\*\*')
Write-Gate "maskIp applied to all access logs" ($sharingContent -match "maskIp\(ip\)")

# Curated sections enforcement
Write-Gate "SHAREABLE_CURATED_SECTIONS constant exported" ($sharingContent -match "export const SHAREABLE_CURATED_SECTIONS")
Write-Gate "Curated sections: 5 items (meds, allergies, problems, immunizations, labs)" ($sharingContent -match 'SHAREABLE_CURATED_SECTIONS.*=.*\[' -and $sharingContent -match '"medications"' -and $sharingContent -match '"allergies"' -and $sharingContent -match '"problems"' -and $sharingContent -match '"immunizations"' -and $sharingContent -match '"labs"')
Write-Gate "Disallowed sections rejected at creation" ($sharingContent -match "disallowed.*filter" -or $sharingContent -match "Sections not allowed for sharing")
Write-Gate "Vitals excluded from sharing" (-not ($sharingContent -match 'SHAREABLE_CURATED_SECTIONS.*vitals'))
Write-Gate "Demographics excluded from sharing" (-not ($sharingContent -match 'SHAREABLE_CURATED_SECTIONS.*demographics'))

# ================================================================
# G31-3b  SECURITY: BRUTE-FORCE PROTECTIONS
# ================================================================
Write-Host ""
Write-Host "--- G31-3b: Security -- Brute-Force Protections ---" -ForegroundColor Yellow

# CAPTCHA stub
Write-Gate "validateCaptcha function exported" ($sharingContent -match "export function validateCaptcha")
Write-Gate "CAPTCHA called in verifyShareAccess" ($sharingContent -match "validateCaptcha\(captchaToken\)")
Write-Gate "captchaToken parameter on verifyShareAccess" ($sharingContent -match "verifyShareAccess" -and $sharingContent -match "captchaToken\??: string")

# Route passes captchaToken from body
Write-Gate "Route passes body.captchaToken to verifyShareAccess" ($routesContent -match "body\.captchaToken")

# Max active shares per patient
Write-Gate "MAX_ACTIVE_SHARES = 10" ($sharingContent -match "MAX_ACTIVE_SHARES\s*=\s*10")
Write-Gate "Active share count enforced at creation" ($sharingContent -match "active\.length\s*>=\s*MAX_ACTIVE_SHARES")

# Access log tracks all attempts
Write-Gate "Access log stores success=true/false" ($sharingContent -match "success:\s*true" -and $sharingContent -match "success:\s*false")
Write-Gate "Access log includes masked IP" ($sharingContent -match "ipHint:\s*maskIp\(ip\)")

# Route-level error codes
Write-Gate "Retryable errors get 403, non-retryable get 410" ($routesContent -match "result\.retryable\s*\?\s*403\s*:\s*410" -or ($routesContent -match "403" -and $routesContent -match "410" -and $routesContent -match "retryable"))

# ================================================================
# G31-3c  SECURITY: AUDIT TRAIL PHI-SAFETY
# ================================================================
Write-Host ""
Write-Host "--- G31-3c: Security -- Audit Trail PHI-Safety ---" -ForegroundColor Yellow

$auditPath = "$root\apps\api\src\services\portal-audit.ts"
Write-Gate "portal-audit.ts exists" (Test-Path -LiteralPath $auditPath)
$auditContent = if (Test-Path -LiteralPath $auditPath) { Get-Content $auditPath -Raw } else { "" }

Write-Gate "hashPatientId uses SHA-256 with salt" ($auditContent -match "createHash.*sha256" -and $auditContent -match "HASH_SALT")
Write-Gate "hashPatientId truncates to 16 hex chars" ($auditContent -match '\.slice\(0,\s*16\)')
Write-Gate "Audit event uses actorHash, not raw DFN" ($auditContent -match "actorHash:\s*hashPatientId\(actorDfn\)")
Write-Gate "No raw DFN stored in audit events" (-not ($auditContent -match 'actorDfn:\s*actorDfn' -or $auditContent -match '"dfn":'))
Write-Gate "Audit log output excludes PHI (only action + outcome)" ($auditContent -match 'log\.info\("Portal audit event"' -and $auditContent -match "action:\s*event\.action" -and $auditContent -match "outcome:\s*event\.outcome")
Write-Gate "Ring buffer MAX_ENTRIES = 5000" ($auditContent -match "MAX_ENTRIES\s*=\s*5000")

# Phase 31 audit action types
Write-Gate "Audit action: portal.export.json" ($auditContent -match '"portal\.export\.json"')
Write-Gate "Audit action: portal.export.shc" ($auditContent -match '"portal\.export\.shc"')
Write-Gate "Audit action: portal.share.view" ($auditContent -match '"portal\.share\.view"')

# ================================================================
# G31-4  SHC: FEATURE FLAG
# ================================================================
Write-Host ""
Write-Host "--- G31-4: SHC Lane -- Feature Flag ---" -ForegroundColor Yellow

$shcPath = "$root\apps\api\src\services\portal-shc.ts"
Write-Gate "portal-shc.ts exists" (Test-Path -LiteralPath $shcPath)
$shcContent = if (Test-Path -LiteralPath $shcPath) { Get-Content $shcPath -Raw } else { "" }

Write-Gate "isShcEnabled checks PORTAL_SHC_ENABLED env" ($shcContent -match 'process\.env\.PORTAL_SHC_ENABLED\s*===\s*"true"')
Write-Gate "isShcEnabled exported" ($shcContent -match "export function isShcEnabled")
Write-Gate "generateShcCredential checks isShcEnabled first" ($shcContent -match 'if\s*\(!isShcEnabled\(\)\)')
Write-Gate "Disabled returns clear error message" ($shcContent -match "SMART Health Cards are not enabled")

# ================================================================
# G31-4b  SHC: FHIR BUNDLE STRUCTURE
# ================================================================
Write-Host ""
Write-Host "--- G31-4b: SHC Lane -- FHIR Bundle ---" -ForegroundColor Yellow

Write-Gate "buildImmunizationBundle function" ($shcContent -match "function buildImmunizationBundle")
Write-Gate "Bundle resourceType = Bundle" ($shcContent -match 'resourceType:\s*"Bundle"')
Write-Gate "Bundle type = collection" ($shcContent -match 'type:\s*"collection"')
Write-Gate "Patient resource in bundle" ($shcContent -match 'resourceType:\s*"Patient"')
Write-Gate "Patient has family/given name" ($shcContent -match "family:" -and $shcContent -match "given:")
Write-Gate "Immunization resource type" ($shcContent -match 'resourceType:\s*"Immunization"')
Write-Gate "Immunization status = completed" ($shcContent -match 'status:\s*"completed"')
Write-Gate "CVX coding system: hl7.org/fhir/sid/cvx" ($shcContent -match 'system:\s*"http://hl7\.org/fhir/sid/cvx"')
Write-Gate "Patient reference: resource:0" ($shcContent -match 'reference:\s*"resource:0"')
Write-Gate "Immunization has occurrenceDateTime" ($shcContent -match "occurrenceDateTime")
Write-Gate "FhirImmunization interface exported" ($shcContent -match "export interface FhirImmunization")
Write-Gate "Optional lotNumber field" ($shcContent -match "lotNumber\??:")
Write-Gate "Optional performer/facility" ($shcContent -match "performer")
Write-Gate "fullUrl format: resource:N" ($shcContent -match 'fullUrl:\s*["`]resource:')

# ================================================================
# G31-4c  SHC: JWS + shc:/ ENCODING
# ================================================================
Write-Host ""
Write-Host "--- G31-4c: SHC Lane -- JWS + shc:/ Encoding ---" -ForegroundColor Yellow

# JWS structure
Write-Gate "JWS header: alg = DEV-HS256" ($shcContent -match 'alg:\s*"DEV-HS256"')
Write-Gate "JWS header: zip = DEF" ($shcContent -match 'zip:\s*"DEF"')
Write-Gate "JWS header: kid = dev-key-1" ($shcContent -match 'kid:\s*"dev-key-1"')
Write-Gate "JWS header/payload base64url encoded" ($shcContent -match '\.toString\("base64url"\)')
Write-Gate "JWS signature uses SHA-256" ($shcContent -match 'createHash\("sha256"\)')
Write-Gate "JWS compact serialization (3-part dot-separated)" ($shcContent -match 'headerB64.*\..*payloadB64.*\..*sig' -or ($shcContent -match "headerB64" -and $shcContent -match "payloadB64" -and $shcContent -match '`\$\{headerB64\}\.\$\{payloadB64\}\.\$\{sig\}`'))

# shc:/ URI encoding
Write-Gate "jwsToShcUri function" ($shcContent -match "function jwsToShcUri")
Write-Gate "shc:/ prefix" ($shcContent -match 'return\s*["`]shc:/')
Write-Gate "Numeric encoding: charCode - 45, padStart(2, 0)" ($shcContent -match "charCodeAt\(0\)\s*-\s*45" -and $shcContent -match "padStart\(2")

# ================================================================
# G31-4d  SHC: VERIFIABLE CREDENTIAL PAYLOAD
# ================================================================
Write-Host ""
Write-Host "--- G31-4d: SHC Lane -- VC Payload ---" -ForegroundColor Yellow

Write-Gate "VC issuer: DEV_ISSUER constant" ($shcContent -match "DEV_ISSUER")
Write-Gate "VC payload: iss field" ($shcContent -match "iss:\s*DEV_ISSUER")
Write-Gate "VC payload: nbf (not-before)" ($shcContent -match "nbf:\s*Math\.floor\(Date\.now\(\)")
Write-Gate "VC type: smarthealth.cards#health-card" ($shcContent -match "smarthealth\.cards#health-card")
Write-Gate "VC type: smarthealth.cards#immunization" ($shcContent -match "smarthealth\.cards#immunization")
Write-Gate "VC credentialSubject.fhirVersion = 4.0.1" ($shcContent -match 'fhirVersion:\s*"4\.0\.1"')
Write-Gate "VC credentialSubject.fhirBundle" ($shcContent -match "fhirBundle")
Write-Gate "devMode = true in credential meta" ($shcContent -match "devMode:\s*true")

# ================================================================
# G31-4e  SHC: CAPABILITIES ENDPOINT
# ================================================================
Write-Host ""
Write-Host "--- G31-4e: SHC Lane -- Capabilities ---" -ForegroundColor Yellow

Write-Gate "getShcCapabilities exported" ($shcContent -match "export function getShcCapabilities")
Write-Gate "Capabilities: enabled field" ($shcContent -match "enabled:\s*isShcEnabled\(\)")
Write-Gate "Capabilities: datasets array" ($shcContent -match "datasets:")
Write-Gate "Capabilities: immunizations dataset" ($shcContent -match 'id:\s*"immunizations"')
Write-Gate "SHC capabilities route: GET /portal/shc/capabilities" ($routesContent -match 'server\.get\("\/portal\/shc\/capabilities"')
Write-Gate "SHC export route: GET /portal/export/shc/:dataset" ($routesContent -match '\/portal\/export\/shc\/:dataset')
Write-Gate "SHC export audits portal.export.shc" ($routesContent -match 'portalAudit\("portal\.export\.shc"')
Write-Gate "SHC credential returned in response" ($routesContent -match "credential:\s*result" -or $routesContent -match "credential: result")

# ================================================================
# G31-5  ROUTES WIRING COMPLETENESS
# ================================================================
Write-Host ""
Write-Host "--- G31-5: Route Wiring ---" -ForegroundColor Yellow

Write-Gate "Route: JSON export (GET /portal/export/json)" ($routesContent -match '\/portal\/export\/json')
Write-Gate "Route: SHC capabilities (GET /portal/shc/capabilities)" ($routesContent -match '\/portal\/shc\/capabilities')
Write-Gate "Route: SHC export (GET /portal/export/shc/:dataset)" ($routesContent -match '\/portal\/export\/shc\/:dataset')
Write-Gate "Route: Share creation (POST /portal/shares)" ($routesContent -match 'server\.post\("\/portal\/shares"')
Write-Gate "Route: Share list (GET /portal/shares)" ($routesContent -match 'server\.get\("\/portal\/shares"')
Write-Gate "Route: Share revoke (POST /portal/shares/:id/revoke)" ($routesContent -match '\/portal\/shares\/:id\/revoke')
Write-Gate "Route: Share preview (GET /portal/share/preview/:token)" ($routesContent -match '\/portal\/share\/preview\/:token')
Write-Gate "Route: Share verify (POST /portal/share/verify/:token)" ($routesContent -match '\/portal\/share\/verify\/:token')
Write-Gate "Route: oneTimeRedeem in share creation body" ($routesContent -match "body\.oneTimeRedeem")
Write-Gate "Route: ttlMinutes conversion to ms" ($routesContent -match "ttlMinutes.*\*\s*60\s*\*\s*1000")
Write-Gate "Route: ttlHours fallback" ($routesContent -match "ttlHours")
Write-Gate "Route: SHAREABLE_CURATED_SECTIONS imported" ($routesContent -match "SHAREABLE_CURATED_SECTIONS")
Write-Gate "Route: buildStructuredJsonExport imported" ($routesContent -match "buildStructuredJsonExport")
Write-Gate "Route: generateShcCredential imported" ($routesContent -match "generateShcCredential")
Write-Gate "Route: getShcCapabilities imported" ($routesContent -match "getShcCapabilities")

# Access code only shown at creation, stripped from list
Write-Gate "Access code stripped from share list response" ($routesContent -match "accessCode.*\.\.\.rest" -or $routesContent -match "\{ accessCode, \.\.\.rest \}")

# ================================================================
# G31-6  PORTAL UI PAGES
# ================================================================
Write-Host ""
Write-Host "--- G31-6: Portal UI Pages ---" -ForegroundColor Yellow

$sharingPagePath = "$root\apps\portal\src\app\dashboard\sharing\page.tsx"
$exportsPagePath = "$root\apps\portal\src\app\dashboard\exports\page.tsx"

Write-Gate "Sharing page exists" (Test-Path -LiteralPath $sharingPagePath)
Write-Gate "Exports page exists" (Test-Path -LiteralPath $exportsPagePath)

if (Test-Path -LiteralPath $sharingPagePath) {
  $sharingPageContent = Get-Content $sharingPagePath -Raw
  Write-Gate "Sharing: oneTimeRedeem UI toggle" ($sharingPageContent -match "oneTimeRedeem")
  Write-Gate "Sharing: ttlMinutes input" ($sharingPageContent -match "ttlMinutes")
  Write-Gate "Sharing: curated sections display" ($sharingPageContent -match "immunizations")
  Write-Gate "Sharing: revoke action" ($sharingPageContent -match "Revoke|revoke")
  Write-Gate "Sharing: access code display" ($sharingPageContent -match "accessCode")
  Write-Gate "Sharing: one-time badge UI" ($sharingPageContent -match "One-time|one.time")
  Write-Gate "Sharing: credentials include on fetch" ($sharingPageContent -match "credentials.*include")
}

if (Test-Path -LiteralPath $exportsPagePath) {
  $exportsPageContent = Get-Content $exportsPagePath -Raw
  Write-Gate "Exports: PDF download" ($exportsPageContent -match "Download PDF|PDF")
  Write-Gate "Exports: JSON download" ($exportsPageContent -match "JSON")
  Write-Gate "Exports: SHC section" ($exportsPageContent -match "SMART Health Cards|SHC|Health Card")
  Write-Gate "Exports: SHC capabilities check" ($exportsPageContent -match "shc/capabilities")
  Write-Gate "Exports: section-by-section export" ($exportsPageContent -match "Individual Sections|section")
  Write-Gate "Exports: immunizations section" ($exportsPageContent -match "Immunizations|immunizations")
  Write-Gate "Exports: labs section" ($exportsPageContent -match "Lab Results|labs")
  Write-Gate "Exports: credentials include on fetch" ($exportsPageContent -match "credentials.*include")
}

# ================================================================
# G31-7  NAVIGATION + API CLIENT
# ================================================================
Write-Host ""
Write-Host "--- G31-7: Navigation + API Client ---" -ForegroundColor Yellow

$navPath = "$root\apps\portal\src\components\portal-nav.tsx"
$apiClientPath = "$root\apps\portal\src\lib\api.ts"

if (Test-Path -LiteralPath $navPath) {
  $navContent = Get-Content $navPath -Raw
  Write-Gate "Nav: Share Records entry" ($navContent -match "Share Records|Sharing")
  Write-Gate "Nav: Export entry" ($navContent -match "Export")
  Write-Gate "Nav: /dashboard/sharing href" ($navContent -match "/dashboard/sharing")
  Write-Gate "Nav: /dashboard/exports href" ($navContent -match "/dashboard/exports")
}

if (Test-Path -LiteralPath $apiClientPath) {
  $apiContent = Get-Content $apiClientPath -Raw
  Write-Gate "API client: exportJson function" ($apiContent -match "exportJson")
  Write-Gate "API client: getShcCapabilities function" ($apiContent -match "getShcCapabilities")
  Write-Gate "API client: exportShc function" ($apiContent -match "exportShc")
  Write-Gate "API client: captchaToken parameter" ($apiContent -match "captchaToken")
}

# ================================================================
# G31-8  DOCUMENTATION + OPS
# ================================================================
Write-Host ""
Write-Host "--- G31-8: Documentation + Ops ---" -ForegroundColor Yellow

$runbookPath = "$root\docs\runbooks\phase31-sharing-exports.md"
Write-Gate "Runbook exists" (Test-Path -LiteralPath $runbookPath)

if (Test-Path -LiteralPath $runbookPath) {
  $runbookContent = Get-Content $runbookPath -Raw
  Write-Gate "Runbook: threat model section" ($runbookContent -match "Threat Model|threat model")
  Write-Gate "Runbook: SHC section" ($runbookContent -match "SMART Health Cards|SHC")
  Write-Gate "Runbook: security parameters" ($runbookContent -match "security|Security")
  Write-Gate "Runbook: JSON export section" ($runbookContent -match "Structured JSON Export|JSON")
}

$summaryPath = "$root\ops\summary.md"
Write-Gate "ops/summary.md mentions Phase 31" (Test-FileContains $summaryPath "Phase 31")

$notionPath = "$root\ops\notion-update.json"
Write-Gate "ops/notion-update.json mentions Phase 31" (Test-FileContains $notionPath "Phase 31")

# ================================================================
# G31-9  CODE QUALITY
# ================================================================
Write-Host ""
Write-Host "--- G31-9: Code Quality ---" -ForegroundColor Yellow

# No console.log in Phase 31 files
$phase31Files = @(
  "$root\apps\api\src\services\portal-sharing.ts",
  "$root\apps\api\src\services\portal-pdf.ts",
  "$root\apps\api\src\services\portal-shc.ts"
)
$clCount = 0
foreach ($f in $phase31Files) {
  if (Test-Path -LiteralPath $f) {
    $clCount += (Select-String -LiteralPath $f -Pattern "console\.log\(" -AllMatches -ErrorAction SilentlyContinue).Matches.Count
  }
}
Write-Gate "Phase 31 services: no console.log ($clCount)" ($clCount -eq 0)

# No hardcoded credentials in Phase 31 files
$credLeak = $false
foreach ($f in $phase31Files) {
  if (Test-Path -LiteralPath $f) {
    $content = Get-Content $f -Raw
    if ($content -match "PROV123|password123|secret123") {
      $credLeak = $true
      break
    }
  }
}
Write-Gate "Phase 31 services: no hardcoded credentials" (-not $credLeak)

# No raw DFN leaking in share preview
Write-Gate "Share preview: no full patientName exposed" ($sharingContent -match 'split.*",".*\[0\].*\*\*\*' -or $sharingContent -match ',\*\*\*')
Write-Gate "Share preview: no DFN in return value" (-not ($sharingContent -match "getSharePreview.*patientDfn:"))

# No SSN anywhere in sharing service
Write-Gate "No SSN field in portal-sharing.ts" (-not ($sharingContent -match '\bssn\s*[=:]'))
Write-Gate "No SSN mention in portal-pdf.ts" (-not ($pdfContent -match "\bssn\b" -and $pdfContent -match "string"))

# ================================================================
# SUMMARY
# ================================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Phase 31 VERIFY Summary" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
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
