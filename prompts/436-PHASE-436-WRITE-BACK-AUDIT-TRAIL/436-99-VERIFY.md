# Phase 436 — Verification

## Checks
1. `prompts-tree-health.mjs` passes (7/7 PASS, 0 FAIL)
2. `adapter-audit.ts` exports `auditAdapterWrite` with correct type signature
3. `vista-adapter.ts` imports and calls `auditAdapterWrite` in all 4 write methods
4. Each method emits audit on success AND failure paths
5. Each method emits audit in catch block on exception
6. `store-policy.ts` has `adapter-write-audit` entry
7. No `console.log` added (uses `log.warn` per convention)
8. Write actions match immutableAudit type union: write.allergy, write.vitals, write.note, write.problem
