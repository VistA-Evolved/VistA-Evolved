# Phase 247 — Wave 6 Certification Suite (IMPLEMENT)

## User Request
Certify Wave 6 (P1-P9, phases 238-246) by collecting evidence,
running all phase verifiers, generating a wave summary snapshot,
and updating the wave manifest with final commit SHAs.

## Implementation Steps

1. Create `scripts/verify-wave6-certification.ps1` — runs all 9 phase verifiers,
   collects PASS/FAIL counts, generates summary
2. Create `docs/waves/wave6-certification-snapshot.md` — completion table with
   commits, QA gate results, key metrics, new tooling
3. Create `ops/phase247-summary.md` and `ops/phase247-notion-update.json`
4. Update `docs/waves/WAVE6-MANIFEST.md` with commit SHAs and status
5. Update `scripts/verify-latest.ps1` to delegate to wave6 certification

## Files Touched
- `scripts/verify-wave6-certification.ps1` (NEW)
- `docs/waves/wave6-certification-snapshot.md` (NEW)
- `docs/waves/WAVE6-MANIFEST.md` (EDIT)
- `scripts/verify-latest.ps1` (EDIT)
- `ops/phase247-summary.md` (NEW)
- `ops/phase247-notion-update.json` (NEW)
