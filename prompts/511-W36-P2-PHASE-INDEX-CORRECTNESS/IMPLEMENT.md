# Phase 511 -- Phase Index Builder Correctness (IMPLEMENT)

## Goal

Fix the phase index builder so it correctly indexes both `NNN-PHASE-*` and
`NNN-W##-P##-*` folder conventions. Ensure known legacy duplicates are
documented in the gate and not treated as new failures.

## Deliverables

1. Update `scripts/build-phase-index.mjs` to handle all folder conventions.
2. Update `scripts/qa-gates/phase-index-gate.mjs` known duplicate list.
3. Regenerate `docs/qa/phase-index.json`.
4. Regenerate E2E and API test specs.

## Evidence

- `evidence/wave-36/511-W36-P2-PHASE-INDEX-CORRECTNESS/phase-index-build.txt`
- `evidence/wave-36/511-W36-P2-PHASE-INDEX-CORRECTNESS/phase-index-gate.txt`
