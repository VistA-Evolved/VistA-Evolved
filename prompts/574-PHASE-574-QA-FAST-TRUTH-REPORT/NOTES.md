# Phase 574 Notes

## Problem

`docs/QA_GAUNTLET_FAST_RESULTS.md` was hand-written and became stale.
It showed 2 FAIL / 1 WARN from Session 9 (2026-03-04), but Phase 571
fixed the G0 naming issues and the gauntlet actually passes with
4 PASS / 0 FAIL / 1 WARN (pre-existing G3 secret scan).

## Solution

Automated generator script that always runs the real gauntlet and
transcribes the machine JSON output into a commit-stamped markdown report.
No human can accidentally leave stale numbers in the report.

## Key Design Decisions

- Script spawns gauntlet CLI with `--ci` flag for JSON stdout
- Also reads `artifacts/qa-gauntlet.json` as fallback
- Git SHA included in report header via `git rev-parse --short HEAD`
- Report format: summary table + per-gate detail sections
- Exit code mirrors gauntlet (non-zero if any gate FAILs)
