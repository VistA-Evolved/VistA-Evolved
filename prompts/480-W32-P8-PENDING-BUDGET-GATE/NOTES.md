# Phase 480 — W32-P8: NOTES

## Decisions
- Used regex `/integration[._-]pending/gi` to catch all variants (hyphenated, dotted, underscored)
- Node.js scanner found 292 vs PowerShell's 344 — difference is regex strictness
- Tolerance defaults to 0 (strict) — can be relaxed for branches with known debt
- Baseline is committed JSON, not generated at CI time — this is intentional so
  drift is always measured against a known reference point
- BOM stripping handles PowerShell-generated JSON files (BUG-064)

## Integration with CI
- Add to CI pipeline: `node scripts/qa-gates/integration-pending-budget.mjs`
- Fails with exit 1 if budget exceeded
- PRs that increase the count must run `--update` and justify in commit message

## Follow-ups
- Wire into gauntlet as G13
- Add Slack/Teams notification on budget breach
- Auto-label PRs that touch integration-pending items
