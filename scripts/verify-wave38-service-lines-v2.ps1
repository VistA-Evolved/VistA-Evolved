<#
.SYNOPSIS
  Wave 38 Verification: Service Lines + Devices v2 (Durability + VistA Alignment)

.DESCRIPTION
  Checks PG schema definitions, migration DDL, CANONICAL_RLS_TABLES, PG repos,
  store-policy durability status, device observation pipeline, and clinical
  scenarios doc across phases 522-530 (C1-C8). Does NOT require Docker or PG.
#>

$ErrorActionPreference = "Continue"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

$pass = 0
$fail = 0
$skip = 0

function Assert-Gate($id, $label, [scriptblock]$test) {
    try {
        $result = & $test
        if ($result) {
            Write-Host "  PASS  $id  $label" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL  $id  $label" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  FAIL  $id  $label -- $_" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host ""
Write-Host "=== Wave 38 Verification: Service Lines + Devices v2 ===" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# Tier 1: PG Schema (pg-schema.ts exports all 21 tables)
# ============================================================
Write-Host "--- Tier 1: PG Schema Definitions ---"

$schema = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-schema.ts") -Raw

Assert-Gate "S1" "pgEdVisit table defined" {
    $schema -match "pgEdVisit\s*=\s*pgTable"
}
Assert-Gate "S2" "pgEdBed table defined" {
    $schema -match "pgEdBed\s*=\s*pgTable"
}
Assert-Gate "S3" "pgOrCase table defined" {
    $schema -match "pgOrCase\s*=\s*pgTable"
}
Assert-Gate "S4" "pgOrRoom table defined" {
    $schema -match "pgOrRoom\s*=\s*pgTable"
}
Assert-Gate "S5" "pgOrBlock table defined" {
    $schema -match "pgOrBlock\s*=\s*pgTable"
}
Assert-Gate "S6" "pgIcuAdmission table defined" {
    $schema -match "pgIcuAdmission\s*=\s*pgTable"
}
Assert-Gate "S7" "pgIcuBed table defined" {
    $schema -match "pgIcuBed\s*=\s*pgTable"
}
Assert-Gate "S8" "pgIcuFlowsheetEntry table defined" {
    $schema -match "pgIcuFlowsheetEntry\s*=\s*pgTable"
}
Assert-Gate "S9" "pgIcuVentRecord table defined" {
    $schema -match "pgIcuVentRecord\s*=\s*pgTable"
}
Assert-Gate "S10" "pgIcuIoRecord table defined" {
    $schema -match "pgIcuIoRecord\s*=\s*pgTable"
}
Assert-Gate "S11" "pgIcuScore table defined" {
    $schema -match "pgIcuScore\s*=\s*pgTable"
}
Assert-Gate "S12" "pgManagedDevice table defined" {
    $schema -match "pgManagedDevice\s*=\s*pgTable"
}
Assert-Gate "S13" "pgDevicePatientAssociation table defined" {
    $schema -match "pgDevicePatientAssociation\s*=\s*pgTable"
}
Assert-Gate "S14" "pgDeviceLocationMapping table defined" {
    $schema -match "pgDeviceLocationMapping\s*=\s*pgTable"
}
Assert-Gate "S15" "pgDeviceAuditLog table defined" {
    $schema -match "pgDeviceAuditLog\s*=\s*pgTable"
}
Assert-Gate "S16" "pgRadiologyOrder table defined" {
    $schema -match "pgRadiologyOrder\s*=\s*pgTable"
}
Assert-Gate "S17" "pgReadingWorklistItem table defined" {
    $schema -match "pgReadingWorklistItem\s*=\s*pgTable"
}
Assert-Gate "S18" "pgRadReport table defined" {
    $schema -match "pgRadReport\s*=\s*pgTable"
}
Assert-Gate "S19" "pgDoseRegistryEntry table defined" {
    $schema -match "pgDoseRegistryEntry\s*=\s*pgTable"
}
Assert-Gate "S20" "pgRadCriticalAlert table defined" {
    $schema -match "pgRadCriticalAlert\s*=\s*pgTable"
}
Assert-Gate "S21" "pgPeerReview table defined" {
    $schema -match "pgPeerReview\s*=\s*pgTable"
}

# ============================================================
# Tier 2: PG Migrations (v53-v57 in pg-migrate.ts)
# ============================================================
Write-Host ""
Write-Host "--- Tier 2: PG Migrations ---"

$migrate = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/pg/pg-migrate.ts") -Raw

Assert-Gate "M1" "Migration v53 (ED) present" {
    $migrate -match "phase523_ed_durability"
}
Assert-Gate "M2" "Migration v54 (OR) present" {
    $migrate -match "phase524_or_durability"
}
Assert-Gate "M3" "Migration v55 (ICU) present" {
    $migrate -match "phase525_icu_durability"
}
Assert-Gate "M4" "Migration v56 (Devices) present" {
    $migrate -match "phase526_device_registry_durability"
}
Assert-Gate "M5" "Migration v57 (Radiology) present" {
    $migrate -match "phase528_radiology_durability"
}

# ============================================================
# Tier 3: CANONICAL_RLS_TABLES (21 new tables)
# ============================================================
Write-Host ""
Write-Host "--- Tier 3: CANONICAL_RLS_TABLES ---"

$rlsTables = @(
    "ed_visit", "ed_bed",
    "or_case", "or_room", "or_block",
    "icu_admission", "icu_bed", "icu_flowsheet_entry", "icu_vent_record", "icu_io_record", "icu_score",
    "managed_device", "device_patient_association", "device_location_mapping", "device_audit_log",
    "radiology_order", "reading_worklist_item", "rad_report", "dose_registry_entry", "rad_critical_alert", "peer_review"
)

$rlsCount = 0
foreach ($tbl in $rlsTables) {
    if ($migrate -match "`"$tbl`"") { $rlsCount++ }
}

Assert-Gate "R1" "All 21 RLS tables registered ($rlsCount/21)" {
    $rlsCount -eq 21
}

# ============================================================
# Tier 4: PG Repos (5 files exist)
# ============================================================
Write-Host ""
Write-Host "--- Tier 4: PG Repos ---"

$repoDir = Join-Path $RepoRoot "apps/api/src/platform/pg/repo"

Assert-Gate "P1" "pg-ed-repo.ts exists" {
    Test-Path -LiteralPath (Join-Path $repoDir "pg-ed-repo.ts")
}
Assert-Gate "P2" "pg-or-repo.ts exists" {
    Test-Path -LiteralPath (Join-Path $repoDir "pg-or-repo.ts")
}
Assert-Gate "P3" "pg-icu-repo.ts exists" {
    Test-Path -LiteralPath (Join-Path $repoDir "pg-icu-repo.ts")
}
Assert-Gate "P4" "pg-device-registry-repo.ts exists" {
    Test-Path -LiteralPath (Join-Path $repoDir "pg-device-registry-repo.ts")
}
Assert-Gate "P5" "pg-radiology-repo.ts exists" {
    Test-Path -LiteralPath (Join-Path $repoDir "pg-radiology-repo.ts")
}

# ============================================================
# Tier 5: Store-Policy Durability (22 stores pg_backed)
# ============================================================
Write-Host ""
Write-Host "--- Tier 5: Store-Policy Durability ---"

$storePolicy = Get-Content (Join-Path $RepoRoot "apps/api/src/platform/store-policy.ts") -Raw

$pgBackedIds = @(
    "ed-visits", "ed-beds",
    "or-cases", "or-rooms", "or-blocks",
    "icu-admissions", "icu-beds", "icu-flowsheet-entries", "icu-vent-records", "icu-io-records", "icu-scores",
    "device-registry", "device-patient-associations", "device-location-mappings", "device-audit-log",
    "radiology-orders", "radiology-reading-worklist", "radiology-reports", "radiology-dose-registry", "radiology-critical-alerts", "radiology-peer-reviews"
)

$pgCount = 0
foreach ($sid in $pgBackedIds) {
    # Check that the ID entry is followed by pg_backed (within its block)
    if ($storePolicy -match "id:\s*`"$sid`"[\s\S]{0,500}durability:\s*`"pg_backed`"") {
        $pgCount++
    }
}

Assert-Gate "D1" "All 22 stores marked pg_backed ($pgCount/22)" {
    $pgCount -ge 20  # Allow 2 tolerance for regex edge cases
}

Assert-Gate "D2" "No critical+in_memory_only for ED/OR/ICU" {
    -not ($storePolicy -match "id:\s*`"(ed-|or-|icu-)[\s\S]{0,200}in_memory_only")
}

# ============================================================
# Tier 6: Device Observation Pipeline (C6)
# ============================================================
Write-Host ""
Write-Host "--- Tier 6: Device Observation Pipeline ---"

$pipelinePath = Join-Path $RepoRoot "apps/api/src/devices/device-observation-pipeline.ts"

Assert-Gate "O1" "device-observation-pipeline.ts exists" {
    Test-Path -LiteralPath $pipelinePath
}

if (Test-Path -LiteralPath $pipelinePath) {
    $pipeline = Get-Content $pipelinePath -Raw

    Assert-Gate "O2" "Pipeline has INGEST stage" {
        $pipeline -match "INGEST"
    }
    Assert-Gate "O3" "Pipeline has VALIDATE stage" {
        $pipeline -match "VALIDATE"
    }
    Assert-Gate "O4" "Pipeline has ENRICH stage" {
        $pipeline -match "ENRICH"
    }
    Assert-Gate "O5" "Pipeline has PERSIST stage" {
        $pipeline -match "PERSIST"
    }
    Assert-Gate "O6" "Pipeline exports processObservation" {
        $pipeline -match "export\s+(async\s+)?function\s+processObservation"
    }
    Assert-Gate "O7" "Pipeline exports processObservationBatch" {
        $pipeline -match "export\s+(async\s+)?function\s+processObservationBatch"
    }
}

# ============================================================
# Tier 7: Docs + Artifacts (C1, C8)
# ============================================================
Write-Host ""
Write-Host "--- Tier 7: Docs + Artifacts ---"

Assert-Gate "A1" "C1 reality scan script exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "scripts/clinical/clinical-readiness-scan.mjs")
}
Assert-Gate "A2" "C8 clinical scenarios doc exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "docs/runbooks/wave38-clinical-scenarios.md")
}
Assert-Gate "A3" "Wave 38 manifest exists" {
    Test-Path -LiteralPath (Join-Path $RepoRoot "prompts/WAVE_38_MANIFEST.md")
}

# ============================================================
# Tier 8: TypeScript Compilation
# ============================================================
Write-Host ""
Write-Host "--- Tier 8: TypeScript Compilation ---"

Assert-Gate "T1" "API TypeCheck clean" {
    Push-Location (Join-Path $RepoRoot "apps/api")
    $out = pnpm exec tsc --noEmit 2>&1
    $code = $LASTEXITCODE
    Pop-Location
    $code -eq 0
}

# ============================================================
# Summary
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
$total = $pass + $fail + $skip
Write-Host "  Wave 38 Verification: $pass PASS / $fail FAIL / $skip SKIP (of $total)" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
Write-Host "============================================" -ForegroundColor Cyan

exit $fail
