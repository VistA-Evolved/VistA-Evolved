# Phase 432 — Pharmacy / MAR / BCMA Adapter Scaffold (W27 P2)

## Objective
Extend the ClinicalEngineAdapter with inpatient pharmacy, MAR (Medication
Administration Record), and BCMA (Bar Code Medication Administration) types
and methods. PSB/PSJ/BCMA packages are NOT available in the WorldVistA Docker
sandbox, so all write methods return integration-pending with detailed
vistaGrounding metadata and migration paths.

## Implementation Steps

1. **Add 7 pharmacy/MAR types to `adapters/types.ts`**:
   - `InpatientMedOrder` — unit dose / IV order shape with pharmacist verification fields
   - `MAREntry` — single administration time slot with status, witness, site
   - `MedAdminRequest` — record given/refused/held/not-given action
   - `BarcodeScanResult` — resolved medication from BCMA barcode scan
   - `PharmacyVerifyRequest` — pharmacist verification request
   - `PharmacyVerifyResult` — verification outcome

2. **Extend `ClinicalEngineAdapter` interface with 6 methods**:
   - `getInpatientMeds(dfn)` — inpatient med orders (UD + IV)
   - `getMAR(dfn, dateRange?)` — MAR entries with due times
   - `recordAdministration(request)` — BCMA med admin recording
   - `scanBarcode(barcode, patientDfn?)` — BCMA barcode resolution
   - `getAdminHistory(dfn, orderIen?)` — administration history
   - `verifyOrder(request)` — pharmacist order verification

3. **Update stub adapter**: 6 new stubs returning STUB_RESULT

4. **Update VistA adapter**:
   - `getInpatientMeds`: LIVE via ORWPS ACTIVE (filters UD/IV types)
   - Remaining 5: integration-pending with PSB/PSJ target RPCs and vistaGrounding

5. **Add 3 PSJ/PSB exceptions to rpcRegistry.ts**:
   - `PSJ VERIFY` — inpatient pharmacy verification
   - `PSJ ORDER STATUS` — order status lookup
   - `PSB VALIDATE ORDER` — BCMA scan-time validation

## Files Changed
- `apps/api/src/adapters/types.ts` — +7 interfaces
- `apps/api/src/adapters/clinical-engine/interface.ts` — +6 methods
- `apps/api/src/adapters/clinical-engine/stub-adapter.ts` — +6 stubs
- `apps/api/src/adapters/clinical-engine/vista-adapter.ts` — +6 methods (1 live, 5 pending)
- `apps/api/src/vista/rpcRegistry.ts` — +3 exceptions
