# Phase 500 — Reservation + Manifest + RC Scope Freeze

## Files Changed
- `prompts/WAVE_35_MANIFEST.md` — Wave manifest with 10-phase map
- `docs/qa/prompt-phase-range-reservations.json` — Range reservation 500-509
- `docs/release/RC_SCOPE.md` — RC must-pass gates
- `docs/release/RC_EXIT_CRITERIA.md` — Severity policy + error budget thresholds

## Implementation Steps
1. Reserve phases 500-509 via `prompts-reserve-range.mjs`
2. Create WAVE_35_MANIFEST.md
3. Create RC_SCOPE.md defining every must-pass gate with exact commands
4. Create RC_EXIT_CRITERIA.md with severity policy and uptime requirements

## Policy Decisions
- RC_SCOPE gates are the canonical list — verify-rc.ps1 (P2) implements them
- P0/P1 defects are release blockers; P2 are not
- Downtime behavior is an explicit exit criterion
