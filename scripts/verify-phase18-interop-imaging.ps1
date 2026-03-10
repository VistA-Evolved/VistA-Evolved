<#
.SYNOPSIS
  Phase 18 verifier -- Enterprise Interop + Imaging Platform Integration
.DESCRIPTION
  Checks all Phase 18 deliverables: integration registry, admin integration API,
  imaging integration service, device onboarding, admin console UI, remote data viewer
  upgrade, metrics/audit events, plus regression checks for Phases 1-17.
#>

param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
$repoRoot = Split-Path $PSScriptRoot -Parent

function Assert-Check {
  param([string]$Label, [bool]$Condition)
  if ($Condition) { Write-Host "  PASS  $Label" -ForegroundColor Green; $script:pass++ }
  else           { Write-Host "  FAIL  $Label" -ForegroundColor Red;   $script:fail++ }
}

function Assert-Warn {
  param([string]$Label, [bool]$Condition)
  if ($Condition) { Write-Host "  PASS  $Label" -ForegroundColor Green; $script:pass++ }
  else           { Write-Host "  WARN  $Label" -ForegroundColor Yellow; $script:warn++ }
}

Write-Host "`n=== Phase 18: Enterprise Interop + Imaging Platform Integration Verifier ===" -ForegroundColor Cyan
Write-Host ""

# ─── Section A: Integration Registry Model ───────────────────────────

Write-Host "--- A: Integration Registry Model ---" -ForegroundColor White

Assert-Check "integration-registry.ts exists" (Test-Path "$repoRoot\apps\api\src\config\integration-registry.ts")

$registry = if (Test-Path "$repoRoot\apps\api\src\config\integration-registry.ts") {
  Get-Content "$repoRoot\apps\api\src\config\integration-registry.ts" -Raw
} else { "" }

Assert-Check "IntegrationType union defined" ($registry -match "export type IntegrationType")
Assert-Check "IntegrationType: vista-rpc" ($registry -match '"vista-rpc"')
Assert-Check "IntegrationType: fhir" ($registry -match '"fhir"')
Assert-Check "IntegrationType: fhir-c0fhir" ($registry -match '"fhir-c0fhir"')
Assert-Check "IntegrationType: fhir-vpr" ($registry -match '"fhir-vpr"')
Assert-Check "IntegrationType: dicom" ($registry -match '"dicom"')
Assert-Check "IntegrationType: dicomweb" ($registry -match '"dicomweb"')
Assert-Check "IntegrationType: hl7v2" ($registry -match '"hl7v2"')
Assert-Check "IntegrationType: lis" ($registry -match '"lis"')
Assert-Check "IntegrationType: pacs-vna" ($registry -match '"pacs-vna"')
Assert-Check "IntegrationType: device" ($registry -match '"device"')
Assert-Check "IntegrationType: external" ($registry -match '"external"')
Assert-Check "IntegrationAuthMethod type" ($registry -match "export type IntegrationAuthMethod")
Assert-Check "IntegrationStatus type" ($registry -match "export type IntegrationStatus")
Assert-Check "IntegrationEntry interface" ($registry -match "export interface IntegrationEntry")
Assert-Check "IntegrationQueueMetrics interface" ($registry -match "export interface IntegrationQueueMetrics")
Assert-Check "IntegrationErrorEntry interface" ($registry -match "export interface IntegrationErrorEntry")
Assert-Check "IntegrationHealthSummary interface" ($registry -match "export interface IntegrationHealthSummary")

# Type-specific configs
Assert-Check "VistaRpcConfig interface" ($registry -match "export interface VistaRpcConfig")
Assert-Check "FhirC0FhirConfig interface (C0FHIR)" ($registry -match "export interface FhirC0FhirConfig")
Assert-Check "FhirConfig interface" ($registry -match "export interface FhirConfig")
Assert-Check "FhirVprConfig interface" ($registry -match "export interface FhirVprConfig")
Assert-Check "DicomConfig interface" ($registry -match "export interface DicomConfig")
Assert-Check "DicomWebConfig interface" ($registry -match "export interface DicomWebConfig")
Assert-Check "Hl7v2Config interface" ($registry -match "export interface Hl7v2Config")
Assert-Check "LisConfig interface" ($registry -match "export interface LisConfig")
Assert-Check "PacsVnaConfig interface" ($registry -match "export interface PacsVnaConfig")
Assert-Check "DeviceConfig interface" ($registry -match "export interface DeviceConfig")
Assert-Check "ExternalConfig interface" ($registry -match "export interface ExternalConfig")
Assert-Check "IntegrationSpecificConfig union" ($registry -match "export type IntegrationSpecificConfig")

# Public API
Assert-Check "listIntegrations exported" ($registry -match "export function listIntegrations")
Assert-Check "getIntegration exported" ($registry -match "export function getIntegration")
Assert-Check "upsertIntegration exported" ($registry -match "export function upsertIntegration")
Assert-Check "deleteIntegration exported" ($registry -match "export function deleteIntegration")
Assert-Check "toggleIntegration exported" ($registry -match "export function toggleIntegration")
Assert-Check "updateIntegrationStatus exported" ($registry -match "export function updateIntegrationStatus")
Assert-Check "updateQueueMetrics exported" ($registry -match "export function updateQueueMetrics")
Assert-Check "recordIntegrationError exported" ($registry -match "export function recordIntegrationError")
Assert-Check "getIntegrationHealthSummary exported" ($registry -match "export function getIntegrationHealthSummary")
Assert-Check "seedDefaultIntegrations exported" ($registry -match "export function seedDefaultIntegrations")
Assert-Check "INTEGRATION_TYPE_LABELS exported" ($registry -match "export const INTEGRATION_TYPE_LABELS")

# Seeded defaults
Assert-Check "Default vista-primary seeded" ($registry -match '"vista-primary"')
Assert-Check "Default vista-imaging seeded" ($registry -match '"vista-imaging"')
Assert-Check "C0FHIR seeded if env configured" ($registry -match "C0FHIR_HOST")
Assert-Check "Error log ring buffer (max 20)" ($registry -match "MAX_ERROR_LOG.*20")

Write-Host ""
# ─── Section B: Admin Integration API ────────────────────────────────

Write-Host "--- B: Admin Integration API (Interop Routes) ---" -ForegroundColor White

Assert-Check "routes/interop.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\interop.ts")

$interop = if (Test-Path "$repoRoot\apps\api\src\routes\interop.ts") {
  Get-Content "$repoRoot\apps\api\src\routes\interop.ts" -Raw
} else { "" }

Assert-Check "GET /admin/registry/:tenantId" ($interop -match '/admin/registry/:tenantId"')
Assert-Check "GET /admin/registry/:tenantId/:integrationId" ($interop -match '/admin/registry/:tenantId/:integrationId"')
Assert-Check "PUT /admin/registry/:tenantId/:integrationId" ($interop -match 'put.*admin/registry/:tenantId/:integrationId|/admin/registry/:tenantId/:integrationId.*put')
Assert-Check "DELETE /admin/registry/:tenantId/:integrationId" ($interop -match 'delete.*admin/registry/:tenantId/:integrationId|/admin/registry/:tenantId/:integrationId.*delete')
Assert-Check "POST .../toggle endpoint" ($interop -match '/toggle')
Assert-Check "POST .../probe single endpoint" ($interop -match '/:integrationId/probe')
Assert-Check "POST .../probe-all endpoint" ($interop -match '/probe-all')
Assert-Check "GET .../health-summary endpoint" ($interop -match '/health-summary')
Assert-Check "GET .../error-log endpoint" ($interop -match '/error-log')
Assert-Check "POST .../onboard-device endpoint" ($interop -match '/onboard-device')
Assert-Check "Interop requires admin role" ($interop -match 'requireRole\(session.*admin')
Assert-Check "Interop audits config changes" ($interop -match 'audit\(')
Assert-Check "probeIntegration function" ($interop -match "async function probeIntegration")
Assert-Check "TCP socket probe for DICOM/HL7v2" ($interop -match "net\.createConnection|import.*net")
Assert-Check "HTTP probe for FHIR/DICOMweb" ($interop -match "fetch\(url")
Assert-Check "VistA RPC probe via probeConnect" ($interop -match "probeConnect\(\)")

Write-Host ""
# ─── Section C: Imaging Integration Service ──────────────────────────

Write-Host "--- C: Imaging Integration Service ---" -ForegroundColor White

Assert-Check "services/imaging-service.ts exists" (Test-Path "$repoRoot\apps\api\src\services\imaging-service.ts")

$imgSvc = if (Test-Path "$repoRoot\apps\api\src\services\imaging-service.ts") {
  Get-Content "$repoRoot\apps\api\src\services\imaging-service.ts" -Raw
} else { "" }

Assert-Check "GET /vista/imaging/status (enhanced)" ($imgSvc -match '/vista/imaging/status')
Assert-Check "GET /vista/imaging/report" ($imgSvc -match '/vista/imaging/report')
Assert-Check "GET /vista/imaging/studies" ($imgSvc -match '/vista/imaging/studies')
Assert-Check "GET /vista/imaging/viewer-url" ($imgSvc -match '/vista/imaging/viewer-url')
Assert-Check "GET /vista/imaging/metadata" ($imgSvc -match '/vista/imaging/metadata')
Assert-Check "GET /vista/imaging/registry-status" ($imgSvc -match '/vista/imaging/registry-status')
Assert-Check "ImagingStudy interface" ($imgSvc -match "export interface ImagingStudy")
Assert-Check "ViewerUrlResult interface" ($imgSvc -match "export interface ViewerUrlResult")
Assert-Check "ImagingViewerPlugin interface" ($imgSvc -match "export interface ImagingViewerPlugin")
Assert-Check "registerImagingPlugin function" ($imgSvc -match "export function registerImagingPlugin")
Assert-Check "Uses MAG4 REMOTE PROCEDURE" ($imgSvc -match "MAG4 REMOTE PROCEDURE")
Assert-Check "Uses RA DETAILED REPORT" ($imgSvc -match "RA DETAILED REPORT")
Assert-Check "DICOMweb QIDO-RS integration" ($imgSvc -match "QIDO|qidoRsPath")
Assert-Check "DICOMweb WADO-RS metadata" ($imgSvc -match "WADO|wadoRsPath")
Assert-Check "OHIF viewer URL generation" ($imgSvc -match "buildOhifViewerUrl|StudyInstanceUIDs")
Assert-Check "Registry-aware: uses listIntegrations" ($imgSvc -match "listIntegrations")
Assert-Check "Audits imaging access" ($imgSvc -match 'audit\(.*imaging')

# Phase 14D file still exists (preserved for reference)
Assert-Check "Original imaging.ts preserved" (Test-Path "$repoRoot\apps\api\src\routes\imaging.ts")

Write-Host ""
# ─── Section D: Device Onboarding ────────────────────────────────────

Write-Host "--- D: Device Onboarding (Config-not-Code) ---" -ForegroundColor White

Assert-Check "DeviceConfig has manufacturer field" ($registry -match "manufacturer.*string")
Assert-Check "DeviceConfig has model field" ($registry -match "model.*string")
Assert-Check "DeviceConfig has serialNumber" ($registry -match "serialNumber.*string")
Assert-Check "DeviceConfig has modalityCode" ($registry -match "modalityCode.*string")
Assert-Check "DeviceConfig has aeTitle" ($registry -match "aeTitle.*string")
Assert-Check "DeviceConfig has location" ($registry -match "location.*string")
Assert-Check "DeviceConfig has worklistAeTitle" ($registry -match "worklistAeTitle.*string")
Assert-Check "DeviceConfig has conformanceClasses" ($registry -match "conformanceClasses.*string\[\]")
Assert-Check "Onboard validates required fields" ($interop -match "Missing required fields")
Assert-Check "Onboard checks for duplicate ID" ($interop -match "already exists")

Write-Host ""
# ─── Section E: Admin Console UI ─────────────────────────────────────

Write-Host "--- E: Admin Integration Console UI ---" -ForegroundColor White

$intPage = if (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx" -Raw
} else { "" }

Assert-Check "Integration Console page exists" (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx")
Assert-Check "Integration Console has registry tab" ($intPage -match "Integration Registry|registry")
Assert-Check "Integration Console has onboard tab" ($intPage -match "Device Onboarding|onboard")
Assert-Check "Integration Console has legacy tab" ($intPage -match "Legacy Connectors|legacy")
Assert-Check "Health summary bar" ($intPage -match "healthSummary|HealthSummary")
Assert-Check "Enable/disable toggles" ($intPage -match "handleToggle|checkbox")
Assert-Check "Probe All button" ($intPage -match "Probe All")
Assert-Check "Probe single button" ($intPage -match "handleProbeSingle|Probe")
Assert-Check "Error log viewer" ($intPage -match "errorLog|Error Log")
Assert-Check "Device onboarding form fields" ($intPage -match "modalityCode|manufacturer|aeTitle")
Assert-Check "Calls /admin/registry/ endpoints" ($intPage -match "/admin/registry/")
Assert-Check "Calls /admin/integrations/ (legacy)" ($intPage -match "/admin/integrations/")
Assert-Check "Requires admin role" ($intPage -match "hasRole.*admin")
Assert-Check "TYPE_LABELS for integration types" ($intPage -match "TYPE_LABELS")
Assert-Check "Shows queue metrics" ($intPage -match "queueMetrics|Queue")
Assert-Check "Architecture note present" ($intPage -match "Phase 18")

Write-Host ""
# ─── Section F: Imaging Views in CPRS Web ────────────────────────────

Write-Host "--- F: Imaging Views in ReportsPanel ---" -ForegroundColor White

$reportsPanel = if (Test-Path "$repoRoot\apps\web\src\components\cprs\panels\ReportsPanel.tsx") {
  Get-Content "$repoRoot\apps\web\src\components\cprs\panels\ReportsPanel.tsx" -Raw
} else { "" }

Assert-Check "ReportsPanel has imaging status indicator" ($reportsPanel -match "imagingStatus|ImagingStatus")
Assert-Check "ReportsPanel shows MAG4/RA availability" ($reportsPanel -match "vistaImaging" -and $reportsPanel -match "radiology")
Assert-Check "ReportsPanel has Load Patient Studies button" ($reportsPanel -match "Load Patient Studies|handleLoadStudies")
Assert-Check "ReportsPanel has viewer launch button" ($reportsPanel -match "handleViewerLaunch|viewer-url")
Assert-Check "ReportsPanel calls /vista/imaging/status" ($reportsPanel -match "/vista/imaging/status")
Assert-Check "ReportsPanel calls /vista/imaging/studies" ($reportsPanel -match "/vista/imaging/studies")
Assert-Check "ReportsPanel calls /vista/imaging/viewer-url" ($reportsPanel -match "/vista/imaging/viewer-url")
Assert-Check "Registry entries shown" ($reportsPanel -match "registryEntries")

Write-Host ""
# ─── Section G: Remote Data Viewer Upgrade ───────────────────────────

Write-Host "--- G: Remote Data Viewer (Phase 18E) ---" -ForegroundColor White

$rdv = if (Test-Path "$repoRoot\apps\web\src\app\cprs\remote-data-viewer\page.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\remote-data-viewer\page.tsx" -Raw
} else { "" }

Assert-Check "Remote Data Viewer fetches /admin/registry" ($rdv -match "/admin/registry/")
Assert-Check "External sources from registry" ($rdv -match "externalSources|ExternalSource")
Assert-Check "Filters FHIR/HL7v2/external types" ($rdv -match "fhir.*fhir-c0fhir.*hl7v2|fhir-c0fhir")
Assert-Check "Shows external source list" ($rdv -match "External Sources")
Assert-Check "C0FHIR Suite mentioned" ($rdv -match "C0FHIR Suite")
Assert-Check "Architecture notes updated" ($rdv -match "Phase 18E|Integration Registry")

Write-Host ""
# ─── Section H: Metrics + Audit Events ───────────────────────────────

Write-Host "--- H: Metrics + Audit Events ---" -ForegroundColor White

$audit = if (Test-Path "$repoRoot\apps\api\src\lib\audit.ts") {
  Get-Content "$repoRoot\apps\api\src\lib\audit.ts" -Raw
} else { "" }

Assert-Check "AuditAction: integration.config-change" ($audit -match '"integration\.config-change"')
Assert-Check "AuditAction: integration.probe" ($audit -match '"integration\.probe"')
Assert-Check "AuditAction: integration.dashboard-view" ($audit -match '"integration\.dashboard-view"')
Assert-Check "AuditAction: integration.device-onboard" ($audit -match '"integration\.device-onboard"')
Assert-Check "AuditAction: imaging.viewer-launch" ($audit -match '"imaging\.viewer-launch"')

$indexTs = if (Test-Path "$repoRoot\apps\api\src\index.ts") {
  Get-Content "$repoRoot\apps\api\src\index.ts" -Raw
} else { "" }

Assert-Check "index.ts imports interopRoutes" ($indexTs -match "import interopRoutes")
Assert-Check "index.ts registers interopRoutes" ($indexTs -match "server\.register\(interopRoutes\)")
Assert-Check "index.ts imports imaging from services" ($indexTs -match 'import.*imagingRoutes.*from.*services/imaging-service')
Assert-Check "index.ts imports getIntegrationHealthSummary" ($indexTs -match "import.*getIntegrationHealthSummary")
Assert-Check "Metrics endpoint includes integration health" ($indexTs -match 'integrations.*getIntegrationHealthSummary')

Write-Host ""
# ─── Section I: Documentation ────────────────────────────────────────

Write-Host "--- I: Documentation ---" -ForegroundColor White

Assert-Check "Phase 18 runbook exists" (Test-Path "$repoRoot\docs\runbooks\interop-imaging-phase18.md")
Assert-Check "Phase 18 IMPLEMENT prompt exists" (Test-Path "$repoRoot\prompts\20-PHASE-18-INTEROP-IMAGING\20-01-Phase18-Interop-Imaging-IMPLEMENT.md")
Assert-Check "Phase 18 VERIFY prompt exists" (Test-Path "$repoRoot\prompts\20-PHASE-18-INTEROP-IMAGING\20-99-Phase18-Interop-Imaging-VERIFY.md")

$runbook = if (Test-Path "$repoRoot\docs\runbooks\interop-imaging-phase18.md") {
  Get-Content "$repoRoot\docs\runbooks\interop-imaging-phase18.md" -Raw
} else { "" }

Assert-Check "Runbook documents integration types" ($runbook -match "IntegrationType|integration type")
Assert-Check "Runbook documents API endpoints" ($runbook -match "/admin/registry")
Assert-Check "Runbook documents device onboarding" ($runbook -match "onboard|device")
Assert-Check "Runbook documents C0FHIR" ($runbook -match "C0FHIR")
Assert-Check "Runbook documents DICOMweb" ($runbook -match "DICOMweb|DICOM")

Write-Host ""
# ─── Regression Checks ───────────────────────────────────────────────

Write-Host "--- Regression: Core Structure ---" -ForegroundColor White

Assert-Check "API index.ts exists" (Test-Path "$repoRoot\apps\api\src\index.ts")
Assert-Check "routes/admin.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\admin.ts")
Assert-Check "Original imaging.ts exists (Phase 14D)" (Test-Path "$repoRoot\apps\api\src\routes\imaging.ts")
Assert-Check "tenant-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\tenant-config.ts")
Assert-Check "session-store.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\session-store.ts")
Assert-Check "auth-routes.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\auth-routes.ts")
Assert-Check "security.ts exists" (Test-Path "$repoRoot\apps\api\src\middleware\security.ts")
Assert-Check "audit.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\audit.ts")
Assert-Check "server-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\server-config.ts")
Assert-Check "cprs-ui-state.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\cprs-ui-state.tsx")
Assert-Check "session-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\session-context.tsx")
Assert-Check "tenant-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\tenant-context.tsx")
Assert-Check "CPRSTabStrip.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSTabStrip.tsx")

Assert-Check "API still has /health endpoint" ($indexTs -match '/health')
Assert-Check "API still has /ready endpoint" ($indexTs -match '/ready')
Assert-Check "API still has /vista/ping" ($indexTs -match '/vista/ping')
Assert-Check "API still registers authRoutes" ($indexTs -match 'server\.register\(authRoutes\)')
Assert-Check "API still registers adminRoutes" ($indexTs -match 'server\.register\(adminRoutes\)')
Assert-Check "API still registers imagingRoutes" ($indexTs -match 'server\.register\(imagingRoutes\)')
Assert-Check "API still has circuit-breaker" ($indexTs -match 'circuit-breaker')

# Phase 17 regression: tenant model still intact
$tenantConfig = if (Test-Path "$repoRoot\apps\api\src\config\tenant-config.ts") {
  Get-Content "$repoRoot\apps\api\src\config\tenant-config.ts" -Raw
} else { "" }

Assert-Check "TenantConfig still defined" ($tenantConfig -match "export interface TenantConfig")
Assert-Check "ConnectorConfig still defined" ($tenantConfig -match "export interface ConnectorConfig")
Assert-Check "Admin routes still have /admin/tenants" ($indexTs -match '/admin/tenants|adminRoutes')

# Phase 17 UI regressions
$layout = if (Test-Path "$repoRoot\apps\web\src\app\cprs\layout.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\layout.tsx" -Raw
} else { "" }

Assert-Check "CPRS layout still has TenantProvider" ($layout -match "TenantProvider")

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($fail -gt 0) { exit 1 }
