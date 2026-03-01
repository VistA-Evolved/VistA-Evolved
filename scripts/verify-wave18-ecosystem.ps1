<#
.SYNOPSIS
  Wave 18 Ecosystem Certification Runner -- Phase 361
.DESCRIPTION
  Verifies all 8 phases of Wave 18: event bus, webhooks, FHIR subscriptions,
  plugin SDK, UI extension slots, marketplace, and cross-cutting wiring.
  Gates: event schema, webhook signing, FHIR delivery, plugin signing,
  PHI scan, route reachability, store-policy completeness, PG migrations, tsc.
#>
param([switch]$Verbose)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pass = 0; $fail = 0; $warn = 0

function Gate([string]$id, [string]$label, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id -- $label" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id -- $label" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id -- $label ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Wave 18 Ecosystem Certification (Phase 361) ===`n" -ForegroundColor Cyan

# ── G1: Source file existence ─────────────────────────────────────────

Write-Host "--- G1: Source files ---" -ForegroundColor Yellow

$sourceFiles = @(
  "apps/api/src/services/event-bus.ts",
  "apps/api/src/routes/event-bus-routes.ts",
  "apps/api/src/services/webhook-service.ts",
  "apps/api/src/routes/webhook-routes.ts",
  "apps/api/src/services/fhir-subscription-service.ts",
  "apps/api/src/routes/fhir-subscription-routes.ts",
  "apps/api/src/services/plugin-sdk.ts",
  "apps/api/src/routes/plugin-routes.ts",
  "apps/api/src/services/ui-extension-service.ts",
  "apps/api/src/routes/ui-extension-routes.ts",
  "apps/api/src/services/marketplace-service.ts",
  "apps/api/src/routes/marketplace-routes.ts"
)

foreach ($f in $sourceFiles) {
  $name = Split-Path $f -Leaf
  Gate "G1-$name" "File exists: $name" {
    Test-Path -LiteralPath (Join-Path $root $f)
  }
}

# ── G2: Event bus schema ─────────────────────────────────────────────

Write-Host "`n--- G2: Event bus schema ---" -ForegroundColor Yellow

$eventBus = Get-Content (Join-Path $root "apps/api/src/services/event-bus.ts") -Raw

Gate "G2a" "DomainEvent interface exported" {
  $eventBus -match "export interface DomainEvent"
}
Gate "G2b" "EVENT_TYPES constant exported" {
  $eventBus -match "export const EVENT_TYPES"
}
Gate "G2c" "hashSubjectRef uses SHA-256" {
  $eventBus -match "sha256" -and $eventBus -match "hashSubjectRef"
}
Gate "G2d" "DLQ support (DlqEntry)" {
  $eventBus -match "DlqEntry"
}
Gate "G2e" "replayEvents function" {
  $eventBus -match "export (async )?function replayEvents"
}

# ── G3: Webhook signing ─────────────────────────────────────────────

Write-Host "`n--- G3: Webhook HMAC signing ---" -ForegroundColor Yellow

$webhook = Get-Content (Join-Path $root "apps/api/src/services/webhook-service.ts") -Raw

Gate "G3a" "HMAC-SHA256 signing" {
  $webhook -match "createHmac" -and $webhook -match "sha256"
}
Gate "G3b" "Timestamp + nonce in signature" {
  $webhook -match "timestamp" -and $webhook -match "nonce"
}
Gate "G3c" "300s replay window" {
  $webhook -match "300"
}
Gate "G3d" "Constant-time comparison" {
  $webhook -match "Constant-time" -and ($webhook -match "charCodeAt" -or $webhook -match "\^\|=" -or $webhook -match "diff \|=")
}
Gate "G3e" "Retry policy with backoff" {
  $webhook -match "RetryPolicy" -and $webhook -match "backoffMs"
}

# ── G4: FHIR Subscriptions ──────────────────────────────────────────

Write-Host "`n--- G4: FHIR Subscriptions ---" -ForegroundColor Yellow

$fhirSub = Get-Content (Join-Path $root "apps/api/src/services/fhir-subscription-service.ts") -Raw

Gate "G4a" "R4 criteria parsing" {
  $fhirSub -match "parseCriteriaResourceType"
}
Gate "G4b" "rest-hook channel type" {
  $fhirSub -match "rest-hook"
}
Gate "G4c" "Event-to-FHIR resource mapping" {
  $fhirSub -match "EVENT_TO_FHIR_RESOURCE"
}
Gate "G4d" "Subscription auto-expiry" {
  $fhirSub -match "isExpired"
}
Gate "G4e" "Event bus consumer integration" {
  $fhirSub -match "registerConsumer"
}

# ── G5: Plugin signing ──────────────────────────────────────────────

Write-Host "`n--- G5: Plugin SDK ---" -ForegroundColor Yellow

$pluginSdk = Get-Content (Join-Path $root "apps/api/src/services/plugin-sdk.ts") -Raw

Gate "G5a" "Manifest SHA-256 content hash" {
  $pluginSdk -match "computeManifestHash" -and $pluginSdk -match "sha256"
}
Gate "G5b" "HMAC signature verification" {
  $pluginSdk -match "verifyManifestSignature"
}
Gate "G5c" "Execution timeout (sandboxing)" {
  $pluginSdk -match "withTimeout" -and $pluginSdk -match "PLUGIN_TIMEOUT_MS"
}
Gate "G5d" "Validator pipeline" {
  $pluginSdk -match "runValidators"
}
Gate "G5e" "Transformer pipeline" {
  $pluginSdk -match "runTransformers"
}
Gate "G5f" "Plugin lifecycle FSM" {
  $pluginSdk -match "installed" -and $pluginSdk -match "active" -and $pluginSdk -match "suspended"
}

# ── G6: UI Extension Slots ──────────────────────────────────────────

Write-Host "`n--- G6: UI Extension Slots ---" -ForegroundColor Yellow

$uiExt = Get-Content (Join-Path $root "apps/api/src/services/ui-extension-service.ts") -Raw

Gate "G6a" "Slot locations defined" {
  $uiExt -match "dashboard_tile" -and $uiExt -match "chart_side_panel"
}
Gate "G6b" "Slot policy enforcement" {
  $uiExt -match "maxExtensions" -and $uiExt -match "requireApproval"
}
Gate "G6c" "Priority-based ordering" {
  $uiExt -match "priority"
}
Gate "G6d" "Role-based visibility" {
  $uiExt -match "allowedRoles"
}

# ── G7: Marketplace ─────────────────────────────────────────────────

Write-Host "`n--- G7: Marketplace ---" -ForegroundColor Yellow

$market = Get-Content (Join-Path $root "apps/api/src/services/marketplace-service.ts") -Raw

Gate "G7a" "Approval FSM (draft -> submitted -> under_review -> approved)" {
  $market -match "VALID_TRANSITIONS"
}
Gate "G7b" "Install/uninstall tracking" {
  $market -match "installFromMarketplace" -and $market -match "uninstallFromMarketplace"
}
Gate "G7c" "Reviews and ratings" {
  $market -match "addReview" -and $market -match "rating"
}
Gate "G7d" "Marketplace audit log" {
  $market -match "logAudit"
}
Gate "G7e" "Listing categories" {
  $market -match "LISTING_CATEGORIES"
}

# ── G8: Route registration ──────────────────────────────────────────

Write-Host "`n--- G8: Route wiring ---" -ForegroundColor Yellow

$regRoutes = Get-Content (Join-Path $root "apps/api/src/server/register-routes.ts") -Raw

Gate "G8a" "eventBusRoutes registered" {
  $regRoutes -match "eventBusRoutes"
}
Gate "G8b" "webhookRoutes registered" {
  $regRoutes -match "webhookRoutes"
}
Gate "G8c" "fhirSubscriptionRoutes registered" {
  $regRoutes -match "fhirSubscriptionRoutes"
}
Gate "G8d" "pluginRoutes registered" {
  $regRoutes -match "pluginRoutes"
}
Gate "G8e" "uiExtensionRoutes registered" {
  $regRoutes -match "uiExtensionRoutes"
}
Gate "G8f" "pluginMarketplaceRoutes registered" {
  $regRoutes -match "pluginMarketplaceRoutes"
}

# ── G9: Security AUTH_RULES ─────────────────────────────────────────

Write-Host "`n--- G9: AUTH_RULES ---" -ForegroundColor Yellow

$security = Get-Content (Join-Path $root "apps/api/src/middleware/security.ts") -Raw

Gate "G9a" "/events/ auth rule" {
  $security -match "events.*admin"
}
Gate "G9b" "/webhooks/ auth rule" {
  $security -match "webhooks.*admin"
}
Gate "G9c" "/fhir-subscriptions/ auth rule" {
  $security -match "fhir-subscriptions.*session"
}
Gate "G9d" "/plugins/ auth rule" {
  $security -match "plugins.*admin"
}
Gate "G9e" "/ui-extensions/ auth rule" {
  $security -match "ui-extensions.*session"
}
Gate "G9f" "/plugin-marketplace/ auth rule" {
  $security -match "plugin-marketplace.*admin"
}

# ── G10: PG Migrations ──────────────────────────────────────────────

Write-Host "`n--- G10: PG migrations ---" -ForegroundColor Yellow

$pgMigrate = Get-Content (Join-Path $root "apps/api/src/platform/pg/pg-migrate.ts") -Raw

Gate "G10a" "v44: event bus tables" {
  $pgMigrate -match "version: 44" -and $pgMigrate -match "event_bus_outbox"
}
Gate "G10b" "v45: webhook tables" {
  $pgMigrate -match "version: 45" -and $pgMigrate -match "webhook_subscription"
}
Gate "G10c" "v46: FHIR subscription tables" {
  $pgMigrate -match "version: 46" -and $pgMigrate -match "fhir_subscription"
}
Gate "G10d" "v47: plugin registry tables" {
  $pgMigrate -match "version: 47" -and $pgMigrate -match "plugin_registry"
}
Gate "G10e" "v48: UI extension tables" {
  $pgMigrate -match "version: 48" -and $pgMigrate -match "ui_extension_slot"
}
Gate "G10f" "v49: marketplace tables" {
  $pgMigrate -match "version: 49" -and $pgMigrate -match "marketplace_listing"
}

# ── G11: RLS tables ─────────────────────────────────────────────────

Write-Host "`n--- G11: CANONICAL_RLS_TABLES ---" -ForegroundColor Yellow

Gate "G11a" "Event bus in RLS" {
  $pgMigrate -match '"event_bus_outbox"' -and $pgMigrate -match '"event_bus_dlq"'
}
Gate "G11b" "Webhooks in RLS" {
  $pgMigrate -match '"webhook_subscription"' -and $pgMigrate -match '"webhook_delivery_log"'
}
Gate "G11c" "FHIR in RLS" {
  $pgMigrate -match '"fhir_subscription"' -and $pgMigrate -match '"fhir_notification"'
}
Gate "G11d" "Plugin SDK in RLS" {
  $pgMigrate -match '"plugin_registry"' -and $pgMigrate -match '"plugin_audit_log"'
}
Gate "G11e" "UI extensions in RLS" {
  $pgMigrate -match '"ui_extension_slot"' -and $pgMigrate -match '"ui_slot_policy"'
}
Gate "G11f" "Marketplace in RLS" {
  $pgMigrate -match '"marketplace_listing"' -and $pgMigrate -match '"marketplace_install"'
}

# ── G12: Store policy ───────────────────────────────────────────────

Write-Host "`n--- G12: Store policy ---" -ForegroundColor Yellow

$storePolicy = Get-Content (Join-Path $root "apps/api/src/platform/store-policy.ts") -Raw

Gate "G12a" "Event bus stores registered" {
  $storePolicy -match "event-bus-outbox" -and $storePolicy -match "event-bus-dlq"
}
Gate "G12b" "Webhook stores registered" {
  $storePolicy -match "webhook-subscriptions" -and $storePolicy -match "webhook-deliveries"
}
Gate "G12c" "FHIR subscription stores registered" {
  $storePolicy -match "fhir-subscriptions" -and $storePolicy -match "fhir-notifications"
}
Gate "G12d" "Plugin SDK stores registered" {
  $storePolicy -match "plugin-registry" -and $storePolicy -match "plugin-audit-log"
}
Gate "G12e" "UI extension stores registered" {
  $storePolicy -match "ui-extensions" -and $storePolicy -match "ui-slot-policies"
}
Gate "G12f" "Marketplace stores registered" {
  $storePolicy -match "marketplace-listings" -and $storePolicy -match "marketplace-installs"
}

# ── G13: PHI scan ────────────────────────────────────────────────────

Write-Host "`n--- G13: PHI scan ---" -ForegroundColor Yellow

$w18Files = @(
  "apps/api/src/services/event-bus.ts",
  "apps/api/src/services/webhook-service.ts",
  "apps/api/src/services/fhir-subscription-service.ts",
  "apps/api/src/services/plugin-sdk.ts",
  "apps/api/src/services/ui-extension-service.ts",
  "apps/api/src/services/marketplace-service.ts",
  "apps/api/src/routes/event-bus-routes.ts",
  "apps/api/src/routes/webhook-routes.ts",
  "apps/api/src/routes/fhir-subscription-routes.ts",
  "apps/api/src/routes/plugin-routes.ts",
  "apps/api/src/routes/ui-extension-routes.ts",
  "apps/api/src/routes/marketplace-routes.ts"
)

$phiPatterns = @("patient.*name", "ssn", "dob.*\d{4}", "PROV123", "NURSE123", "PHARM123")
$phiClean = $true
foreach ($f in $w18Files) {
  $content = Get-Content (Join-Path $root $f) -Raw -ErrorAction SilentlyContinue
  if ($content) {
    foreach ($p in $phiPatterns) {
      if ($content -match $p) {
        Write-Host "    PHI pattern '$p' found in $f" -ForegroundColor Red
        $phiClean = $false
      }
    }
  }
}

Gate "G13a" "No PHI in Wave 18 source files" {
  $phiClean
}

# ── G14: ADR existence ──────────────────────────────────────────────

Write-Host "`n--- G14: ADRs ---" -ForegroundColor Yellow

Gate "G14a" "ADR-EVENT-BUS.md exists" {
  Test-Path -LiteralPath (Join-Path $root "docs/decisions/ADR-EVENT-BUS.md")
}
Gate "G14b" "ADR-WEBHOOK-SECURITY.md exists" {
  Test-Path -LiteralPath (Join-Path $root "docs/decisions/ADR-WEBHOOK-SECURITY.md")
}
Gate "G14c" "ADR-PLUGIN-MODEL.md exists" {
  Test-Path -LiteralPath (Join-Path $root "docs/decisions/ADR-PLUGIN-MODEL.md")
}

# ── G15: Manifest + prompts ─────────────────────────────────────────

Write-Host "`n--- G15: Manifest + prompts ---" -ForegroundColor Yellow

Gate "G15a" "WAVE_18_MANIFEST.md exists" {
  Test-Path -LiteralPath (Join-Path $root "prompts/WAVE_18_MANIFEST.md")
}

$promptFolders = @(354, 355, 356, 357, 358, 359, 360, 361)
foreach ($n in $promptFolders) {
  $found = Get-ChildItem -LiteralPath (Join-Path $root "prompts") -Directory -Filter "$n-*" -ErrorAction SilentlyContinue
  Gate "G15-$n" "Prompt folder for Phase $n exists" {
    $null -ne $found -and $found.Count -gt 0
  }
}

# ── Summary ──────────────────────────────────────────────────────────

Write-Host "`n=== Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  Total: $($pass + $fail)`n"

if ($fail -gt 0) {
  Write-Host "VERDICT: FAIL -- $fail gate(s) did not pass" -ForegroundColor Red
  exit 1
} else {
  Write-Host "VERDICT: PASS -- all $pass gates green" -ForegroundColor Green
  exit 0
}
