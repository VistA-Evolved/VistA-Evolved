# Phase 136: Store Policy Gate + Durability Sweep

## What Changed

### New Files
- apps/api/src/platform/store-policy.ts -- 119 classified Map stores
- apps/api/tests/store-policy.test.ts -- 22 unit tests
- scripts/qa-gates/store-policy-gate.mjs -- Standalone CI gate
- qa/gauntlet/gates/g17-store-policy.mjs -- Gauntlet G17 gate
- docs/audits/system-store-inventory.json -- Generated inventory artifact
- prompts/141-PHASE-136-STORE-POLICY-GATE/ -- Prompt files

### Modified Files
- apps/api/src/posture/index.ts -- /posture/store-policy endpoint
- qa/gauntlet/cli.mjs -- G17 in RC (16 gates) + FULL (18 gates)

## Verifier Output
- TypeScript: API, web, portal clean
- Unit tests: 22/22 PASS
- Store policy gate: PASS
- Gauntlet FAST: 5P/0F/0W
- Gauntlet RC: 16P/0F/0W