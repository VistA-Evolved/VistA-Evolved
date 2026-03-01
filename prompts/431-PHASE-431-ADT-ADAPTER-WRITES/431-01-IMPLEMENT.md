# Phase 431 -- ADT + Clinical Write Adapter Methods (W27 P1)

## IMPLEMENT

### Goal
Add write methods to the ClinicalEngineAdapter interface and ADT (Admission/
Discharge/Transfer) type definitions. This closes the biggest architectural
gap identified in Phase 427: all clinical writes bypassed the adapter layer.

### Steps
1. Add ADT types to `adapters/types.ts`: WardRecord, MovementRecord,
   AdmitRequest, TransferRequest, DischargeRequest, WriteResult
2. Add write methods to `ClinicalEngineAdapter` interface:
   addAllergy, addVital, createNote, addProblem
3. Add ADT methods to `ClinicalEngineAdapter` interface:
   getWards, getMovements, admitPatient, transferPatient, dischargePatient
4. Implement stub adapter for all new methods
5. Implement VistA adapter: reads wired to RPCs, writes return integration-pending
   with vistaGrounding metadata
6. Register DGPM write RPCs as exceptions in rpcRegistry.ts

### Files Touched
- `apps/api/src/adapters/types.ts` (MODIFIED -- ADT types + WriteResult)
- `apps/api/src/adapters/clinical-engine/interface.ts` (MODIFIED -- 9 new methods)
- `apps/api/src/adapters/clinical-engine/stub-adapter.ts` (MODIFIED -- 9 stubs)
- `apps/api/src/adapters/clinical-engine/vista-adapter.ts` (MODIFIED -- 9 implementations)
- `apps/api/src/vista/rpcRegistry.ts` (MODIFIED -- 3 DGPM exceptions)
- `prompts/431-PHASE-431-ADT-ADAPTER-WRITES/` (NEW)
