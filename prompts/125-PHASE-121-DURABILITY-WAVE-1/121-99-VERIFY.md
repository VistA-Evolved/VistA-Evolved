# Phase 121 — DURABILITY WAVE 1 (ENTERPRISE RESTART SAFETY) — VERIFY

> **Goal:** Validate that the 4 migrated store groups survive API restart
> and that the system audit confirms reduced in-memory risk.

## Verification Gates

### G1 -- Schema existence

- [ ] 5 new tables exist in `schema.ts` (rcm_claim, rcm_remittance, rcm_claim_case, portal_access_log, scheduling_request)
- [ ] 5 matching CREATE TABLE blocks in `migrate.ts`

### G2 -- Repository files exist

- [ ] `platform/db/repo/rcm-claim-repo.ts` exists with CRUD ops
- [ ] `platform/db/repo/rcm-claim-case-repo.ts` exists with CRUD ops
- [ ] `platform/db/repo/access-log-repo.ts` exists with CRUD ops
- [ ] `platform/db/repo/scheduling-request-repo.ts` exists with CRUD ops
- [ ] All 4 exported from `platform/db/repo/index.ts`

### G3 -- Store files refactored to hybrid pattern

- [ ] `rcm/domain/claim-store.ts` has `initClaimStoreRepo()` function
- [ ] `rcm/claims/claim-store.ts` has `initClaimCaseRepo()` function
- [ ] `portal-iam/access-log-store.ts` has `initAccessLogRepo()` function
- [ ] `adapters/scheduling/vista-adapter.ts` has `initSchedulingRepo()` function

### G4 -- Wiring in index.ts

- [ ] 4 new init blocks in `index.ts` (claim store, claim case, access log, scheduling)

### G5 -- TypeScript + Build

- [ ] `npx tsc --noEmit` passes
- [ ] `pnpm -r build` passes

### G6 -- Audit improvement

- [ ] `pnpm audit:system` exits 0
- [ ] High-risk in-memory store count lower than Phase 120 baseline

### G7 -- Runbook

- [ ] `docs/runbooks/durability-wave-1.md` exists

### G8 -- No regressions

- [ ] QA Gauntlet FAST suite passes (5/5)
