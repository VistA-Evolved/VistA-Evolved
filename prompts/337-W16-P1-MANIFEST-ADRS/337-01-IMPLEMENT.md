# Phase 337 -- W16-P1: Range Reservation + Manifest + OSS/ADR Decisions

## Goal
Prevent prompt collisions, reserve phase range for Wave 16, and lock security
architecture decisions (authz, IAM, secrets, SIEM) before building.

## Steps
1. Created `scripts/prompts-next-phase.mjs` -- scans folders, manifests, reservations
2. Created `scripts/prompts-reserve-range.mjs` -- reserves contiguous ranges, checks overlaps
3. Computed BASE_PHASE = 337 (max used = 336 from W15 manifest)
4. Reserved range 337-345 in `/docs/qa/prompt-phase-range-reservations.json`
5. Created `/prompts/WAVE_16_MANIFEST.md` -- all 9 phases with resolved IDs
6. Created 4 ADRs under `/docs/adrs/`:
   - ADR-AUTHZ-POLICY-ENGINE.md -- Extend existing in-process engine (chosen)
   - ADR-SCIM-SUPPORT.md -- Build minimal SCIM v2 on existing stub (chosen)
   - ADR-SECRETS-ROTATION.md -- Hybrid envelope encryption (chosen)
   - ADR-SIEM-EXPORT.md -- Multi-sink streaming (chosen)

## Files Created
- `scripts/prompts-next-phase.mjs`
- `scripts/prompts-reserve-range.mjs`
- `docs/qa/prompt-phase-range-reservations.json`
- `prompts/WAVE_16_MANIFEST.md`
- `docs/adrs/ADR-AUTHZ-POLICY-ENGINE.md`
- `docs/adrs/ADR-SCIM-SUPPORT.md`
- `docs/adrs/ADR-SECRETS-ROTATION.md`
- `docs/adrs/ADR-SIEM-EXPORT.md`
- `evidence/wave-16/337-manifest/` (evidence artifacts)
