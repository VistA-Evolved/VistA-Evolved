# Phase 557 — W40-P15 — RC Gates Command

## User request
Create a one-shot `pnpm qa:rc` command that runs all 9 Wave 40 hygiene gates
and writes evidence to artifacts/.

## Implementation steps
1. Created `scripts/qa-rc.mjs` with 9 sequential gates:
   - G1 prompts-tree-health
   - G2 wave-phase-lint
   - G3 prompts-quality-gate
   - G4 secret-scan
   - G5 phi-leak-scan
   - G6 rpc-trace-compare
   - G7 integration-pending-budget
   - G8 i18n-coverage-gate
   - G9 no-hardcoded-localhost
2. Added `"qa:rc": "node scripts/qa-rc.mjs"` to root package.json
3. Evidence written to `artifacts/qa-rc-evidence.json`

## Verification steps
- `pnpm qa:rc` — 9 pass, 0 fail

## Files touched
- `scripts/qa-rc.mjs` (NEW)
- `package.json` (MODIFIED — added qa:rc script)
