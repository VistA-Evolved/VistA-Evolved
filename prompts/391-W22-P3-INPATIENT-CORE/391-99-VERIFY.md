# Phase 391 — W22-P3 Inpatient Core: VERIFY

## Gates

| # | Gate | Method | Pass? |
|---|------|--------|-------|
| 1 | `types.ts` exports BedAssignment, AdtEvent, FlowsheetRow, VitalsEntry, WritebackPosture | grep | Y |
| 2 | `inpatient-store.ts` has 4 stores (beds, events, flowsheet, vitals) | grep | Y |
| 3 | `inpatient-routes.ts` registers 13+ routes under `/inpatient/` | grep | Y |
| 4 | `register-routes.ts` imports and registers `inpatientCoreRoutes` | grep | Y |
| 5 | `security.ts` has AUTH_RULES for `/inpatient/beds` (admin) and `/inpatient/` (session) | grep | Y |
| 6 | `store-policy.ts` has 4 inpatient store entries | grep | Y |
| 7 | Build passes: `pnpm exec tsc --noEmit` | CLI | Y |
| 8 | `getWritebackPosture()` returns GMV/TIU/DGPM posture | code | Y |
| 9 | Bed assign/discharge auto-records ADT events | code | Y |
| 10 | No PHI in log statements | grep | Y |
