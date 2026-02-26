# Phase 149 -- Truth Refresh + Residual Gap Burn-Down (IMPLEMENT)

## Scope

No new features. This phase makes the repo truthful by regenerating stale
audit artifacts and burning down remaining high-severity gaps.

## Key work

### A) Regenerate truth artifacts
- `pnpm audit:system` to refresh `docs/audits/system-audit.md` and
  `qa/gauntlet/system-gap-matrix.json` against latest HEAD.

### B) Burndown diff report
- `docs/audits/phase149-burndown.md` with before/after SHA, gap deltas,
  and remaining high gaps.

### C) High-severity gap burndown
- For each remaining high gap: fix minimally, justify if external
  dependency blocks resolution, name target RPCs/adapters.
- Update store-policy registrations as needed.

### D) CI truth gates
- Ensure `audit:system` runs in gauntlet RC suite.
- Verify store-policy gate runs in RC.

## Files touched
- `docs/audits/system-audit.md` (REGENERATED)
- `qa/gauntlet/system-gap-matrix.json` (REGENERATED)
- `docs/audits/phase149-burndown.md` (NEW)
- Various store files (gap burndown fixes)
