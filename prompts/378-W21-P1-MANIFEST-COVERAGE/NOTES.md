# Phase 378 — W21-P1 NOTES

## Decisions
- BASE_PHASE computed as 378 (max existing = 377 from W20-P8)
- 11 phases reserved: 378-388
- OSS-first approach for all integration components
- Existing Orthanc imaging stack (Phase 22-24) will be extended, not replaced
- Existing HL7/HLO interop (Phase 21) will be extended for device ingest

## Key References
- W20 ended at Phase 377 (GA Evidence Bundle)
- Existing imaging: services/imaging/ (Orthanc + OHIF, Phase 22-24)
- Existing interop: routes/vista-interop.ts (Phase 21)
- Existing device concepts: imaging-devices.ts (Phase 24)
