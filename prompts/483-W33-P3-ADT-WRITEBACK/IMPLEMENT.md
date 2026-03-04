# Phase 483 -- W33-P3: ADT Writeback (Admit/Transfer/Discharge)

## Objective

Convert 6 ADT integration-pending endpoints to capability-driven responses using
the `tier0Gate()` helper from Phase 482. Probes DGPM RPCs at runtime and returns
`unsupported-in-sandbox` with capability evidence.

## Steps

1. Import `tier0Gate` in `routes/adt/index.ts` and `routes/inpatient/index.ts`
2. Replace static `integration-pending` responses with `tier0Gate()` calls
3. Add immutable audit logging for ADT write attempts
4. Create prompt folder with IMPLEMENT + VERIFY + NOTES

## Files Touched

- `apps/api/src/routes/adt/index.ts` (modified)
- `apps/api/src/routes/inpatient/index.ts` (modified)
- `prompts/483-W33-P3-ADT-WRITEBACK/` (created)
