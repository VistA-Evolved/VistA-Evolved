# Phase 532 — UI Parity Gap Gate (CI)

## Objective
Create a CI-runnable gate that reads the UI estate catalogs from Phase 531
and enforces forward-only coverage progress. Prevents merges that regress
the number of covered surfaces.

## Implementation Steps

### Step 1: Create the gap-gate script
Create `scripts/qa-gates/ui-parity-gate.mjs` that:
1. Loads `data/ui-estate/va-ui-estate.json` and `data/ui-estate/ihs-ui-estate.json`
2. Counts total surfaces, covered surfaces (present_ui + present_api), and RPC-wired surfaces
3. Loads a baseline from `data/ui-estate/parity-baseline.json`
4. Compares current vs baseline
5. Exits non-zero if covered count < baseline covered count (regression)
6. Optionally updates baseline with `--update-baseline` flag
7. Prints clear report showing delta

### Step 2: Create the baseline file
Create `data/ui-estate/parity-baseline.json` with current counts.

### Step 3: Create CI workflow
Create `.github/workflows/ci-ui-parity-gate.yml` that:
1. Runs on PRs touching `data/ui-estate/**`, `apps/**`, `config/**`
2. Calls `node scripts/qa-gates/ui-parity-gate.mjs`
3. Fails the check if coverage regressed

### Step 4: Integrate into gauntlet
Add as an optional gate in `qa/gauntlet/cli.mjs` if it exists,
or document the standalone usage.

### Step 5: Evidence
Write evidence to `evidence/wave-39/532-W39-P2-UI-PARITY-GAP-GATE/`.

## Files Changed/Created
- `scripts/qa-gates/ui-parity-gate.mjs` (new)
- `data/ui-estate/parity-baseline.json` (new)
- `.github/workflows/ci-ui-parity-gate.yml` (new)
- `evidence/wave-39/532-W39-P2-UI-PARITY-GAP-GATE/verify-result.json` (new)
- `scripts/verify-phase532-ui-parity-gate.ps1` (new)
- `prompts/532/532-01-IMPLEMENT.md` (this file)
- `prompts/532/532-99-VERIFY.md`
