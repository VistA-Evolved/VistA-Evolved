# Wave 33 Manifest -- Hospital Tier-0 Writeback Burn-Down + Certification

> Convert hospital-critical Tier-0 actions from "integration-pending" to real
> VistA writeback (or explicit "unsupported-in-sandbox" with capability
> reasoning). Covers ADT, Nursing, eMAR, Lab, Pharmacy write paths.

## Phase Map

| Wave Phase | Resolved ID | Title | Prompt Folder | Status |
|------------|-------------|-------|---------------|--------|
| W33-P1 | 481 | Reservation + Manifest + Tier-0 Backlog Freeze | `481-W33-P1-TIER0-RESERVATION` | Done |
| W33-P2 | 482 | Capability-Driven Routing | `482-W33-P2-CAPABILITY-ROUTING` | Planned |
| W33-P3 | 483 | ADT Writeback (Admit/Transfer/Discharge) | `483-W33-P3-ADT-WRITEBACK` | Planned |
| W33-P4 | 484 | Nursing Writeback (Vitals + I/O) | `484-W33-P4-NURSING-WRITEBACK` | Planned |
| W33-P5 | 485 | eMAR Writeback (Administer + Barcode Scan) | `485-W33-P5-EMAR-WRITEBACK` | Planned |
| W33-P6 | 486 | Lab Writeback (Order + Specimen + Result ACK) | `486-W33-P6-LAB-WRITEBACK` | Planned |
| W33-P7 | 487 | Pharmacy Writeback (Verify/Dispense + Safety) | `487-W33-P7-PHARMACY-WRITEBACK` | Planned |
| W33-P8 | 488 | UI Hardening (Eliminate Tier-0 Pending UX) | `488-W33-P8-UI-HARDENING` | Planned |
| W33-P9 | 489 | Hospital Day-in-the-Life Runner + Golden Traces | `489-W33-P9-HOSPITAL-DITL-RUNNER` | Planned |
| W33-P10 | 490 | Production Gates + Baseline Reduction | `490-W33-P10-PROD-GATES` | Planned |

## Scope

- P1: Wave reservation, tier-0 target inventory, backlog freeze
- P2: Standardize capability-driven response envelope; no silent pending on Tier-0 routes
- P3: ADT (Admit/Transfer/Discharge) -- probe DGPM RPCs, attempt real writeback, fallback with explicit unsupported reason
- P4: Nursing (Vitals write via GMV ADD VM, I/O) -- probe GMV RPCs, attempt real writeback
- P5: eMAR (PSB MED LOG, PSJBCMA) -- probe BCMA RPCs, wire real write or explicit sandbox limitation
- P6: Lab (ORWDX SAVE for lab orders, ORWLRR ACK) -- probe ordering RPCs with lab quick-orders
- P7: Pharmacy (PSO VERIFY, dispense RPCs) -- probe pharmacy RPCs
- P8: Remove all Tier-0 "integration-pending" from UI panels, replace with real status
- P9: End-to-end hospital day scenario runner with golden trace comparison
- P10: Budget reduction gate, evidence bundle, wave certification

## Reserved Range

- **Wave**: 33
- **Phases**: 481-490
- **Branch**: main
- **Owner**: agent

## Tier-0 Targets (Hospital-Critical Write Paths)

| Domain | Endpoint | Current Status | Target RPC(s) | Route File |
|--------|----------|----------------|---------------|------------|
| ADT | POST /vista/adt/admit | integration-pending | DGPM NEW ADMISSION | routes/adt/index.ts |
| ADT | POST /vista/adt/transfer | integration-pending | DGPM NEW TRANSFER | routes/adt/index.ts |
| ADT | POST /vista/adt/discharge | integration-pending | DGPM NEW DISCHARGE | routes/adt/index.ts |
| ADT | POST /vista/inpatient/admit | integration-pending | DGPM NEW ADMISSION | routes/inpatient/index.ts |
| ADT | POST /vista/inpatient/transfer | integration-pending | DGPM NEW TRANSFER | routes/inpatient/index.ts |
| ADT | POST /vista/inpatient/discharge | integration-pending | DGPM NEW DISCHARGE | routes/inpatient/index.ts |
| Nursing | POST /vista/nursing/mar/administer | integration-pending | PSB MED LOG | routes/nursing/index.ts |
| Nursing | GET /vista/nursing/tasks | integration-pending | NURS TASK LIST | routes/nursing/index.ts |
| Nursing | GET /vista/nursing/mar | integration-pending | PSB MED LOG | routes/nursing/index.ts |
| Nursing | GET /vista/nursing/io | integration-pending | GMV I/O | routes/nursing/index.ts |
| Nursing | GET /vista/nursing/assessments | integration-pending | NURS ASSESSMENTS | routes/nursing/index.ts |
| eMAR | GET /emar/history | integration-pending | PSB MED LOG | routes/emar/index.ts |
| eMAR | POST /emar/administer | integration-pending | PSB MED LOG | routes/emar/index.ts |
| eMAR | POST /emar/barcode-scan | integration-pending | PSJBCMA | routes/emar/index.ts |
| Lab | POST /vista/cprs/orders/lab | integration-pending | ORWDX SAVE | routes/cprs/orders-cpoe.ts |
| Lab | POST /vista/cprs/orders/imaging | integration-pending | ORWDX SAVE | routes/cprs/orders-cpoe.ts |
| Lab | POST /vista/cprs/orders/consult | integration-pending | ORWDX SAVE | routes/cprs/orders-cpoe.ts |
| Pharmacy | POST /vista/cprs/orders/sign | integration-pending | ORWOR1 SIG | routes/cprs/orders-cpoe.ts |
| Discharge | POST /discharge-workflow/* | integration-pending | DGPM RPCs | routes/discharge-workflow.ts |

## Dependencies

- Wave 32 tooling: capability snapshot, RPC contract traces, integration-pending budget
- RPC registry entries (existing exceptions for DGPM, PSB, PSJBCMA, LR, ORWDX*)
- WorldVistA Docker sandbox (port 9430)
