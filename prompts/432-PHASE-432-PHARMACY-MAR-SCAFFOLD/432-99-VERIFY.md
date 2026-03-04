# Phase 432 — Verification

## Checks

1. `prompts-tree-health.mjs` passes (7/7 PASS, 0 FAIL)
2. `types.ts` exports all 7 new pharmacy/MAR interfaces
3. `interface.ts` declares all 6 new pharmacy/MAR methods
4. `stub-adapter.ts` implements all 6 pharmacy/MAR stubs
5. `vista-adapter.ts` implements `getInpatientMeds` as LIVE (ORWPS ACTIVE)
6. `vista-adapter.ts` returns integration-pending for 5 PSB/PSJ methods
7. `rpcRegistry.ts` has 3 new PSJ/PSB exceptions (PSJ VERIFY, PSJ ORDER STATUS, PSB VALIDATE ORDER)
8. All existing PSB/PSJ exceptions preserved (PSB MED LOG, PSB ALLERGY, PSJBCMA from Phase 138)
9. No new `console.log` statements added
10. TypeScript compilation clean (`tsc --noEmit` or import verification)
