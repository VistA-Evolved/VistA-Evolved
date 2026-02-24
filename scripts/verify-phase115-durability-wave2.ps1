# Phase 115 -- Durability Wave 2 Verifier
# Portal/Telehealth/Imaging/Idempotency DB-backed stores
#
# Usage: .\scripts\verify-phase115-durability-wave2.ps1 [-SkipDocker]

param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

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
    Write-Host "  FAIL  $name ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 115: Durability Wave 2 Verifier ===" -ForegroundColor Cyan

# ------------------------------------------------------------------
# Gate 1: Schema tables exist in schema.ts
# ------------------------------------------------------------------
Gate "schema.ts has portalMessage table" {
  $f = Get-Content "apps/api/src/platform/db/schema.ts" -Raw
  $f -match 'portalMessage\s*=\s*sqliteTable'
}
Gate "schema.ts has portalAppointment table" {
  $f = Get-Content "apps/api/src/platform/db/schema.ts" -Raw
  $f -match 'portalAppointment\s*=\s*sqliteTable'
}
Gate "schema.ts has telehealthRoom table" {
  $f = Get-Content "apps/api/src/platform/db/schema.ts" -Raw
  $f -match 'telehealthRoom\s*=\s*sqliteTable'
}
Gate "schema.ts has imagingWorkOrder table" {
  $f = Get-Content "apps/api/src/platform/db/schema.ts" -Raw
  $f -match 'imagingWorkOrder\s*=\s*sqliteTable'
}
Gate "schema.ts has imagingStudyLink table" {
  $f = Get-Content "apps/api/src/platform/db/schema.ts" -Raw
  $f -match 'imagingStudyLink\s*=\s*sqliteTable'
}
Gate "schema.ts has imagingUnmatched table" {
  $f = Get-Content "apps/api/src/platform/db/schema.ts" -Raw
  $f -match 'imagingUnmatched\s*=\s*sqliteTable'
}
Gate "schema.ts has idempotencyKey table" {
  $f = Get-Content "apps/api/src/platform/db/schema.ts" -Raw
  $f -match 'idempotencyKey\s*=\s*sqliteTable'
}

# ------------------------------------------------------------------
# Gate 2: DDL in migrate.ts
# ------------------------------------------------------------------
Gate "migrate.ts has 7 Phase 115 CREATE TABLE blocks" {
  $f = Get-Content "apps/api/src/platform/db/migrate.ts" -Raw
  ($f -match 'portal_message') -and ($f -match 'portal_appointment') -and
  ($f -match 'telehealth_room') -and ($f -match 'imaging_work_order') -and
  ($f -match 'imaging_study_link') -and ($f -match 'imaging_unmatched') -and
  ($f -match 'idempotency_key')
}

# ------------------------------------------------------------------
# Gate 3: Repo files exist
# ------------------------------------------------------------------
$repoFiles = @(
  "apps/api/src/platform/db/repo/portal-message-repo.ts",
  "apps/api/src/platform/db/repo/portal-appointment-repo.ts",
  "apps/api/src/platform/db/repo/telehealth-room-repo.ts",
  "apps/api/src/platform/db/repo/imaging-worklist-repo.ts",
  "apps/api/src/platform/db/repo/imaging-ingest-repo.ts",
  "apps/api/src/platform/db/repo/idempotency-repo.ts"
)
foreach ($rf in $repoFiles) {
  Gate "Repo file exists: $(Split-Path $rf -Leaf)" {
    Test-Path -LiteralPath $rf
  }
}

# ------------------------------------------------------------------
# Gate 4: Barrel exports
# ------------------------------------------------------------------
Gate "repo/index.ts exports all 6 Phase 115 repos" {
  $f = Get-Content "apps/api/src/platform/db/repo/index.ts" -Raw
  ($f -match 'portalMessageRepo') -and ($f -match 'portalAppointmentRepo') -and
  ($f -match 'telehealthRoomRepo') -and ($f -match 'imagingWorklistRepo') -and
  ($f -match 'imagingIngestRepo') -and ($f -match 'idempotencyRepo')
}

# ------------------------------------------------------------------
# Gate 5: Store modules have init functions
# ------------------------------------------------------------------
Gate "portal-messaging.ts has initMessageRepo" {
  $f = Get-Content "apps/api/src/services/portal-messaging.ts" -Raw
  $f -match 'export function initMessageRepo'
}
Gate "portal-appointments.ts has initAppointmentRepo" {
  $f = Get-Content "apps/api/src/services/portal-appointments.ts" -Raw
  $f -match 'export function initAppointmentRepo'
}
Gate "room-store.ts has initTelehealthRoomRepo" {
  $f = Get-Content "apps/api/src/telehealth/room-store.ts" -Raw
  $f -match 'export function initTelehealthRoomRepo'
}
Gate "imaging-worklist.ts has initWorklistRepo" {
  $f = Get-Content "apps/api/src/services/imaging-worklist.ts" -Raw
  $f -match 'export function initWorklistRepo'
}
Gate "imaging-ingest.ts has initIngestRepo" {
  $f = Get-Content "apps/api/src/services/imaging-ingest.ts" -Raw
  $f -match 'export function initIngestRepo'
}
Gate "idempotency.ts has initIdempotencyRepo" {
  $f = Get-Content "apps/api/src/middleware/idempotency.ts" -Raw
  $f -match 'export function initIdempotencyRepo'
}

# ------------------------------------------------------------------
# Gate 6: index.ts wiring blocks
# ------------------------------------------------------------------
Gate "index.ts wires portal messaging repo" {
  $f = Get-Content "apps/api/src/index.ts" -Raw
  $f -match 'portal-message-repo' -and $f -match 'initMessageRepo'
}
Gate "index.ts wires portal appointments repo" {
  $f = Get-Content "apps/api/src/index.ts" -Raw
  $f -match 'portal-appointment-repo' -and $f -match 'initAppointmentRepo'
}
Gate "index.ts wires telehealth room repo" {
  $f = Get-Content "apps/api/src/index.ts" -Raw
  $f -match 'telehealth-room-repo' -and $f -match 'initTelehealthRoomRepo'
}
Gate "index.ts wires imaging worklist repo" {
  $f = Get-Content "apps/api/src/index.ts" -Raw
  $f -match 'imaging-worklist-repo' -and $f -match 'initWorklistRepo'
}
Gate "index.ts wires imaging ingest repo" {
  $f = Get-Content "apps/api/src/index.ts" -Raw
  $f -match 'imaging-ingest-repo' -and $f -match 'initIngestRepo'
}
Gate "index.ts wires idempotency repo" {
  $f = Get-Content "apps/api/src/index.ts" -Raw
  $f -match 'idempotency-repo' -and $f -match 'initIdempotencyRepo'
}

# ------------------------------------------------------------------
# Gate 7: No raw Map stores remain as primary (should be cache only)
# ------------------------------------------------------------------
Gate "portal-messaging uses messageCache not messageStore" {
  $f = Get-Content "apps/api/src/services/portal-messaging.ts" -Raw
  ($f -match 'messageCache') -and -not ($f -match 'messageStore\s*=\s*new Map')
}
Gate "portal-appointments uses appointmentCache not appointmentStore" {
  $f = Get-Content "apps/api/src/services/portal-appointments.ts" -Raw
  ($f -match 'appointmentCache') -and -not ($f -match 'appointmentStore\s*=\s*new Map')
}
Gate "imaging-worklist uses worklistCache not worklistStore" {
  $f = Get-Content "apps/api/src/services/imaging-worklist.ts" -Raw
  ($f -match 'worklistCache') -and -not ($f -match 'worklistStore\s*=\s*new Map')
}
Gate "imaging-ingest uses linkageCache not linkageStore" {
  $f = Get-Content "apps/api/src/services/imaging-ingest.ts" -Raw
  ($f -match 'linkageCache') -and -not ($f -match 'linkageStore\s*=\s*new Map')
}

# ------------------------------------------------------------------
# Gate 8: No em-dash in PS1 (BUG-055)
# ------------------------------------------------------------------
Gate "No em-dash in this verifier" {
  $bytes = [System.IO.File]::ReadAllBytes("$PSScriptRoot\verify-phase115-durability-wave2.ps1")
  $text = [System.Text.Encoding]::UTF8.GetString($bytes)
  -not ($text -match '\u2014')
}

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
Write-Host "`n=== RESULTS: $pass/$total PASS, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail
