# Phase 574 — QA Fast Truth Report Refresh

## Objective

Create a deterministic generator script that runs the FAST gauntlet suite
and writes a fresh, commit-stamped `docs/QA_GAUNTLET_FAST_RESULTS.md`.

## Non-negotiable Rules

1. No invented results — report MUST come from an actual gauntlet run
2. No hand-editing of numbers — script reads JSON, writes markdown
3. If gauntlet cannot run, script fails loudly (no fabrication)

## Implementation Steps

1. Create `scripts/qa/regenerate-gauntlet-fast-report.mjs`
   - Spawns `node qa/gauntlet/cli.mjs --suite fast --ci`
   - Captures JSON from stdout
   - Gets current git SHA via `git rev-parse --short HEAD`
   - Writes `docs/QA_GAUNTLET_FAST_RESULTS.md` with:
     - Generated timestamp + commit SHA
     - Summary table (PASS/FAIL/WARN/SKIP counts)
     - Per-gate detail sections with sub-check tables
     - Duration
   - Exit code mirrors gauntlet exit code

2. Add npm script alias in root package.json:
   - `"qa:report:fast": "node scripts/qa/regenerate-gauntlet-fast-report.mjs"`

## Files Touched

- `scripts/qa/regenerate-gauntlet-fast-report.mjs` (new)
- `docs/QA_GAUNTLET_FAST_RESULTS.md` (regenerated)
- `package.json` (add script alias)
