# Phase 47 Summary -- CI + Evidence Pack + Hard Quality Gates

## What Changed

### New CI Workflows

- **`.github/workflows/ci-verify.yml`** -- Typecheck, unit tests, prompts ordering gate, RPC registry gate, module toggle integrity. Evidence pack on push to main.
- **`.github/workflows/ci-security.yml`** -- Secret scan + dependency audit. Weekly schedule + PR/push triggers.

### New Quality Gate Scripts

- **`scripts/check-prompts-ordering.ts`** -- Validates prompts/ directory: no duplicate prefixes, no gaps, all folders have .md files, naming pattern enforced.
- **`scripts/check-rpc-registry.ts`** -- Cross-checks all callRpc/safeCallRpc calls against rpcRegistry.ts and Vivian index. 69 RPCs + 14 exceptions verified against 3,747 Vivian RPCs.
- **`scripts/check-module-gates.ts`** -- Validates module toggle integrity: route patterns compile, SKU refs valid, no circular deps, FULL_SUITE complete.

### Evidence Pack Generator

- **`scripts/generate-evidence-pack.ts`** -- Runs all 6 gates, outputs to `docs/evidence/<build-id>/` with JSON results + summary.md.

### Docs

- **`docs/runbooks/ci-and-evidence-pack.md`** -- Full runbook for CI + gates + evidence pack.
- **`docs/evidence/README.md`** -- Evidence directory README.

### Prompt

- **`prompts/52-PHASE-47-CI-EVIDENCE-QUALITY-GATES/01-implement.md`**

## How to Test Manually

```powershell
# Run each gate individually
npx tsx scripts/check-prompts-ordering.ts
npx tsx scripts/check-rpc-registry.ts
npx tsx scripts/check-module-gates.ts

# Generate evidence pack
npx tsx scripts/generate-evidence-pack.ts

# Full verify
cd apps/api
pnpm exec tsc --noEmit
pnpm exec vitest run
```

## Verifier Output

- tsc: clean (0 errors)
- vitest: 184 tests, 7 files, all pass
- check-prompts-ordering: 5 pass, 0 fail
- check-rpc-registry: 5 pass, 0 fail, 1 warn (34 orphaned registry entries used via lookup)
- check-module-gates: 9 pass, 0 fail

## Follow-ups

- Consider retiring older `quality-gates.yml` / `verify.yml` / `ci.yml` now that `ci-verify.yml` and `ci-security.yml` cover everything
- Add PHI leak scan gate to evidence pack
- Self-hosted runner for integration gates
