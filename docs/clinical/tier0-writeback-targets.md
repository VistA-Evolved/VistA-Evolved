# Tier-0 Writeback Targets -- Wave 33

> Hospital-critical write paths that must transition from "integration-pending"
> to either real VistA writeback or explicit "unsupported-in-sandbox" with
> capability reasoning and evidence.

## Success Criteria

For each endpoint, one of:
1. **Real writeback**: RPC call succeeds, VistA data changes, response is `{ ok: true, source: "vista" }`
2. **Unsupported-in-sandbox**: RPC probed, capability documented, response is `{ ok: false, status: "unsupported-in-sandbox", reason: "...", capabilityProbe: {...} }`
3. **Never**: "integration-pending" with no capability evidence

## ADT Domain (Phase 483)

| Endpoint | Route File | Target RPC | VistA Package | FileMan Files | Sandbox Expectation |
|----------|-----------|------------|---------------|---------------|---------------------|
| POST /vista/adt/admit | routes/adt/index.ts | DGPM NEW ADMISSION | DG ADT | 405, 2 | Likely unsupported -- DGPM not in OR CPRS GUI CHART context |
| POST /vista/adt/transfer | routes/adt/index.ts | DGPM NEW TRANSFER | DG ADT | 405, 42 | Likely unsupported -- same reason |
| POST /vista/adt/discharge | routes/adt/index.ts | DGPM NEW DISCHARGE | DG ADT | 405, 2 | Likely unsupported -- same reason |
| POST /vista/inpatient/admit | routes/inpatient/index.ts | DGPM NEW ADMISSION | DG ADT | 405, 2 | Same as above |
| POST /vista/inpatient/transfer | routes/inpatient/index.ts | DGPM NEW TRANSFER | DG ADT | 405, 42 | Same as above |
| POST /vista/inpatient/discharge | routes/inpatient/index.ts | DGPM NEW DISCHARGE | DG ADT | 405, 2 | Same as above |

### ADT Notes
- DGPM package RPCs require their own broker context (DG ADT GUI) separate from OR CPRS GUI CHART
- Alternative approach: custom MUMPS routine (ZVEADT) that wraps DGPMV calls
- Read RPCs (ORWPT16 ADMITLST, ORQPT WARD PATIENTS) already work

## Nursing Domain (Phase 484)

| Endpoint | Route File | Target RPC | VistA Package | FileMan Files | Sandbox Expectation |
|----------|-----------|------------|---------------|---------------|---------------------|
| POST /vista/nursing/vitals (new) | routes/nursing/index.ts | GMV ADD VM | VITALS | 120.5 | **Likely works** -- GMV ADD VM is registered |
| GET /vista/nursing/tasks | routes/nursing/index.ts | NURS TASK LIST | NURS | Various | Likely unsupported -- NURS package not in sandbox |
| GET /vista/nursing/mar | routes/nursing/index.ts | PSB MED LOG | PSB (BCMA) | Various | Likely unsupported -- PSB not in sandbox |
| POST /vista/nursing/mar/administer | routes/nursing/index.ts | PSB MED LOG | PSB (BCMA) | Various | Likely unsupported -- PSB not in sandbox |
| GET /vista/nursing/io | routes/nursing/index.ts | GMV I/O | VITALS/NURS | 120.5 | Probe required -- may work via GMV |
| GET /vista/nursing/assessments | routes/nursing/index.ts | NURS ASSESSMENTS | NURS | Various | Likely unsupported |

### Nursing Notes
- GMV ADD VM is already in RPC_REGISTRY (domain: vitals, tag: write)
- Vitals write is the strongest candidate for real writeback
- BCMA (PSB) package is separate from CPRS and likely absent from WorldVistA Docker

## eMAR Domain (Phase 485)

| Endpoint | Route File | Target RPC | VistA Package | FileMan Files | Sandbox Expectation |
|----------|-----------|------------|---------------|---------------|---------------------|
| GET /emar/history | routes/emar/index.ts | PSB MED LOG | PSB (BCMA) | Various | Likely unsupported |
| POST /emar/administer | routes/emar/index.ts | PSB MED LOG | PSB (BCMA) | Various | Likely unsupported |
| POST /emar/barcode-scan | routes/emar/index.ts | PSJBCMA | PSJ (BCMA) | Various | Likely unsupported |

### eMAR Notes
- BCMA requires both PSB and PSJ packages
- These are NOT part of CPRS GUI context
- Read path (schedule via ORWPS ACTIVE, allergies via ORQQAL LIST) already works

## Lab Domain (Phase 486)

| Endpoint | Route File | Target RPC | VistA Package | FileMan Files | Sandbox Expectation |
|----------|-----------|------------|---------------|---------------|---------------------|
| POST /vista/cprs/orders/lab | routes/cprs/orders-cpoe.ts | ORWDX SAVE | OR | 100 | Needs lab quick-orders (may be empty in sandbox) |
| POST /vista/cprs/orders/imaging | routes/cprs/orders-cpoe.ts | ORWDX SAVE | OR | 100 | No imaging QOs in sandbox |
| POST /vista/cprs/orders/consult | routes/cprs/orders-cpoe.ts | ORWDX SAVE | OR | 100 | Needs ORDIALOG params |
| ORWLRR ACK | routes/cprs/orders-cpoe.ts | ORWLRR ACK | OR/LR | 63 | Probe required |

### Lab Notes
- ORWDX SAVE is in registry and likely callable
- The blocker is usually missing quick-order IENs, not missing RPCs
- Lab result ACK (ORWLRR ACK) may work if there are pending lab results

## Pharmacy Domain (Phase 487)

| Endpoint | Route File | Target RPC | VistA Package | FileMan Files | Sandbox Expectation |
|----------|-----------|------------|---------------|---------------|---------------------|
| POST /vista/cprs/orders/sign | routes/cprs/orders-cpoe.ts | ORWOR1 SIG | OR | 100 | Probe required -- needs valid order + esCode |
| Pharmacy verify | (new route) | ORWDXA VERIFY | OR | 100 | Probe required |
| Med reconciliation | routes/med-reconciliation.ts | PSO MED LIST | PSO | 52 | Likely works partially |

### Pharmacy Notes
- ORWOR1 SIG and ORWDXA VERIFY are in the registry
- Pharmacy dispensing (PSO routines) may not be exposed via OR CPRS GUI CHART
- Med reconciliation reads already use ORWPS ACTIVE

## Discharge Workflow (Phase 483, shared with ADT)

| Endpoint | Route File | Target RPC | Current Status |
|----------|-----------|------------|----------------|
| POST /discharge-workflow/* | routes/discharge-workflow.ts | DGPM discharge RPCs | integration-pending |

## Summary

| Domain | Total Endpoints | Likely Real Writeback | Likely Unsupported | Probe Needed |
|--------|----------------|----------------------|-------------------|--------------|
| ADT | 6 | 0 | 6 | 0 |
| Nursing | 6 | 1-2 (vitals) | 3-4 | 1 |
| eMAR | 3 | 0 | 3 | 0 |
| Lab | 4 | 1-2 | 1 | 1 |
| Pharmacy | 3 | 1 | 1 | 1 |
| Discharge | 1 | 0 | 1 | 0 |
| **Total** | **23** | **3-5** | **14-15** | **3** |

Expected outcome: ~5 endpoints get real writeback, ~15 become explicit
"unsupported-in-sandbox" with capability evidence, ~3 need runtime probing.
