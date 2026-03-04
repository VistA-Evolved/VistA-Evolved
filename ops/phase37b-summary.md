# Phase 37B -- Operations Summary

## What Changed

Phase 37B implements the VistA/Vivian Grounding + CPRS Parity Enforcement system.
This phase stops dead-clicks, prevents invented behavior, and builds a mechanical
parity harness triangulating three truth sources.

### New Infrastructure

1. **CPRS Contract Extraction** (`scripts/extract_cprs_contract.mjs`)
   - Merges design/contracts/cprs/v1/ into a single grounding artifact
   - Output: `docs/grounding/cprs-contract.extracted.json`
   - 975 RPCs, 81 screens, 323 forms, 186+ menu items, 196+ UI actions

2. **RPC Catalog Endpoint** (`GET /vista/rpc-catalog`)
   - New M routine `ZVERPC.m` queries File 8994 for all registered RPCs
   - Installer: `scripts/install-rpc-catalog.ps1`
   - API endpoint with 60s cache, session-gated
   - Falls back gracefully if RPC not installed in sandbox

3. **Vivian/DOX Grounding Snapshot** (`scripts/vivian_snapshot.ts`)
   - Downloads DOX package pages from code.osehra.org/vivian/
   - Caches HTML in `docs/grounding/vivian-dox-cache/`
   - 16 packages indexed: OR, TIU, GMTS, LR, RA, PSO, PSJ, IB, PRCA, XU, HL, DG, GMR, GMRA, XWB, XUSRB
   - Output: `docs/grounding/vivian-index.json`

4. **Parity Matrix Builder** (`scripts/build_parity_matrix.ts`)
   - Triangulates contract + runtime catalog + Vivian index
   - Output: `docs/grounding/parity-matrix.json` + `parity-matrix.md`
   - 25/975 RPCs wired, 10/10 Delphi tabs wired, 0 unhandled UI actions

5. **Playwright Dead-Click Tests**
   - `clinical-flows.spec.ts` -- 11 clinical flow tests (Cover, Problems, Meds, Orders, Notes, Labs, Reports, Consults, Surgery, D/C Summ, Imaging)
   - `parity-enforcement.spec.ts` -- 6 tests validating parity matrix against live UI

6. **Verification Script** (`scripts/verify-phase37b-parity.ps1`)
   - 10 gate sections, 40+ gates
   - Delegates to Phase 37 for regression
   - Validates all grounding artifacts, RPC catalog, Vivian index, parity matrix

## How to Test Manually

```powershell
# 1. Generate grounding artifacts (offline -- no Docker needed)
node scripts/extract_cprs_contract.mjs
npx tsx scripts/vivian_snapshot.ts
npx tsx scripts/build_parity_matrix.ts

# 2. Install RPC catalog in Docker sandbox (requires wv container running)
.\scripts\install-rpc-catalog.ps1

# 3. Start API and test endpoint
cd apps/api
npx tsx --env-file=.env.local src/index.ts
# In another terminal:
curl http://localhost:3001/vista/rpc-catalog

# 4. Run full verification
.\scripts\verify-phase37b-parity.ps1 -SkipPlaywright

# 5. Run Playwright tests (needs API + web running)
cd apps/web
npx playwright test
```

## Verifier Output

Phase 37B verifier covers:

- G37B-0: Full regression (Phase 37 delegation)
- G37B-1: Prompt ordering integrity
- G37B-2: CPRS contract extraction (7 gates)
- G37B-3: RPC catalog endpoint (6 gates)
- G37B-4: Vivian/DOX grounding (5 gates)
- G37B-5: Parity matrix (8 gates)
- G37B-6: Playwright dead-click tests (11 gates)
- G37B-7: Security / secret scan (2 gates)
- G37B-8: Documentation (6 gates)
- G37B-9: TypeScript compilation (1 gate)

## Follow-ups

1. Wire more RPCs (950 remaining from Delphi contract -- prioritize by reference count)
2. Add problem write-back (ORQQPL ADD), consult results, D/C summary creation
3. Integrate runtime RPC catalog into parity matrix builder (requires live API)
4. Add periodic Vivian/DOX cache refresh (weekly CI job)
5. Extend Playwright to cover dialog interactions (add allergy, add problem, new note dialogs)
