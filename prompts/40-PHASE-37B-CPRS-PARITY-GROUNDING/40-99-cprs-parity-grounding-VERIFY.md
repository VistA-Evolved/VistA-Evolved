# Phase 37B -- Verify

## Verification Steps

1. Run `node scripts/extract_cprs_contract.mjs` -- must produce `docs/grounding/cprs-contract.extracted.json` with 975+ RPCs
2. Run `npx tsx scripts/vivian_snapshot.ts` -- must produce `docs/grounding/vivian-index.json` with 10+ packages
3. Run `npx tsx scripts/build_parity_matrix.ts` -- must produce `parity-matrix.json` with 0 unhandled UI actions
4. Run `.\scripts\verify-phase37b-parity.ps1 -SkipPlaywright` -- all gates except Playwright must PASS
5. (Optional live) Start API+web, install ZVERPC.m, run Playwright: `npx playwright test`

## Gate Summary

- G37B-0: Full regression (Phase 37)
- G37B-1: Prompt ordering
- G37B-2: CPRS contract extraction (7 gates)
- G37B-3: RPC catalog endpoint (6 gates)
- G37B-4: Vivian/DOX grounding (5 gates)
- G37B-5: Parity matrix (8 gates)
- G37B-6: Playwright dead-click tests (11 gates)
- G37B-7: Security scan (2 gates)
- G37B-8: Documentation (6 gates)
- G37B-9: TypeScript compilation (1 gate)
