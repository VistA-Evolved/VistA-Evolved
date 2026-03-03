# Phase 557 — RC Gates Command — NOTES

## Summary

Created `pnpm qa:rc` — a single command that runs all 9 Wave 40 QA hygiene
gates sequentially and writes machine-readable evidence to
`artifacts/qa-rc-evidence.json`. Exit code 0 only if all 9 pass.

## Key Decisions

- **Sequential not parallel**: Gates scan the full file tree and running them
  in parallel would compete for I/O and make output unreadable.
- **60-second per-gate timeout**: Generous enough for slow CI runners but
  prevents infinite hangs from blocking the pipeline.
- **Evidence is an artifact**: Written to `artifacts/` (gitignored), not
  `docs/` or `reports/`, per project anti-sprawl rules.
- **Pure Node.js**: No test framework dependency — just `child_process` and
  `fs`. Keeps the gate runner itself dependency-free.

## Follow-ups

- Wire `pnpm qa:rc` into GitHub Actions CI as a required check.
- Consider adding a `--gate N` flag to run a single gate by number.
- Extend with Phase 36 k6 smoke tests as optional G10+ gates.
