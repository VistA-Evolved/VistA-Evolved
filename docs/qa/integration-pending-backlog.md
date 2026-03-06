# Integration-Pending Backlog

> **Phase 480** — This document tracks the known `integration-pending` debt
> in `apps/api/src/`. The budget gate (`scripts/qa-gates/integration-pending-budget.mjs`)
> prevents the count from increasing without deliberate review.

## Current Baseline

- **Total**: 276 occurrences across 77 files
- **Established**: 2026-03-06
- **Budget tolerance**: 0 (strict — any increase fails the gate)

## Top Files by Count

| Count | File                                       | Domain    | Notes                                   |
| ----- | ------------------------------------------ | --------- | --------------------------------------- |
| 24    | `routes/nursing/index.ts`                  | Nursing   | Needs VistA Nursing package RPCs        |
| 19    | `routes/emar/index.ts`                     | eMAR      | Needs BCMA/PSB RPCs                     |
| 19    | `writeback/__tests__/adt-contract.test.ts` | ADT       | Test assertions for pending items       |
| 17    | `routes/cprs/orders-cpoe.ts`               | Orders    | Partial — sign + complex orders pending |
| 12    | `rcm/workflows/vista-source-map.ts`        | RCM       | VistA billing grounding pending         |
| 12    | `routes/vista-rcm.ts`                      | RCM       | IB/PRCA file access pending             |
| 10    | `workflows/department-packs.ts`            | Workflows | Department-specific packs               |
| 10    | `writeback/executors/adt-executor.ts`      | ADT       | ADT write-back pending                  |
| 9     | `rcm/eligibility/routes.ts`                | RCM       | Eligibility verification pending        |
| 9     | `routes/discharge-workflow.ts`             | Discharge | Discharge workflow pending              |

## Resolution Strategy

1. **VistA-first**: Each pending item has a `vistaGrounding` metadata block
   pointing to the exact VistA files, routines, and RPCs needed.
2. **Prioritize by domain**: Clinical (orders, notes, meds) > ADT > RCM > Nursing > eMAR
3. **Budget gate**: Any PR that increases the count must justify via `--update`
4. **Target**: Reduce by 10% per quarter through progressive VistA integration

## How to Reduce

```bash
# Find all pending items with their VistA grounding info
grep -rn "integration-pending" apps/api/src/ | head -30

# Run the budget report
node scripts/qa-gates/integration-pending-budget.mjs --report

# After resolving items, update the baseline
node scripts/qa-gates/integration-pending-budget.mjs --update
```
