# QA Gauntlet Runbook

## Overview
The QA Gauntlet is a unified framework for running phase-by-phase regression
with grouped suites. It wraps existing gates and adds CI enforcement.

## Suites

| Suite | Gates | When |
|-------|-------|------|
| **FAST** | G0-G4 (prompts, typecheck, unit tests, security, contracts) | Every PR |
| **RC** | FAST + G5, G7, G8 (API smoke, restart durability, UI dead-click) | Nightly + RC |
| **FULL** | RC + G6, G9 (VistA probe, performance budget) | Weekly / manual |

## Running Locally

```bash
# FAST suite (default)
pnpm qa:gauntlet:fast

# RC suite
pnpm qa:gauntlet:rc

# FULL suite
pnpm qa:gauntlet:full

# Single phase
node qa/gauntlet/cli.mjs --phase 112 --suite rc

# By tag
node qa/gauntlet/cli.mjs --tag rcm --suite rc

# Strict mode (tighter thresholds)
node qa/gauntlet/cli.mjs --suite rc --strict

# CI mode (JSON output only)
node qa/gauntlet/cli.mjs --suite fast --ci
```

## Gate Reference

| Gate | ID | What it checks |
|------|----|----------------|
| G0 | `G0_prompts_integrity` | Prompts tree health + phase-index |
| G1 | `G1_build_typecheck` | TypeScript `--noEmit` (+ builds in RC/FULL) |
| G2 | `G2_unit_tests` | Vitest contract + security tests |
| G3 | `G3_security_scans` | Secret scan + PHI scan + dep audit |
| G4 | `G4_contract_alignment` | Config JSON parseable, RPC registry |
| G5 | `G5_api_smoke` | /health + key endpoints (needs running API) |
| G6 | `G6_vista_probe` | VistA TCP + ping (SKIP if Docker down) |
| G7 | `G7_restart_durability` | 9 durable stores are DB-backed |
| G8 | `G8_ui_dead_click` | Scan UI for dead onClick/href patterns |
| G9 | `G9_performance_budget` | Budget config + /health latency |

## Phase Manifest

Auto-generated from `prompts/` by:
```bash
node qa/gauntlet/build-manifest.mjs
```

Override per-phase gates in `qa/gauntlet/phase-manifest.overrides.json`.

## Triage: What to Do When a Gate Fails

| Gate | Triage |
|------|--------|
| G0 | Fix prompts folder naming or regenerate phase-index |
| G1 | Fix TypeScript errors (`cd apps/api && npx tsc --noEmit`) |
| G2 | Fix failing tests, check test runner output |
| G3 | Remove secrets/PHI, update deps if critical vuln |
| G4 | Fix broken JSON in config/, check RPC registry |
| G5 | Start API (`cd apps/api && npx tsx --env-file=.env.local src/index.ts`) |
| G6 | Start VistA Docker (`cd services/vista && docker compose up -d`) |
| G7 | Ensure durable stores use DB repos, not raw Maps |
| G8 | Replace dead onClick/href with real handlers or "integration pending" |
| G9 | Check performance-budgets.json, investigate slow endpoints |

## CI Integration

- **PR**: FAST suite runs automatically
- **Nightly**: RC suite with `--strict`
- **Artifacts**: `artifacts/qa-gauntlet.json` uploaded on failure

## Output

Machine output goes to `artifacts/qa-gauntlet.json` (gitignored, never committed).
