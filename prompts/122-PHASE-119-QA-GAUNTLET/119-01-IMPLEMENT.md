# Phase 119 -- QA Gauntlet Generator (IMPLEMENT)

## Objective
Build a reusable, CI-enforced QA framework that runs phase-by-phase regression,
grouped suites (FAST/RC/FULL), and enforces gates in GitHub Actions.

## Deliverables
1. **Phase manifest** (`qa/gauntlet/phase-manifest.json`) -- auto-generated from
   prompts/ + phase-index.json, with override support.
2. **Manifest generator** (`qa/gauntlet/build-manifest.mjs`) -- scans prompts/,
   infers tags, builds baseline manifest entries.
3. **Gauntlet CLI** (`qa/gauntlet/cli.mjs`) -- `--suite fast|rc|full`,
   `--phase N`, `--tag rcm`, `--strict`, `--ci` flags.
4. **Gate modules** (`qa/gauntlet/gates/*.mjs`) -- 10 gates (G0-G9), each
   wrapping existing gate scripts or adding minimal new logic.
5. **Phase 119 verifier** (`scripts/verify-phase119-qa-gauntlet.ps1`)
6. **GitHub Actions** -- FAST on PR, RC nightly with `--strict`.
7. **Runbook** (`docs/runbooks/qa-gauntlet.md`)
8. **Package scripts**: `pnpm qa:gauntlet:fast`, `pnpm qa:gauntlet:rc`,
   `pnpm qa:gauntlet:full`

## Files Touched
- qa/gauntlet/build-manifest.mjs (NEW)
- qa/gauntlet/phase-manifest.json (GENERATED)
- qa/gauntlet/phase-manifest.overrides.json (NEW, empty default)
- qa/gauntlet/cli.mjs (NEW)
- qa/gauntlet/gates/g0-prompts-integrity.mjs (NEW)
- qa/gauntlet/gates/g1-build-typecheck.mjs (NEW)
- qa/gauntlet/gates/g2-unit-tests.mjs (NEW)
- qa/gauntlet/gates/g3-security-scans.mjs (NEW)
- qa/gauntlet/gates/g4-contract-alignment.mjs (NEW)
- qa/gauntlet/gates/g5-api-smoke.mjs (NEW)
- qa/gauntlet/gates/g6-vista-probe.mjs (NEW)
- qa/gauntlet/gates/g7-restart-durability.mjs (NEW)
- qa/gauntlet/gates/g8-ui-dead-click.mjs (NEW)
- qa/gauntlet/gates/g9-performance-budget.mjs (NEW)
- scripts/verify-phase119-qa-gauntlet.ps1 (NEW)
- scripts/verify-latest.ps1 (UPDATED)
- .github/workflows/qa-gauntlet.yml (UPDATED)
- docs/runbooks/qa-gauntlet.md (NEW)
- package.json (UPDATED -- scripts)

## Verification
- `pnpm qa:gauntlet:fast` passes locally
- `scripts/verify-latest.ps1` passes
- PR workflow runs FAST suite
- Nightly workflow runs RC suite with --strict
- No new reports/ folders
- artifacts/ is gitignored
