# Phase 427 — Write-Back Feasibility Report (W26 P5)

## IMPLEMENT

### Goal
Produce a comprehensive write-back feasibility report grading every clinical
domain by VistA write-back readiness, identifying blockers, and establishing
the pre-requisite matrix for W27 (Inpatient/Pharmacy/Lab Deep Writeback).

### Steps
1. Audit all 18 classified write RPCs from `data/vista/rpc-safe-harbor-v2.json`
2. Cross-reference each domain's RPCs against adapter interfaces, route endpoints,
   and sandbox test results
3. Grade each domain: READY / PARTIAL / BLOCKED
4. Identify cross-cutting gaps (adapter layer, LOCK discipline, idempotency)
5. Create W27 readiness matrix mapping phases 431-438 to domain targets
6. Write `docs/vista/writeback-feasibility-report.md`

### Files Touched
- `docs/vista/writeback-feasibility-report.md` (NEW)
- `prompts/427-PHASE-427-WRITEBACK-FEASIBILITY/` (NEW)

### Data Sources
- `data/vista/rpc-safe-harbor-v2.json` — 18 RPCs, 5 tiers
- `data/vista/runtime-matrix.json` — domain requirements
- `apps/api/src/vista/rpcRegistry.ts` — 137+ registered RPCs
- `apps/api/src/vista/rpcCapabilities.ts` — known RPCs with domains
- `apps/api/src/adapters/types.ts` — adapter interfaces
- `apps/api/src/routes/cprs/` — write route endpoints
