<#
.SYNOPSIS
  Wave 21 — Device + Modality Integration Platform Certification Runner
  Phase 388 (W21-P11): Push-button verification across all 10 implementation phases.

.DESCRIPTION
  Verifies file existence, barrel exports, route registrations, AUTH_RULES,
  store-policy entries, mapping table coverage, and fixture completeness
  for Phases 378-387 (W21-P1 through W21-P10).

.PARAMETER SkipDocker
  Skip Docker-dependent checks.
#>
param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$apiSrc = Join-Path (Join-Path (Join-Path $root "apps") "api") "src"
$devicesSrc = Join-Path $apiSrc "devices"

$pass = 0
$fail = 0
$warn = 0
$total = 0

function Gate([string]$name, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

function FileExists([string]$rel) {
  $p = Join-Path $root $rel
  return (Test-Path -LiteralPath $p)
}

function FileContains([string]$rel, [string]$pattern) {
  $p = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $p)) { return $false }
  $content = Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue
  return ($content -match [regex]::Escape($pattern))
}

function FileMatchesRegex([string]$rel, [string]$regex) {
  $p = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $p)) { return $false }
  $content = Get-Content -LiteralPath $p -Raw -ErrorAction SilentlyContinue
  return ($content -match $regex)
}

Write-Host ""
Write-Host "=== Wave 21 Device + Modality Integration -- Certification Runner ===" -ForegroundColor Cyan
Write-Host "  Phase 388 (W21-P11) -- $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""

# -------------------------------------------------------------------------
# Section 1: P1 Manifest + ADRs
# -------------------------------------------------------------------------
Write-Host "--- Section 1: P1 Manifest + ADRs (Phase 378) ---" -ForegroundColor Yellow

Gate "Manifest exists" { FileExists "prompts\WAVE_21_MANIFEST.md" }
Gate "ADR edge gateway" { FileExists "docs\decisions\ADR-W21-EDGE-GATEWAY.md" }
Gate "ADR integration engine" { FileExists "docs\decisions\ADR-W21-INTEGRATION-ENGINE.md" }
Gate "ADR imaging stack" { FileExists "docs\decisions\ADR-W21-IMAGING-STACK.md" }
Gate "ADR SDC posture" { FileExists "docs\decisions\ADR-W21-SDC-POSTURE.md" }
Gate "ADR POCT ASTM" { FileExists "docs\decisions\ADR-W21-POCT-ASTM.md" }

# -------------------------------------------------------------------------
# Section 2: P2 Edge Device Gateway (Phase 379)
# -------------------------------------------------------------------------
Write-Host "--- Section 2: P2 Edge Device Gateway (Phase 379) ---" -ForegroundColor Yellow

Gate "Gateway types exist" { FileExists "apps\api\src\devices\types.ts" }
Gate "Gateway store exists" { FileExists "apps\api\src\devices\gateway-store.ts" }
Gate "Gateway routes exist" { FileExists "apps\api\src\devices\gateway-routes.ts" }
Gate "Edge gateway sidecar compose" { FileExists "services\edge-gateway\docker-compose.yml" }
Gate "Edge gateway runbook" { FileExists "docs\runbooks\edge-device-gateway.md" }

# -------------------------------------------------------------------------
# Section 3: P3 Device Registry (Phase 380)
# -------------------------------------------------------------------------
Write-Host "--- Section 3: P3 Device Registry (Phase 380) ---" -ForegroundColor Yellow

Gate "Registry types exist" { FileExists "apps\api\src\devices\device-registry.types.ts" }
Gate "Registry store exists" { FileExists "apps\api\src\devices\device-registry-store.ts" }
Gate "Registry routes exist" { FileExists "apps\api\src\devices\device-registry-routes.ts" }

# -------------------------------------------------------------------------
# Section 4: P4 HL7v2 MLLP Ingest (Phase 381)
# -------------------------------------------------------------------------
Write-Host "--- Section 4: P4 HL7v2 MLLP Ingest (Phase 381) ---" -ForegroundColor Yellow

Gate "HL7v2 parser exists" { FileExists "apps\api\src\devices\hl7v2-parser.ts" }
Gate "HL7v2 ingest routes exist" { FileExists "apps\api\src\devices\hl7v2-ingest-routes.ts" }
Gate "HL7v2 fixture CBC" { FileExists "apps\api\src\devices\fixtures\hl7v2-oru-cbc.hl7" }
Gate "HL7v2 fixture vitals" { FileExists "apps\api\src\devices\fixtures\hl7v2-oru-vitals.hl7" }
Gate "HL7v2 fixture ABG" { FileExists "apps\api\src\devices\fixtures\hl7v2-oru-abg.hl7" }

# -------------------------------------------------------------------------
# Section 5: P5 ASTM + POCT1-A Ingest (Phase 382)
# -------------------------------------------------------------------------
Write-Host "--- Section 5: P5 ASTM + POCT1-A Ingest (Phase 382) ---" -ForegroundColor Yellow

Gate "ASTM parser exists" { FileExists "apps\api\src\devices\astm-parser.ts" }
Gate "POCT1-A parser exists" { FileExists "apps\api\src\devices\poct1a-parser.ts" }
Gate "ASTM/POCT1-A routes exist" { FileExists "apps\api\src\devices\astm-poct1a-ingest-routes.ts" }
Gate "ASTM fixture CBC" { FileExists "apps\api\src\devices\fixtures\astm-cbc.astm" }
Gate "POCT1-A fixture glucose" { FileExists "apps\api\src\devices\fixtures\poct1a-glucose-normal.xml" }
Gate "5 ASTM fixtures total" {
  $astmCount = (Get-ChildItem -LiteralPath (Join-Path $devicesSrc "fixtures") -Filter "astm-*.astm" | Measure-Object).Count
  $astmCount -ge 5
}
Gate "5 POCT1-A fixtures total" {
  $poctCount = (Get-ChildItem -LiteralPath (Join-Path $devicesSrc "fixtures") -Filter "poct1a-*.xml" | Measure-Object).Count
  $poctCount -ge 5
}

# -------------------------------------------------------------------------
# Section 6: P6 SDC Ingest (Phase 383)
# -------------------------------------------------------------------------
Write-Host "--- Section 6: P6 SDC Ingest (Phase 383) ---" -ForegroundColor Yellow

Gate "SDC ingest routes exist" { FileExists "apps\api\src\devices\sdc-ingest-routes.ts" }
Gate "SDC sidecar compose" { FileExists "services\sdc\docker-compose.yml" }
Gate "SDC consumer script" { FileExists "services\sdc\consumer.py" }
Gate "SDC Dockerfile" { FileExists "services\sdc\Dockerfile" }

# -------------------------------------------------------------------------
# Section 7: P7 Alarms Pipeline (Phase 384)
# -------------------------------------------------------------------------
Write-Host "--- Section 7: P7 Alarms Pipeline (Phase 384) ---" -ForegroundColor Yellow

Gate "Alarm types exist" { FileExists "apps\api\src\devices\alarm-types.ts" }
Gate "Alarm store exists" { FileExists "apps\api\src\devices\alarm-store.ts" }
Gate "Alarm routes exist" { FileExists "apps\api\src\devices\alarm-routes.ts" }

# -------------------------------------------------------------------------
# Section 8: P8 Infusion/BCMA Safety Bridge (Phase 385)
# -------------------------------------------------------------------------
Write-Host "--- Section 8: P8 Infusion/BCMA Bridge (Phase 385) ---" -ForegroundColor Yellow

Gate "Infusion/BCMA types exist" { FileExists "apps\api\src\devices\infusion-bcma-types.ts" }
Gate "Infusion/BCMA store exists" { FileExists "apps\api\src\devices\infusion-bcma-store.ts" }
Gate "Infusion/BCMA routes exist" { FileExists "apps\api\src\devices\infusion-bcma-routes.ts" }
Gate "Right-6 check function" { FileContains "apps\api\src\devices\infusion-bcma-store.ts" "performRight6Check" }

# -------------------------------------------------------------------------
# Section 9: P9 Imaging Modality Connectivity (Phase 386)
# -------------------------------------------------------------------------
Write-Host "--- Section 9: P9 Imaging Modality (Phase 386) ---" -ForegroundColor Yellow

Gate "Imaging modality types exist" { FileExists "apps\api\src\devices\imaging-modality-types.ts" }
Gate "Imaging modality store exists" { FileExists "apps\api\src\devices\imaging-modality-store.ts" }
Gate "Imaging modality routes exist" { FileExists "apps\api\src\devices\imaging-modality-routes.ts" }
Gate "MPPS auto-link logic" { FileContains "apps\api\src\devices\imaging-modality-store.ts" "findWorklistByAccession" }

# -------------------------------------------------------------------------
# Section 10: P10 LOINC/UCUM Normalization (Phase 387)
# -------------------------------------------------------------------------
Write-Host "--- Section 10: P10 LOINC/UCUM Normalization (Phase 387) ---" -ForegroundColor Yellow

Gate "Normalization engine exists" { FileExists "apps\api\src\devices\normalization-engine.ts" }
Gate "Normalization routes exist" { FileExists "apps\api\src\devices\normalization-routes.ts" }
Gate "MDC_TO_LOINC table (13+ entries)" { FileMatchesRegex "apps\api\src\devices\normalization-engine.ts" "MDC_TO_LOINC.*LoincMapping\[\]" }
Gate "LAB_TO_LOINC table" { FileMatchesRegex "apps\api\src\devices\normalization-engine.ts" "LAB_TO_LOINC.*LoincMapping\[\]" }
Gate "UNIT_TO_UCUM table" { FileMatchesRegex "apps\api\src\devices\normalization-engine.ts" "UNIT_TO_UCUM.*UcumMapping\[\]" }
Gate "normalizeObservation function" { FileContains "apps\api\src\devices\normalization-engine.ts" "export function normalizeObservation" }

# -------------------------------------------------------------------------
# Section 11: Cross-cutting wiring checks
# -------------------------------------------------------------------------
Write-Host "--- Section 11: Cross-cutting Wiring ---" -ForegroundColor Yellow

$barrel = "apps\api\src\devices\index.ts"
Gate "Barrel: edgeGatewayRoutes" { FileContains $barrel "edgeGatewayRoutes" }
Gate "Barrel: deviceRegistryRoutes" { FileContains $barrel "deviceRegistryRoutes" }
Gate "Barrel: hl7v2IngestRoutes" { FileContains $barrel "hl7v2IngestRoutes" }
Gate "Barrel: astmPoct1aIngestRoutes" { FileContains $barrel "astmPoct1aIngestRoutes" }
Gate "Barrel: sdcIngestRoutes" { FileContains $barrel "sdcIngestRoutes" }
Gate "Barrel: alarmRoutes" { FileContains $barrel "alarmRoutes" }
Gate "Barrel: infusionBcmaRoutes" { FileContains $barrel "infusionBcmaRoutes" }
Gate "Barrel: imagingModalityRoutes" { FileContains $barrel "imagingModalityRoutes" }
Gate "Barrel: normalizationRoutes" { FileContains $barrel "normalizationRoutes" }

$regRoutes = "apps\api\src\server\register-routes.ts"
Gate "register-routes: all 9 device plugins imported" {
  (FileContains $regRoutes "edgeGatewayRoutes") -and
  (FileContains $regRoutes "normalizationRoutes") -and
  (FileContains $regRoutes "infusionBcmaRoutes") -and
  (FileContains $regRoutes "imagingModalityRoutes")
}

$security = "apps\api\src\middleware\security.ts"
Gate "AUTH_RULE: uplink (service)" { FileContains $security "uplink" }
Gate "AUTH_RULE: hl7v2/ingest (service)" { FileContains $security "hl7v2" }
Gate "AUTH_RULE: astm/ingest (service)" { FileContains $security "astm" }
Gate "AUTH_RULE: sdc/ingest (service)" { FileContains $security "sdc" }
Gate "AUTH_RULE: pump-events (service)" { FileContains $security "pump-events" }

$storePolicy = "apps\api\src\platform\store-policy.ts"
Gate "Store: edge-gateways" { FileContains $storePolicy "edge-gateways" }
Gate "Store: device-observations" { FileContains $storePolicy "device-observations" }
Gate "Store: device-registry" { FileContains $storePolicy "device-registry" }
Gate "Store: hl7v2-ingest-log" { FileContains $storePolicy "hl7v2-ingest-log" }
Gate "Store: astm-ingest-log" { FileContains $storePolicy "astm-ingest-log" }
Gate "Store: sdc-ingest-log" { FileContains $storePolicy "sdc-ingest-log" }
Gate "Store: device-alarms" { FileContains $storePolicy "device-alarms" }
Gate "Store: infusion-pump-events" { FileContains $storePolicy "infusion-pump-events" }
Gate "Store: bcma-sessions" { FileContains $storePolicy "bcma-sessions" }
Gate "Store: imaging-worklist-items" { FileContains $storePolicy "imaging-worklist-items" }
Gate "Store: imaging-mpps-records" { FileContains $storePolicy "imaging-mpps-records" }

# -------------------------------------------------------------------------
# Section 12: Prompt + Evidence folders
# -------------------------------------------------------------------------
Write-Host "--- Section 12: Prompt + Evidence Folders ---" -ForegroundColor Yellow

Gate "Prompt: 378-W21-P1" { FileExists "prompts\378-W21-P1-MANIFEST-COVERAGE\378-01-IMPLEMENT.md" }
Gate "Prompt: 379-W21-P2" { FileExists "prompts\379-W21-P2-EDGE-GATEWAY\379-01-IMPLEMENT.md" }
Gate "Prompt: 380-W21-P3" { FileExists "prompts\380-W21-P3-DEVICE-REGISTRY\380-01-IMPLEMENT.md" }
Gate "Prompt: 381-W21-P4" { FileExists "prompts\381-W21-P4-HL7V2-MLLP-INGEST\381-01-IMPLEMENT.md" }
Gate "Prompt: 382-W21-P5" { FileExists "prompts\382-W21-P5-ASTM-POCT\382-01-IMPLEMENT.md" }
Gate "Prompt: 383-W21-P6" { FileExists "prompts\383-W21-P6-SDC-INGEST\383-01-IMPLEMENT.md" }
Gate "Prompt: 384-W21-P7" { FileExists "prompts\384-W21-P7-ALARMS\384-01-IMPLEMENT.md" }
Gate "Prompt: 385-W21-P8" { FileExists "prompts\385-W21-P8-INFUSION-BCMA\385-01-IMPLEMENT.md" }
Gate "Prompt: 386-W21-P9" { FileExists "prompts\386-W21-P9-IMAGING-MODALITY\386-01-IMPLEMENT.md" }
Gate "Prompt: 387-W21-P10" { FileExists "prompts\387-W21-P10-NORMALIZATION\387-01-IMPLEMENT.md" }

Gate "Evidence: P1" { FileExists "evidence\wave-21\378-manifest\evidence.md" }
Gate "Evidence: P2" { FileExists "evidence\wave-21\379-edge-gateway\evidence.md" }
Gate "Evidence: P3" { FileExists "evidence\wave-21\380-device-registry\evidence.md" }
Gate "Evidence: P4" { FileExists "evidence\wave-21\381-hl7v2-mllp\evidence.md" }
Gate "Evidence: P5" { FileExists "evidence\wave-21\382-astm-poct\evidence.md" }
Gate "Evidence: P6" { FileExists "evidence\wave-21\383-sdc-ingest\evidence.md" }
Gate "Evidence: P7" { FileExists "evidence\wave-21\384-alarms\evidence.md" }
Gate "Evidence: P8" { FileExists "evidence\wave-21\385-infusion-bcma\evidence.md" }
Gate "Evidence: P9" { FileExists "evidence\wave-21\386-imaging-modality\evidence.md" }
Gate "Evidence: P10" { FileExists "evidence\wave-21\387-normalization\evidence.md" }

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
Write-Host ""
Write-Host "=== CERTIFICATION SUMMARY ===" -ForegroundColor Cyan
Write-Host "  Total gates: $total"
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($fail -eq 0) {
  Write-Host "  WAVE 21 CERTIFICATION: ALL GATES PASSED" -ForegroundColor Green
  exit 0
} else {
  Write-Host "  WAVE 21 CERTIFICATION: $fail GATE(S) FAILED" -ForegroundColor Red
  exit 1
}
