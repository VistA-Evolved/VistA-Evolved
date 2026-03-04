# Wave 30 Manifest — Migration at Scale + Dual-Run + Reconciliation

Reserved range: **456–463** (8 phases)

| Phase  | ID  | Slug                  | Title                                                   |
| ------ | --- | --------------------- | ------------------------------------------------------- |
| W30-P1 | 456 | reservation-adrs      | Range Reservation + Manifest + Migration Strategy ADRs  |
| W30-P2 | 457 | fhir-bulk-import      | FHIR Bulk Import v1 (NDJSON + validation + idempotency) |
| W30-P3 | 458 | ccda-ingestion        | C-CDA Ingestion v1 (DocumentReference + parser)         |
| W30-P4 | 459 | hl7v2-adt-mpi         | HL7v2 ADT Truth Feed + MPI Reconciliation               |
| W30-P5 | 460 | dual-run-mode         | Dual-Run Mode (record differences, reconcile, cutover)  |
| W30-P6 | 461 | migration-mapping-ui  | Migration Mapping UI + Operator Tooling                 |
| W30-P7 | 462 | migration-cert-runner | Migration Certification Runner + Evidence Pack          |
| W30-P8 | 463 | cutover-automation-v2 | Cutover Automation v2 (timed, rollback, DR, evidence)   |

## Definition of Done

- Ingest common legacy exports, run dual-run reconciliation, and cut over safely with evidence.
