# Phase 557 — RC Gates Command — IMPLEMENT

## Context

Wave 40 introduced 9 independent QA hygiene gates (prompts-tree, wave-phase-lint,
prompts-quality, secret-scan, PHI-leak, RPC-trace, integration-pending-budget,
i18n-coverage, no-hardcoded-localhost). Running them individually is slow and
error-prone. A single `pnpm qa:rc` command is needed to run all gates
sequentially and produce a machine-readable evidence artifact.

## Implementation Steps

1. Created `scripts/qa-rc.mjs` — runs all 9 gates via `child_process.execFileSync`.
2. Each gate is executed as `node scripts/qa-gates/<name>.mjs` with a 60s timeout.
3. Results collected as `{gate, passed, durationMs, output}` tuples.
4. Summary written to `artifacts/qa-rc-evidence.json` (gitignored).
5. Exit code 0 if all pass, 1 if any fail.
6. Added `"qa:rc": "node scripts/qa-rc.mjs"` to root `package.json` scripts.

## Files Changed

| File | Action |
|------|--------|
| `scripts/qa-rc.mjs` | NEW — RC gates runner |
| `package.json` | MODIFIED — added `qa:rc` script |

## Decisions

- **Sequential execution**: Gates run one-at-a-time to keep output readable
  and avoid resource contention (some gates scan the entire file tree).
- **60s per-gate timeout**: Generous but bounded — prevents a hung gate from
  blocking CI indefinitely.
- **Evidence in artifacts/**: Follows the project convention that verification
  outputs are artifacts (gitignored), not documentation.
- **No npm dependency**: Pure Node.js `child_process` + `fs` — no test runner
  or framework needed.

## Evidence Captured

- `pnpm qa:rc` — 9/9 gates pass on initial run.
- `artifacts/qa-rc-evidence.json` — JSON with per-gate results and durations.
