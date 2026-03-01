# Phase 431 -- ADT + Clinical Write Adapter Methods -- VERIFY

## Gates

1. **Types added**: WardRecord, MovementRecord, AdmitRequest, TransferRequest,
   DischargeRequest, WriteResult in types.ts
2. **Interface extended**: ClinicalEngineAdapter has 9 new methods (4 write + 5 ADT)
3. **Stub implements all**: StubClinicalAdapter has all 9 new methods returning STUB_RESULT
4. **VistA adapter implements all**: getWards/getMovements wired to RPCs;
   writes return integration-pending with vistaGrounding
5. **DGPM RPCs registered**: 3 DGPM exceptions in rpcRegistry.ts
6. **No dead-click**: Write methods either work or return clear pending status
7. **Prompt folder**: `431-PHASE-431-ADT-ADAPTER-WRITES/` has IMPLEMENT + VERIFY + NOTES
8. **Linter**: `prompts-tree-health.mjs` -- 0 FAIL
