# Phase 483 -- W33-P3: NOTES

## Decisions
- All 6 ADT write endpoints (3 adt + 3 inpatient) converted to tier0Gate()
- DGPM RPCs probed via capability cache at runtime
- Audit trail records every ADT write attempt with capability probe result
- Response includes full capabilityProbe evidence payload
- Discharge workflow routes kept separate (will be addressed in P8 or P10)
