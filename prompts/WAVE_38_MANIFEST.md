# Wave 38 — Service Lines + Devices v2 (Durability + VistA Alignment)

## Phase Map

| Phase | Code | Title                                                 |
| ----- | ---- | ----------------------------------------------------- |
| 522   | C1   | Reality Scan Matrix (Durability + VistA Alignment)    |
| 523   | C2   | ED Durability v1 — PG tables + repo + route migration |
| 524   | C3   | OR/Anesthesia Durability v1 — PG tables + repo        |
| 525   | C4   | ICU Durability v1 — PG tables + repo                  |
| 526   | C5   | Device Registry Durability v1 — PG tables + repo      |
| 527   | C6   | Device Ingest → Clinical Observation Pipeline v1      |
| 528   | C7   | Radiology Integration v2 — PG durability              |
| 529   | C8   | End-to-End Clinical Scenarios + VistA Contract Traces |
| 530   | C9   | Certification Runner                                  |

## Scope

Convert 41 in-memory service-line/device/radiology stores to PG-backed
durable subsystems. All stores classified as `critical` or `clinical_data`
must be PG-backed after this wave. Operational/cache stores remain in-memory
with documented migration paths.

## PG Migration Versions

| Version | Phase    | Tables                                                                                                   |
| ------- | -------- | -------------------------------------------------------------------------------------------------------- |
| v53     | 523 (C2) | ed_visit, ed_bed                                                                                         |
| v54     | 524 (C3) | or_case, or_room, or_block                                                                               |
| v55     | 525 (C4) | icu_admission, icu_bed, icu_flowsheet_entry, icu_vent_record, icu_io_record, icu_score                   |
| v56     | 526 (C5) | managed_device, device_patient_association, device_location_mapping, device_audit_log                    |
| v57     | 528 (C7) | radiology_order, reading_worklist_item, rad_report, dose_registry_entry, rad_critical_alert, peer_review |

## Dependencies

- Wave 31 (Phases 464-471): Service-line in-memory stores
- Wave 21 (Phases 378-388): Device subsystem in-memory stores
- Wave 22 Phase 394: Radiology deep workflows in-memory stores
- Platform PG infrastructure (pg-schema, pg-migrate, store-resolver)
