# Phase 291 — Certification Evidence Pack v2

## User request

Build a push-button evidence bundler that collects all certification artifacts
into a single, auditable evidence bundle with an index file.

## Implementation steps

1. Create `scripts/build-evidence-pack.mjs` -- scans evidence/, docs/runbooks/,
   scripts/verify-\*, tests/interop/, and config/ to build a manifest tree
2. Create `EVIDENCE_INDEX.md` generator -- summarizes all evidence by wave/phase
   with file counts, verifier statuses, and artifact checksums
3. Fail-loudly on missing artifacts (runbooks without matching verifiers, etc.)
4. Create runbook for evidence pack generation
5. Create verifier for Phase 291
6. Collect evidence

## Verification steps

- G1: `scripts/build-evidence-pack.mjs` exists
- G2: Script is executable via `node scripts/build-evidence-pack.mjs`
- G3: Script generates EVIDENCE_INDEX.md
- G4: Script generates evidence manifest JSON
- G5: Script detects missing artifacts (fail-loud)
- G6: Runbook exists
- G7: Prompt files exist

## Files touched

- scripts/build-evidence-pack.mjs (NEW)
- docs/runbooks/certification-evidence-pack.md (NEW)
- scripts/verify-phase291-evidence-pack.ps1 (NEW)
- prompts/298-PHASE-291-CERT-EVIDENCE-PACK-V2/291-01-IMPLEMENT.md (NEW)
- prompts/298-PHASE-291-CERT-EVIDENCE-PACK-V2/291-99-VERIFY.md (NEW)
