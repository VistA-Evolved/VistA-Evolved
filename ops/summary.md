# Phase 136: Store Policy Gate + Durability Sweep

## What Changed

### New Files
- apps/api/src/platform/store-policy.ts -- 119 classified in-memory stores
- apps/api/tests/store-policy.test.ts -- 22 unit tests
- scripts/qa-gates/store-policy-gate.mjs -- Standalone CI gate
- qa/gauntlet/gates/g17-store-policy.mjs -- Gauntlet G17 gate
- docs/audits/system-store-inventory.json -- Generated inventory artifact
- prompts/141-PHASE-136-STORE-POLICY-GATE/ -- Prompt files

### Modified Files
- apps/api/src/posture/index.ts -- /posture/store-policy endpoint
- qa/gauntlet/cli.mjs -- G17 in RC (16 gates) + FULL (18 gates)
- docs/qa/phase-index.json -- Phase 136 entry added
- apps/api/tests/phases/phases-134-to-136.test.ts -- Generated phase spec

### Verification Fixes (VERIFY commit)
- scripts/qa-gates/store-policy-gate.mjs -- Fixed greedy regex (42->41 critical count)
- qa/gauntlet/gates/g17-store-policy.mjs -- Fixed cross-boundary regex for migrationTarget check
- apps/api/tests/rcm-quality-loop.test.ts -- Added mock WorkqueueRepo + async/await (Phase 114 refactor)
- apps/api/tests/job-worker-smoke.test.ts -- Updated job count 4->5 (Phase 118 pg_backup)
- apps/api/tests/scheduling-sd.test.ts -- Added session cookie + CSRF + 201|409 handling
- apps/api/tests/qa-api-routes.test.ts -- Health probe guard in beforeAll

## Verifier Output
- TypeScript: API, web, portal clean
- Unit tests: 22/22 store-policy tests PASS, 20/20 files (413/413 tests) full suite
- Store policy gate: PASS (119 entries, 41 critical+in_memory_only)
- Strict mode: correctly FAIL with exit 1
- Gauntlet FAST: 5P/0F/0W
- Gauntlet RC: 16P/0F/0W