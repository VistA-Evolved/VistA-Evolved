# Phase 433 — Lab HL7 Inbound Path (W27 P3)

## Objective
Create the HL7v2 ORU^R01 lab result inbound pipeline scaffold.
Bridges the existing HL7 engine (parser, ORU pack, domain mapper)
to a new lab result staging store with validation, quarantine, and
manual patient linking.

## Implementation Steps

1. **Create `hl7/lab-inbound/types.ts`**: 7 types
   - `SpecimenInfo` — specimen type, source, collection/received times
   - `LabFilingStatus` — 6-state lifecycle (received→validated→filed→acknowledged)
   - `InboundLabResult` — full staged result with HL7 metadata + VistA matching
   - `InboundObservation` — individual OBX observation
   - `LabValidationResult` — validation errors + warnings
   - `LabFilingTarget` — VistA integration-pending metadata

2. **Create `hl7/lab-inbound/store.ts`**: In-memory staging store
   - `stageLabResult()` — stage with auto-generated ID (LR-YYYYMMDD-NNNN)
   - `getLabResult()`, `listLabResults()` — query with filter/limit
   - `updateLabStatus()` — lifecycle transitions
   - `getQuarantinedResults()` — unmatched/failed results
   - `linkLabToPatient()` — manual DFN linking
   - `validateLabResult()` — 12 validation rules (5 error, 7 warning)
   - `getLabStoreStats()` — store metrics

3. **Create `hl7/lab-inbound/handler.ts`**: ORU^R01 processor
   - `processOruR01(rawMessage)` — full HL7 parse → validate → stage pipeline
   - Extracts: MSH, PID, OBR, OBX, SPM segments
   - Auto-quarantines invalid results
   - `getLabFilingTarget()` — VistA filing metadata with 5-step migration path

4. **Create `hl7/lab-inbound/index.ts`**: Barrel export

5. **Add 2 RPC exceptions to registry**: LRFZX (filing routine), LR VERIFY

## Files Created
- `apps/api/src/hl7/lab-inbound/types.ts`
- `apps/api/src/hl7/lab-inbound/store.ts`
- `apps/api/src/hl7/lab-inbound/handler.ts`
- `apps/api/src/hl7/lab-inbound/index.ts`

## Files Modified
- `apps/api/src/vista/rpcRegistry.ts` — +2 exceptions (LRFZX, LR VERIFY)
