# Phase 481 — W33-P1: Reservation + Manifest + Tier-0 Backlog Freeze

## Objective
Reserve Wave 33 (phases 481-490), create the wave manifest, generate
the Tier-0 integration-pending inventory, and establish the backlog freeze
baseline for the Hospital Tier-0 Writeback burn-down.

## Steps
1. Run `prompts-next-phase.mjs` to get BASE_PHASE (481)
2. Run `prompts-reserve-range.mjs --wave 33 --count 10`
3. Create `WAVE_33_MANIFEST.md` with resolved phase IDs P1-P10
4. Create `docs/clinical/tier0-writeback-targets.md` with exact endpoints,
   route files, target RPCs, and success criteria per domain
5. Generate `docs/qa/tier0-integration-pending.json` -- machine-readable
   snapshot of all Tier-0 integration-pending endpoints with line numbers
6. Take integration-pending budget baseline snapshot (292 occurrences)
7. Create this prompt folder with IMPLEMENT + VERIFY + NOTES

## Files Touched
- `prompts/WAVE_33_MANIFEST.md` (created)
- `prompts/481-W33-P1-TIER0-RESERVATION/` (created)
- `docs/clinical/tier0-writeback-targets.md` (created)
- `docs/qa/tier0-integration-pending.json` (created)

## Verification
- WAVE_33_MANIFEST.md exists and lists 10 phases
- Prompt folder exists with IMPLEMENT + VERIFY + NOTES
- tier0-writeback-targets.md lists all Tier-0 endpoints
- tier0-integration-pending.json is valid JSON with endpoint entries
- Integration-pending budget gate still passes (no regression)
