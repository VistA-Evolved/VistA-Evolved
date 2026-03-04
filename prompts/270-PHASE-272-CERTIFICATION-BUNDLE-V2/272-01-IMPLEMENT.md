# Phase 272 — Certification Evidence Bundle v2

## User Request

Build an enhanced certification evidence bundle that unifies all Wave 8 scan outputs (security gauntlet, PHI audit, RPC contract replay, clinical invariants, GameDay drills) into a single `pnpm ops:evidence-v2` command. Produce machine-readable JSON, JUnit XML, and a human-readable index.

## Implementation Steps

1. Create `scripts/generate-certification-evidence-v2.mjs` that orchestrates:
   - All Phase 34 gates (typecheck, unit tests, secret scan, PHI leak scan)
   - Phase 267 RPC contract CI runner
   - Phase 268 clinical invariants CI runner
   - Phase 269 security gauntlet
   - Phase 270 PHI audit
   - Phase 271 GameDay drills (restore + rollback only, no destructive failover)
   - Audit chain verification snapshots
   - Git metadata + version stamps
   - SHA-256 manifest of all output files
2. Produce unified output directory: `artifacts/evidence/certification-v2/<build-id>/`
3. Create `docs/runbooks/evidence-bundle-v2.md` explaining usage
4. Evidence at `evidence/wave-8/P7-certification-bundle/`

## Verification Steps

- Script runs from repo root
- At least 8 sections in generated bundle-index.json
- SHA-256 manifest covers all generated files
- No PHI in any output artifact

## Files Touched

- `scripts/generate-certification-evidence-v2.mjs` (NEW)
- `docs/runbooks/evidence-bundle-v2.md` (NEW)
- `evidence/wave-8/P7-certification-bundle/bundle-index.md` (NEW)
