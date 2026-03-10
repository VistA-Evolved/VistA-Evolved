<#
.SYNOPSIS
  Phase 17 verifier -- Multi-Tenant Control Plane
.DESCRIPTION
  Checks all Phase 17 deliverables: tenant model, admin endpoints, feature flags,
  module gating, theme governance, templates, interop status, plus regression checks.
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

Write-Host "`n=== Phase 17: Multi-Tenant Control Plane Verifier ===" -ForegroundColor Cyan
Write-Host ""

# ─── Section A: Tenant Model ─────────────────────────────────────────

Write-Host "--- A: Tenant Model ---" -ForegroundColor White

Assert-Check "tenant-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\tenant-config.ts")

$tenantConfig = if (Test-Path "$repoRoot\apps\api\src\config\tenant-config.ts") {
  Get-Content "$repoRoot\apps\api\src\config\tenant-config.ts" -Raw
} else { "" }

Assert-Check "TenantConfig interface defined" ($tenantConfig -match "export interface TenantConfig")
Assert-Check "ModuleId type defined" ($tenantConfig -match "export type ModuleId")
Assert-Check "FeatureFlags interface defined" ($tenantConfig -match "export interface FeatureFlags")
Assert-Check "UIDefaults interface defined" ($tenantConfig -match "export interface UIDefaults")
Assert-Check "NoteTemplate interface defined" ($tenantConfig -match "export interface NoteTemplate")
Assert-Check "ConnectorConfig interface defined" ($tenantConfig -match "export interface ConnectorConfig")
Assert-Check "getTenant function exported" ($tenantConfig -match "export function getTenant")
Assert-Check "listTenants function exported" ($tenantConfig -match "export function listTenants")
Assert-Check "upsertTenant function exported" ($tenantConfig -match "export function upsertTenant")
Assert-Check "updateFeatureFlags exported" ($tenantConfig -match "export function updateFeatureFlags")
Assert-Check "updateUIDefaults exported" ($tenantConfig -match "export function updateUIDefaults")
Assert-Check "updateEnabledModules exported" ($tenantConfig -match "export function updateEnabledModules")
Assert-Check "upsertNoteTemplate exported" ($tenantConfig -match "export function upsertNoteTemplate")
Assert-Check "deleteNoteTemplate exported" ($tenantConfig -match "export function deleteNoteTemplate")
Assert-Check "updateConnectorStatus exported" ($tenantConfig -match "export function updateConnectorStatus")
Assert-Check "resolveTenantId exported" ($tenantConfig -match "export function resolveTenantId")
Assert-Check "Default tenant seeded from env" ($tenantConfig -match "buildDefaultTenant")
Assert-Check "ALL_MODULES constant" ($tenantConfig -match "ALL_MODULES.*ModuleId\[\]")
Assert-Check "DEFAULT_FEATURE_FLAGS constant" ($tenantConfig -match "DEFAULT_FEATURE_FLAGS")

# ─── SessionData has tenantId ────────────────────────────────────────

$sessionStore = if (Test-Path "$repoRoot\apps\api\src\auth\session-store.ts") {
  Get-Content "$repoRoot\apps\api\src\auth\session-store.ts" -Raw
} else { "" }

Assert-Check "SessionData has tenantId" ($sessionStore -match "tenantId:\s*string")

# ─── Auth routes wire tenantId ───────────────────────────────────────

$authRoutes = if (Test-Path "$repoRoot\apps\api\src\auth\auth-routes.ts") {
  Get-Content "$repoRoot\apps\api\src\auth\auth-routes.ts" -Raw
} else { "" }

Assert-Check "auth-routes imports resolveTenantId" ($authRoutes -match "import.*resolveTenantId")
Assert-Check "auth-routes calls resolveTenantId" ($authRoutes -match "resolveTenantId\(")
Assert-Check "auth-routes passes tenantId to createSession" ($authRoutes -match "tenantId")
Assert-Check "Session response includes tenantId" ($authRoutes -match "tenantId.*session\.tenantId|tenantId,")

Write-Host ""
# ─── Section B: Admin Endpoints ──────────────────────────────────────

Write-Host "--- B: Admin Endpoints ---" -ForegroundColor White

Assert-Check "routes/admin.ts exists" (Test-Path "$repoRoot\apps\api\src\routes\admin.ts")

$adminRoutes = if (Test-Path "$repoRoot\apps\api\src\routes\admin.ts") {
  Get-Content "$repoRoot\apps\api\src\routes\admin.ts" -Raw
} else { "" }

Assert-Check "GET /admin/tenants endpoint" ($adminRoutes -match '/admin/tenants"')
Assert-Check "PUT /admin/tenants/:tenantId" ($adminRoutes -match 'PUT.*admin/tenants/:tenantId|/admin/tenants/:tenantId.*put')
Assert-Check "DELETE /admin/tenants/:tenantId" ($adminRoutes -match 'delete.*admin/tenants/:tenantId|/admin/tenants/:tenantId.*delete')
Assert-Check "GET /admin/feature-flags/:tenantId" ($adminRoutes -match '/admin/feature-flags/:tenantId')
Assert-Check "PUT /admin/feature-flags/:tenantId" ($adminRoutes -match 'put.*admin/feature-flags|feature-flags.*put')
Assert-Check "GET /admin/ui-defaults/:tenantId" ($adminRoutes -match '/admin/ui-defaults/:tenantId')
Assert-Check "PUT /admin/ui-defaults/:tenantId" ($adminRoutes -match 'put.*admin/ui-defaults|ui-defaults.*put')
Assert-Check "GET /admin/modules/:tenantId" ($adminRoutes -match '/admin/modules/:tenantId')
Assert-Check "PUT /admin/modules/:tenantId" ($adminRoutes -match 'put.*admin/modules|modules.*put')
Assert-Check "GET /admin/templates/:tenantId" ($adminRoutes -match '/admin/templates/:tenantId')
Assert-Check "PUT /admin/templates/:tenantId/:templateId" ($adminRoutes -match '/admin/templates/:tenantId/:templateId')
Assert-Check "DELETE /admin/templates/:tenantId/:templateId" ($adminRoutes -match 'delete.*templates/:tenantId/:templateId')
Assert-Check "GET /admin/integrations/:tenantId" ($adminRoutes -match '/admin/integrations/:tenantId')
Assert-Check "POST /admin/integrations/:tenantId/probe" ($adminRoutes -match '/admin/integrations/:tenantId/probe')
Assert-Check "GET /admin/my-tenant" ($adminRoutes -match '/admin/my-tenant')
Assert-Check "admin.ts requires admin role per endpoint" ($adminRoutes -match 'requireRole\(session.*admin')
Assert-Check "admin.ts audits config changes" ($adminRoutes -match 'audit\("config\.')

# admin routes registered in index.ts
$indexTs = if (Test-Path "$repoRoot\apps\api\src\index.ts") {
  Get-Content "$repoRoot\apps\api\src\index.ts" -Raw
} else { "" }

Assert-Check "index.ts imports adminRoutes" ($indexTs -match "import adminRoutes")
Assert-Check "index.ts registers adminRoutes" ($indexTs -match "server.register\(adminRoutes\)")

# ─── Audit actions extended ──────────────────────────────────────────

$audit = if (Test-Path "$repoRoot\apps\api\src\lib\audit.ts") {
  Get-Content "$repoRoot\apps\api\src\lib\audit.ts" -Raw
} else { "" }

Assert-Check "AuditAction: config.tenant-update" ($audit -match '"config\.tenant-update"')
Assert-Check "AuditAction: config.feature-flag-update" ($audit -match '"config\.feature-flag-update"')
Assert-Check "AuditAction: config.ui-defaults-update" ($audit -match '"config\.ui-defaults-update"')
Assert-Check "AuditAction: config.modules-update" ($audit -match '"config\.modules-update"')
Assert-Check "AuditAction: config.template-upsert" ($audit -match '"config\.template-upsert"')
Assert-Check "AuditAction: config.template-delete" ($audit -match '"config\.template-delete"')
Assert-Check "AuditAction: config.connector-update" ($audit -match '"config\.connector-update"')

# ─── Security rules ──────────────────────────────────────────────────

$security = if (Test-Path "$repoRoot\apps\api\src\middleware\security.ts") {
  Get-Content "$repoRoot\apps\api\src\middleware\security.ts" -Raw
} else { "" }

Assert-Check "AUTH_RULES: /admin/my-tenant = session" ($security -match 'admin.*my-tenant.*session')

Write-Host ""
# ─── Section C: Feature Flags + Module Gating (Web) ──────────────────

Write-Host "--- C: Feature Flags + Module Gating (Web) ---" -ForegroundColor White

Assert-Check "tenant-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\tenant-context.tsx")

$tenantCtx = if (Test-Path "$repoRoot\apps\web\src\stores\tenant-context.tsx") {
  Get-Content "$repoRoot\apps\web\src\stores\tenant-context.tsx" -Raw
} else { "" }

Assert-Check "TenantProvider component" ($tenantCtx -match "export function TenantProvider")
Assert-Check "useTenant hook" ($tenantCtx -match "export function useTenant")
Assert-Check "useFeatureFlag hook" ($tenantCtx -match "export function useFeatureFlag")
Assert-Check "useModuleEnabled hook" ($tenantCtx -match "export function useModuleEnabled")
Assert-Check "useFacilityDefaults hook" ($tenantCtx -match "export function useFacilityDefaults")
Assert-Check "isModuleEnabled method" ($tenantCtx -match "isModuleEnabled")
Assert-Check "isFeatureEnabled method" ($tenantCtx -match "isFeatureEnabled")
Assert-Check "Fetches /admin/my-tenant" ($tenantCtx -match "/admin/my-tenant")

# ─── CPRS Layout includes TenantProvider ─────────────────────────────

$layout = if (Test-Path "$repoRoot\apps\web\src\app\cprs\layout.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\layout.tsx" -Raw
} else { "" }

Assert-Check "CPRS layout imports TenantProvider" ($layout -match "import.*TenantProvider")
Assert-Check "CPRS layout uses TenantProvider" ($layout -match "<TenantProvider")

# ─── CPRSTabStrip filters modules ───────────────────────────────────

$tabStrip = if (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSTabStrip.tsx") {
  Get-Content "$repoRoot\apps\web\src\components\cprs\CPRSTabStrip.tsx" -Raw
} else { "" }

Assert-Check "CPRSTabStrip imports useTenant" ($tabStrip -match "import.*useTenant")
Assert-Check "CPRSTabStrip filters by isModuleEnabled" ($tabStrip -match "isModuleEnabled")
Assert-Check "CPRSTabStrip has TAB_TO_MODULE map" ($tabStrip -match "TAB_TO_MODULE")

# ─── Chart page module gating ───────────────────────────────────────

$chartPage = if (Test-Path -LiteralPath "$repoRoot\apps\web\src\app\cprs\chart\[dfn]\[tab]\page.tsx") {
  Get-Content -LiteralPath "$repoRoot\apps\web\src\app\cprs\chart\[dfn]\[tab]\page.tsx" -Raw
} else { "" }

Assert-Check "Chart page imports useTenant" ($chartPage -match "import.*useTenant")
Assert-Check "Chart page checks isModuleEnabled" ($chartPage -match "isModuleEnabled")
Assert-Check "Chart page shows Module Disabled message" ($chartPage -match "Module Disabled")
Assert-Check "Modern sidebar filters by isModuleEnabled" ($chartPage -match "filter.*isModuleEnabled")

Write-Host ""
# ─── Section D: Theme Governance ─────────────────────────────────────

Write-Host "--- D: Theme Governance ---" -ForegroundColor White

$prefsPage = if (Test-Path "$repoRoot\apps\web\src\app\cprs\settings\preferences\page.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\settings\preferences\page.tsx" -Raw
} else { "" }

Assert-Check "Preferences imports useFacilityDefaults" ($prefsPage -match "import.*useFacilityDefaults")
Assert-Check "Preferences has Reset to Facility Defaults button" ($prefsPage -match "Reset to Facility Defaults")
Assert-Check "Preferences calls handleResetToFacilityDefaults" ($prefsPage -match "handleResetToFacilityDefaults")

Write-Host ""
# ─── Section E: Templates System ─────────────────────────────────────

Write-Host "--- E: Templates System ---" -ForegroundColor White

$notesPanel = if (Test-Path "$repoRoot\apps\web\src\components\cprs\panels\NotesPanel.tsx") {
  Get-Content "$repoRoot\apps\web\src\components\cprs\panels\NotesPanel.tsx" -Raw
} else { "" }

Assert-Check "NotesPanel imports useTenant" ($notesPanel -match "import.*useTenant")
Assert-Check "NotesPanel uses noteTemplates from tenant" ($notesPanel -match "noteTemplates")
Assert-Check "NotesPanel has LOCAL_TEMPLATES fallback" ($notesPanel -match "LOCAL_TEMPLATES")
Assert-Check "NotesPanel checks notes.templates feature flag" ($notesPanel -match "notes\.templates")
Assert-Check "NotesPanel merges facility + local templates" ($notesPanel -match "facilityTemplates.*localOnly|localOnly.*facilityTemplates")

Write-Host ""
# ─── Section F: Interop Status Panel ─────────────────────────────────

Write-Host "--- F: Interop Status Panel ---" -ForegroundColor White

Assert-Check "Integrations page exists" (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx")

$integrations = if (Test-Path "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx") {
  Get-Content "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx" -Raw
} else { "" }

Assert-Check "Integrations page has probe button" ($integrations -match "Probe All")
Assert-Check "Integrations page shows connector status" ($integrations -match "statusColor|connected.*disconnected")
Assert-Check "Integrations page requires admin role" ($integrations -match "hasRole.*admin")
Assert-Check "Integrations page calls /admin/integrations" ($integrations -match "/admin/integrations/")

Write-Host ""
# ─── Section G: Documentation ────────────────────────────────────────

Write-Host "--- G: Documentation ---" -ForegroundColor White

Assert-Check "Phase 17 runbook exists" (Test-Path "$repoRoot\docs\runbooks\multitenant-control-plane-phase17.md")
Assert-Check "Phase 17 IMPLEMENT prompt exists" (Test-Path "$repoRoot\prompts\19-PHASE-17-MULTITENANT-CONTROL-PLANE\19-01-Phase17-ControlPlane-IMPLEMENT.md")
Assert-Check "Phase 17 VERIFY prompt exists" (Test-Path "$repoRoot\prompts\19-PHASE-17-MULTITENANT-CONTROL-PLANE\19-02-Phase17-ControlPlane-VERIFY.md")

$runbook = if (Test-Path "$repoRoot\docs\runbooks\multitenant-control-plane-phase17.md") {
  Get-Content "$repoRoot\docs\runbooks\multitenant-control-plane-phase17.md" -Raw
} else { "" }

Assert-Check "Runbook documents admin endpoints" ($runbook -match "/admin/tenants")
Assert-Check "Runbook documents feature flags" ($runbook -match "Feature Flag")
Assert-Check "Runbook documents module IDs" ($runbook -match "Module ID")
Assert-Check "Runbook documents connectors" ($runbook -match "Connector")

Write-Host ""
# ─── Regression Checks ───────────────────────────────────────────────

Write-Host "--- Regression: Core Structure ---" -ForegroundColor White

Assert-Check "API index.ts exists" (Test-Path "$repoRoot\apps\api\src\index.ts")
Assert-Check "session-store.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\session-store.ts")
Assert-Check "auth-routes.ts exists" (Test-Path "$repoRoot\apps\api\src\auth\auth-routes.ts")
Assert-Check "server-config.ts exists" (Test-Path "$repoRoot\apps\api\src\config\server-config.ts")
Assert-Check "security.ts exists" (Test-Path "$repoRoot\apps\api\src\middleware\security.ts")
Assert-Check "audit.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\audit.ts")
Assert-Check "cprs-ui-state.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\cprs-ui-state.tsx")
Assert-Check "session-context.tsx exists" (Test-Path "$repoRoot\apps\web\src\stores\session-context.tsx")
Assert-Check "CPRSTabStrip.tsx exists" (Test-Path "$repoRoot\apps\web\src\components\cprs\CPRSTabStrip.tsx")

# Regression: key patterns still present
Assert-Check "API still has /health endpoint" ($indexTs -match '/health')
Assert-Check "API still has /ready endpoint" ($indexTs -match '/ready')
Assert-Check "API still has /vista/ping" ($indexTs -match '/vista/ping')
Assert-Check "API still has circuit-breaker endpoint" ($indexTs -match 'circuit-breaker')
Assert-Check "Session still has createSession" ($sessionStore -match "export function createSession")
Assert-Check "Session still has getSession" ($sessionStore -match "export function getSession")
Assert-Check "Session still has destroySession" ($sessionStore -match "export function destroySession")
Assert-Check "Auth still has login route" ($authRoutes -match '/auth/login')
Assert-Check "Auth still has logout route" ($authRoutes -match '/auth/logout')
Assert-Check "Auth still has session route" ($authRoutes -match '/auth/session')

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($fail -gt 0) { exit 1 }
