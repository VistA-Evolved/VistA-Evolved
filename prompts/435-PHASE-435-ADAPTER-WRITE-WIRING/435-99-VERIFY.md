# Phase 435 — Verification

## Checks

1. `prompts-tree-health.mjs` passes (7/7 PASS, 0 FAIL)
2. `addAllergy()` calls `safeCallRpcWithList("ORWDAL32 SAVE ALLERGY", ...)` with OREDITED LIST
3. `addVital()` calls `safeCallRpc("GMV ADD VM", ...)` with formatted param string
4. `createNote()` calls `TIU CREATE RECORD` then `TIU SET DOCUMENT TEXT` (2-step)
5. `addProblem()` calls `safeCallRpc("ORQQPL ADD SAVE", ...)` with 6 positional params
6. All 4 methods include vistaGrounding in success AND error responses
7. All 4 methods have try/catch with log.warn (not console.log)
8. No integration-pending stubs remain for the 4 wired methods
9. ADT methods (admitPatient, transferPatient, dischargePatient) still integration-pending
10. Pharmacy methods (Phase 432) still integration-pending
