# Wave 17 — Multi-Facility / Department Packs + Workflow Inbox + Patient Communications

## Phase Range: 346-353 (8 phases)

| Phase  | ID  | Title                                     | Status       |
| ------ | --- | ----------------------------------------- | ------------ |
| W17-P1 | 346 | Range Reservation + Manifest + ADRs       | implementing |
| W17-P2 | 347 | Facility/Location Model + VistA mapping   | not-started  |
| W17-P3 | 348 | Department/Specialty RBAC Templates       | not-started  |
| W17-P4 | 349 | Department Packs (versioned config packs) | not-started  |
| W17-P5 | 350 | Unified Workflow Inbox                    | not-started  |
| W17-P6 | 351 | Patient Communications Service (PHI-safe) | not-started  |
| W17-P7 | 352 | Scheduling & Resource Layer               | not-started  |
| W17-P8 | 353 | Department Pack Certification Runner      | not-started  |

## ADRs

- [ADR-FACILITY-LOCATION-MODEL.md](../docs/decisions/ADR-FACILITY-LOCATION-MODEL.md)
- [ADR-DEPARTMENT-PACKS-MODEL.md](../docs/decisions/ADR-DEPARTMENT-PACKS-MODEL.md)
- [ADR-PATIENT-NOTIFICATIONS.md](../docs/decisions/ADR-PATIENT-NOTIFICATIONS.md)

## Definition of Done

- Multi-facility model exists with PG persistence
- Department packs enable/disable modules reproducibly
- Unified inbox works with ABAC
- Patient comms service exists with PHI-safe defaults
- Scheduling/resource layer supports clinics + telehealth
- Pack certification runner validates all pack types
