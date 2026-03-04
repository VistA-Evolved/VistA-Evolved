# Phase 108 -- Phase Audit Harness Runbook

## Overview

Phase 108 introduces a phase-by-phase QA backfill system that automatically
inventories all 115+ phases from the prompts/ directory and generates
executable test specifications.

## Components

| Component           | Path                                    | Purpose                                          |
| ------------------- | --------------------------------------- | ------------------------------------------------ |
| Phase Index Builder | `scripts/build-phase-index.mjs`         | Scans prompts/, extracts routes/RPCs/UI metadata |
| Spec Generator      | `scripts/generate-phase-qa.mjs`         | Generates Playwright E2E + Vitest API specs      |
| Progressive Runner  | `scripts/phase-qa-runner.mjs`           | Run QA for single phase, range, or all           |
| Phase Index Gate    | `scripts/qa-gates/phase-index-gate.mjs` | CI gate: validates phase-index.json consistency  |
| Phase Index         | `docs/qa/phase-index.json`              | Generated metadata for all phases                |

## Usage

### Rebuild phase index

```bash
pnpm qa:phase-index
```

### Regenerate test specs

```bash
node scripts/generate-phase-qa.mjs
```

### Run QA for a specific phase

```bash
pnpm qa:phase 12
```

### Run QA for a range of phases

```bash
pnpm qa:range 1 20
```

### Run phase-audit suite (prompts ordering + phase-index integrity)

```bash
pnpm qa:phase-audit
```

## CI Integration

- **PR gates**: Phase index integrity gate runs as part of `smoke-and-security` job
- **Nightly**: Full `phase-audit` suite runs after E2E smoke

## Generated Test Structure

- E2E specs: `apps/web/e2e/phases/phases-*.spec.ts` (7 files, grouped by phase range)
- API specs: `apps/api/tests/phases/phases-*.test.ts` (2 files)

Each spec tests:

- Route accessibility (no HTTP 500)
- UI component presence (for UI phases)
- Integration-pending compliance (no silent no-ops)

## Regeneration

After adding a new phase to prompts/, regenerate:

```bash
pnpm qa:phase-index && node scripts/generate-phase-qa.mjs
```

## Gotchas

1. **Generated specs are auto-generated -- do NOT edit manually.** They will be overwritten by `generate-phase-qa.mjs`.
2. **phase-index.json must be committed.** The CI gate checks it exists and is fresh.
3. **Phase numbers can be alphanumeric** (e.g., "37B", "95B"). The tools handle this.
4. **E2E specs require Playwright browsers installed.** Run `pnpm -C apps/web exec playwright install chromium` first.
5. **API specs use vitest.** They test route existence, not full integration.
