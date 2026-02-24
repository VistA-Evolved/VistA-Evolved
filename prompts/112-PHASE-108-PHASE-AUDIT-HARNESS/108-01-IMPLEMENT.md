# Phase 108 -- Phase Audit Harness (IMPLEMENT)

## Request

Build a phase-by-phase QA backfill generator that:
- Scans prompts/ and builds `docs/qa/phase-index.json`
- Generates executable Playwright + Vitest QA packs per phase
- Provides progressive QA runner (`pnpm qa:phase`, `pnpm qa:range`, `pnpm qa:all`)
- CI enforcement: PR = qa:smoke + qa:api + qa:security + phase-index; Nightly = qa:all + phase-audit
- Prompts ordering enforcement gate (phase-index integrity)

## Implementation Steps

1. Create `scripts/build-phase-index.mjs` -- scans prompts/, extracts routes/RPCs/UI per phase
2. Create `scripts/generate-phase-qa.mjs` -- reads phase-index.json, generates E2E + API specs
3. Create `scripts/phase-qa-runner.mjs` -- progressive runner (phase N, range N M, all)
4. Create `scripts/qa-gates/phase-index-gate.mjs` -- validates phase-index.json consistency
5. Wire into qa-runner.mjs (phase-audit suite), package.json scripts, CI workflow
6. Generate test specs: 7 E2E buckets + 2 API buckets covering 95/115 phases

## Verification

- `node scripts/build-phase-index.mjs` succeeds, produces 115-phase index
- `node scripts/generate-phase-qa.mjs` produces 9 spec files
- `node scripts/qa-gates/phase-index-gate.mjs` passes all 6 checks
- `pnpm qa:phase-audit` exits 0
- Root package.json has qa:phase, qa:range, qa:phase-index, qa:phase-audit
- CI workflow has phase-index gate in PR job + phase-audit in nightly

## Files Touched

- scripts/build-phase-index.mjs (NEW)
- scripts/generate-phase-qa.mjs (NEW)
- scripts/phase-qa-runner.mjs (NEW)
- scripts/qa-gates/phase-index-gate.mjs (NEW)
- scripts/qa-runner.mjs (MODIFIED -- +phase-audit suite)
- package.json (MODIFIED -- +4 scripts)
- .github/workflows/qa-gauntlet.yml (MODIFIED -- +2 steps)
- docs/qa/phase-index.json (GENERATED)
- apps/web/e2e/phases/*.spec.ts (GENERATED -- 7 files)
- apps/api/tests/phases/*.test.ts (GENERATED -- 2 files)
- docs/runbooks/phase108-phase-audit-harness.md (NEW)
