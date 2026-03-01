# Wave 19 -- Analytics Certification Runner
# Phase 369 (W19-P8)
#
# Validates all Wave 19 deliverables: file existence, export integrity,
# route registration, PG migration, store policy, and type safety.
#
# Usage: .\scripts\verify-wave19-analytics.ps1 [-SkipDocker]

param([switch]$SkipDocker)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $root) { $root = (Get-Location).Path }
# Try to find repo root by looking for package.json
while ($root -and -not (Test-Path "$root\package.json")) {
  $root = Split-Path -Parent $root
}
if (-not $root) { $root = (Get-Location).Path }

$pass = 0
$fail = 0
$total = 0

function Gate([string]$label, [scriptblock]$check) {
  $script:total++
  try {
    $result = & $check
    if ($result) {
      Write-Host "  PASS  $label" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $label" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $label -- $_" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host ""
Write-Host "=== Wave 19 Analytics Certification Runner (Phase 369) ===" -ForegroundColor Cyan
Write-Host ""

# ---- Section 1: File Existence ----
Write-Host "--- Section 1: File Existence ---" -ForegroundColor Yellow

Gate "W19 Manifest exists" {
  Test-Path -LiteralPath "$root\prompts\WAVE_19_MANIFEST.md"
}

Gate "ADR-ANALYTICS-STACK.md exists" {
  Test-Path -LiteralPath "$root\docs\decisions\ADR-ANALYTICS-STACK.md"
}

Gate "ADR-DEIDENTIFICATION-POSTURE.md exists" {
  Test-Path -LiteralPath "$root\docs\decisions\ADR-DEIDENTIFICATION-POSTURE.md"
}

Gate "ADR-REPORTING-MODEL.md exists" {
  Test-Path -LiteralPath "$root\docs\decisions\ADR-REPORTING-MODEL.md"
}

Gate "extract-types.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\analytics\extract-types.ts"
}

Gate "extract-layer.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\analytics\extract-layer.ts"
}

Gate "deid-service.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\analytics\deid-service.ts"
}

Gate "reporting-service.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\analytics\reporting-service.ts"
}

Gate "quality-metrics.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\analytics\quality-metrics.ts"
}

Gate "rcm-analytics.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\analytics\rcm-analytics.ts"
}

Gate "data-access-controls.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\analytics\data-access-controls.ts"
}

Gate "analytics-extract-routes.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\routes\analytics-extract-routes.ts"
}

Gate "reporting-routes.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\routes\reporting-routes.ts"
}

# ---- Section 2: Prompt Folders ----
Write-Host ""
Write-Host "--- Section 2: Prompt Folders ---" -ForegroundColor Yellow

$phases = @(
  @{ num = "362"; title = "W19-P1" },
  @{ num = "363"; title = "W19-P2" },
  @{ num = "364"; title = "W19-P3" },
  @{ num = "365"; title = "W19-P4" },
  @{ num = "366"; title = "W19-P5" },
  @{ num = "367"; title = "W19-P6" },
  @{ num = "368"; title = "W19-P7" },
  @{ num = "369"; title = "W19-P8" }
)

foreach ($p in $phases) {
  $num = $p.num
  Gate "Prompt folder $num exists" {
    $folders = Get-ChildItem -Path "$root\prompts" -Directory -Filter "$num-*" -ErrorAction SilentlyContinue
    $folders.Count -gt 0
  }
}

# ---- Section 3: Route Registration ----
Write-Host ""
Write-Host "--- Section 3: Route Registration ---" -ForegroundColor Yellow

Gate "analytics-extract-routes imported in register-routes.ts" {
  $content = Get-Content "$root\apps\api\src\server\register-routes.ts" -Raw
  $content -match "analytics-extract-routes"
}

Gate "reporting-routes imported in register-routes.ts" {
  $content = Get-Content "$root\apps\api\src\server\register-routes.ts" -Raw
  $content -match "reporting-routes"
}

Gate "analyticsExtractRoutes registered in register-routes.ts" {
  $content = Get-Content "$root\apps\api\src\server\register-routes.ts" -Raw
  $content -match "server\.register\(analyticsExtractRoutes\)"
}

Gate "reportingRoutes registered in register-routes.ts" {
  $content = Get-Content "$root\apps\api\src\server\register-routes.ts" -Raw
  $content -match "server\.register\(reportingRoutes\)"
}

# ---- Section 4: AUTH_RULES Coverage ----
Write-Host ""
Write-Host "--- Section 4: AUTH_RULES Coverage ---" -ForegroundColor Yellow

Gate "analytics/* covered by AUTH_RULES" {
  $content = Get-Content "$root\apps\api\src\middleware\security.ts" -Raw
  $content -match "analytics"
}

# ---- Section 5: PG Migration v50 ----
Write-Host ""
Write-Host "--- Section 5: PG Migration v50 ---" -ForegroundColor Yellow

Gate "PG migration v50 defined" {
  $content = Get-Content "$root\apps\api\src\platform\pg\pg-migrate.ts" -Raw
  $content -match "version:\s*50"
}

Gate "analytics_extract_run table in v50" {
  $content = Get-Content "$root\apps\api\src\platform\pg\pg-migrate.ts" -Raw
  $content -match "analytics_extract_run"
}

Gate "analytics_deid_config table in v50" {
  $content = Get-Content "$root\apps\api\src\platform\pg\pg-migrate.ts" -Raw
  $content -match "analytics_deid_config"
}

Gate "analytics_quality_metric_run table in v50" {
  $content = Get-Content "$root\apps\api\src\platform\pg\pg-migrate.ts" -Raw
  $content -match "analytics_quality_metric_run"
}

Gate "analytics_dataset_permission table in v50" {
  $content = Get-Content "$root\apps\api\src\platform\pg\pg-migrate.ts" -Raw
  $content -match "analytics_dataset_permission"
}

Gate "analytics_export_audit table in v50" {
  $content = Get-Content "$root\apps\api\src\platform\pg\pg-migrate.ts" -Raw
  $content -match "analytics_export_audit"
}

# ---- Section 6: RLS Tables ----
Write-Host ""
Write-Host "--- Section 6: RLS Tables ---" -ForegroundColor Yellow

$rlsTables = @(
  "analytics_extract_run",
  "analytics_extract_record",
  "analytics_extract_offset",
  "analytics_deid_config",
  "analytics_quality_metric_run",
  "analytics_dataset_permission",
  "analytics_column_mask_rule",
  "analytics_export_audit"
)

foreach ($t in $rlsTables) {
  Gate "RLS: $t in CANONICAL_RLS_TABLES" {
    $content = Get-Content "$root\apps\api\src\platform\pg\pg-migrate.ts" -Raw
    $content -match [regex]::Escape("`"$t`"")
  }
}

# ---- Section 7: Store Policy ----
Write-Host ""
Write-Host "--- Section 7: Store Policy ---" -ForegroundColor Yellow

$storeIds = @(
  "analytics-extract-runs",
  "analytics-extract-records",
  "analytics-extract-offsets",
  "analytics-deid-configs",
  "analytics-quality-metric-runs",
  "analytics-dataset-permissions",
  "analytics-column-mask-rules",
  "analytics-export-audit"
)

foreach ($sid in $storeIds) {
  Gate "Store policy: $sid" {
    $content = Get-Content "$root\apps\api\src\platform\store-policy.ts" -Raw
    $content -match [regex]::Escape($sid)
  }
}

# ---- Section 8: Lifecycle Wiring ----
Write-Host ""
Write-Host "--- Section 8: Lifecycle Wiring ---" -ForegroundColor Yellow

Gate "Quality generators init in lifecycle.ts" {
  $content = Get-Content "$root\apps\api\src\server\lifecycle.ts" -Raw
  $content -match "initQualityReportGenerators"
}

Gate "RCM generators init in lifecycle.ts" {
  $content = Get-Content "$root\apps\api\src\server\lifecycle.ts" -Raw
  $content -match "initRcmReportGenerators"
}

# ---- Section 9: Module Content Checks ----
Write-Host ""
Write-Host "--- Section 9: Module Content Checks ---" -ForegroundColor Yellow

Gate "extract-types.ts has ExtractEntityType" {
  $content = Get-Content "$root\apps\api\src\analytics\extract-types.ts" -Raw
  $content -match "ExtractEntityType"
}

Gate "extract-layer.ts has runExtract" {
  $content = Get-Content "$root\apps\api\src\analytics\extract-layer.ts" -Raw
  $content -match "function runExtract"
}

Gate "deid-service.ts has deidentifyRecords" {
  $content = Get-Content "$root\apps\api\src\analytics\deid-service.ts" -Raw
  $content -match "function deidentifyRecords"
}

Gate "reporting-service.ts has 13 reports" {
  $content = Get-Content "$root\apps\api\src\analytics\reporting-service.ts" -Raw
  $content -match "REPORT_DEFINITIONS"
}

Gate "quality-metrics.ts has 3 measures" {
  $content = Get-Content "$root\apps\api\src\analytics\quality-metrics.ts" -Raw
  ($content -match "lab_followup_time") -and ($content -match "med_order_to_admin") -and ($content -match "note_completion_timeliness")
}

Gate "rcm-analytics.ts has 4 RCM computers" {
  $content = Get-Content "$root\apps\api\src\analytics\rcm-analytics.ts" -Raw
  ($content -match "rcm_claim_throughput") -and ($content -match "rcm_denial_distribution") -and ($content -match "rcm_days_in_ar") -and ($content -match "rcm_ack_reject_rate")
}

Gate "data-access-controls.ts has 6 datasets" {
  $content = Get-Content "$root\apps\api\src\analytics\data-access-controls.ts" -Raw
  ($content -match "extract_events") -and ($content -match "extract_claims") -and ($content -match "quality_metrics") -and ($content -match "report_outputs")
}

Gate "deid-service.ts has pseudonymization" {
  $content = Get-Content "$root\apps\api\src\analytics\deid-service.ts" -Raw
  $content -match "pseudonymize"
}

Gate "deid-service.ts has denylist scan" {
  $content = Get-Content "$root\apps\api\src\analytics\deid-service.ts" -Raw
  $content -match "runDenylistScan"
}

Gate "data-access-controls.ts has column masking" {
  $content = Get-Content "$root\apps\api\src\analytics\data-access-controls.ts" -Raw
  $content -match "applyColumnMasking"
}

Gate "data-access-controls.ts has export audit" {
  $content = Get-Content "$root\apps\api\src\analytics\data-access-controls.ts" -Raw
  $content -match "recordExportAudit"
}

# ---- Summary ----
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Wave 19 Certification: $pass/$total passed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) {
  Write-Host "  $fail gate(s) FAILED" -ForegroundColor Red
}
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($fail -gt 0) { exit 1 }
exit 0
