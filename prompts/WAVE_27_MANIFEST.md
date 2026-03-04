# Wave 27 Manifest -- Inpatient/Pharmacy/Lab Deep Writeback

> Implement safe write-back paths for inpatient orders, pharmacy,
> and lab results using the RPC safe-harbor list from W26.

## Phase Map

| Wave Phase | Resolved ID | Title                                        | Prompt Folder                               | Status      |
| ---------- | ----------- | -------------------------------------------- | ------------------------------------------- | ----------- |
| W27-P1     | 431         | Inpatient ADT Event Write-Back               | `431-PHASE-431-INPATIENT-ADT-WRITEBACK`     | Not started |
| W27-P2     | 432         | Pharmacy Dispense Write-Back                 | `432-PHASE-432-PHARMACY-DISPENSE-WRITEBACK` | Not started |
| W27-P3     | 433         | Lab Order + Result Write-Back                | `433-PHASE-433-LAB-ORDER-RESULT-WRITEBACK`  | Not started |
| W27-P4     | 434         | Vitals + Flowsheet Write-Back                | `434-PHASE-434-VITALS-FLOWSHEET-WRITEBACK`  | Not started |
| W27-P5     | 435         | Write-Back Idempotency + Conflict Resolution | `435-PHASE-435-WRITEBACK-IDEMPOTENCY`       | Not started |
| W27-P6     | 436         | Write-Back Audit Trail + Rollback            | `436-PHASE-436-WRITEBACK-AUDIT-ROLLBACK`    | Not started |
| W27-P7     | 437         | Write-Back Integration Test Suite            | `437-PHASE-437-WRITEBACK-INTEGRATION-TESTS` | Not started |
| W27-P8     | 438         | W27 Integrity Audit + Evidence Bundle        | `438-PHASE-438-W27-INTEGRITY-AUDIT`         | Not started |

## Scope

Wave 27 implements **deep write-back** for clinical subsystems:

1. Inpatient ADT (Admit/Discharge/Transfer) events via DGPM RPCs
2. Pharmacy dispense/verification via PSO/PSJ RPCs
3. Lab order entry and result acknowledgment via LR/OR RPCs
4. Vitals and flowsheet data entry via GMV RPCs
5. Idempotency and conflict resolution across all write paths
6. Audit trail with rollback capability for failed writes
7. Integration tests covering all write-back paths
8. Wave-level integrity audit

## Prerequisites

- Wave 26 completed (Phases 423-430)
- VistA runtime baseline established (Phase 424)
- RPC safe-harbor list v2 available (Phase 426)
- Write-back feasibility report reviewed (Phase 427)

## Phase Range

- Reserved: 431-438 (8 phases)
- See `docs/qa/prompt-phase-range-reservations.json`
