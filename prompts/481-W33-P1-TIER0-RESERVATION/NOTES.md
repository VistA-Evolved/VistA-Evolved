# Phase 481 — W33-P1: NOTES

## Decisions
- Wave 33 = Hospital Tier-0 Writeback Burn-Down + Certification
- 10 phases covering ADT, Nursing, eMAR, Lab, Pharmacy, UI, Runner, Gates
- Baseline: 292 integration-pending occurrences in 69 files
- Tier-0 targets: 19 endpoints across 6 route files

## Tier-0 Domain Summary
| Domain | Endpoints | Primary RPCs |
|--------|-----------|-------------|
| ADT | 6 (3 adt + 3 inpatient) | DGPM NEW ADMISSION/TRANSFER/DISCHARGE |
| Nursing | 5 | PSB MED LOG, GMV I/O, NURS TASK/ASSESS |
| eMAR | 3 | PSB MED LOG, PSJBCMA |
| Lab/Orders | 3 | ORWDX SAVE (lab/imaging/consult QOs) |
| Pharmacy | 1 | ORWOR1 SIG |
| Discharge | 1+ | DGPM RPCs |

## Risks
- DGPM RPCs may not be exposed in OR CPRS GUI CHART context
- PSB/PSJBCMA packages may not exist in WorldVistA Docker
- Lab quick-orders empty in sandbox -- ORWDX SAVE needs them
- Success means: real writeback OR explicit "unsupported-in-sandbox" with evidence
