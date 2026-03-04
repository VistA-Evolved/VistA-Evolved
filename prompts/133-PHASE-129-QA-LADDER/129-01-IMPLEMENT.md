# Phase 129 — QA LADDER (PLAYWRIGHT + CONTRACTS + VISTA TRACE REPLAY + VISUAL REGRESSION)

## User Request

Build the automated QA ladder that catches "verifier passes but product is broken" scenarios. Five workstreams:

- **A**: Playwright journeys (login → CPRS → patient search → cover sheet → tabs, orders, portal) + dead-click detector
- **B**: Contract tests (schema validation, error shapes, no placeholder responses)
- **C**: VistA RPC golden trace (redacted params, sequence stability)
- **D**: Chaos/restart (API restart mid-journey, PG persistence)
- **E**: Visual regression (snapshot key screens, compare diffs)
- **CI**: Wire into gauntlet RC as new gate G14

## Implementation Steps

### Step 0 — Inventory

Files inspected:

- `qa/gauntlet/cli.mjs` — Gauntlet CLI (14 gates, G0-G13)
- `qa/gauntlet/gates/g8-ui-dead-click.mjs` — Existing dead-click gate (source scan only)
- `qa/gauntlet/gates/g13-imaging-scheduling-restart.mjs` — Most recent gate pattern
- `apps/web/playwright.config.ts` — Playwright fully configured
- `apps/web/e2e/` — 20 existing specs, 3 dead-click detectors
- `apps/web/e2e/helpers/auth.ts` — loginViaAPI, loginViaUI, selectPatient
- `apps/web/e2e/helpers/network-evidence.ts` — NetworkEvidence class
- `apps/api/tests/contract.test.ts` — Existing contract tests (310 lines)
- `apps/api/src/vista/rpcRegistry.ts` — RPC registry (109+ entries)

### Step 1 — Workstream A: Playwright Journeys

New file: `apps/web/e2e/qa-ladder-journeys.spec.ts`

- Journey 1: Login → patient search → cover sheet → 3 tabs (allergies, vitals, problems)
- Journey 2: Orders quick-order (navigate to order tab)
- Journey 3: Portal login → inbox → telehealth
- Dead-click detector: every click must produce navigation, state change, dialog, or "integration pending"

### Step 2 — Workstream B: Contract Tests

New file: `apps/api/tests/qa-ladder-contracts.test.ts`

- Schema validation for 10+ critical endpoints using Zod
- Error shape uniformity ({ok: false, error: string})
- No placeholder/stub responses on live paths
- Response timing budgets

### Step 3 — Workstream C: VistA RPC Golden Trace

New file: `apps/api/tests/rpc-trace-replay.test.ts`

- Records RPC sequence (names only, no params/PHI)
- Golden baseline in `apps/api/tests/fixtures/rpc-golden-trace.json`
- Sequence stability assertion

### Step 4 — Workstream D: Chaos/Restart

New file: `apps/api/tests/chaos-restart.test.ts`

- PG persistence after restart verification
- Session survival check
- Error shape during restart window

### Step 5 — Workstream E: Visual Regression

New file: `apps/web/e2e/visual-regression.spec.ts`

- Screenshot key screens:
  - Login page
  - Patient search
  - Cover sheet with data
- Pixel diff comparison using Playwright built-in

### Step 6 — G14 Gauntlet Gate

New file: `qa/gauntlet/gates/g14-qa-ladder.mjs`

- Checks: spec files exist, test infrastructure present, no placeholder tests
- Wire into SUITE_GATES.rc and SUITE_GATES.full in cli.mjs

## Verification Steps

- `pnpm -C apps/api exec tsc --noEmit` — TypeScript passes
- `node qa/gauntlet/cli.mjs --suite rc` — G14 passes
- All test files parseable and correctly structured

## Files Touched

- `prompts/133-PHASE-129-QA-LADDER/129-01-IMPLEMENT.md` (this file)
- `apps/web/e2e/qa-ladder-journeys.spec.ts`
- `apps/web/e2e/visual-regression.spec.ts`
- `apps/api/tests/qa-ladder-contracts.test.ts`
- `apps/api/tests/rpc-trace-replay.test.ts`
- `apps/api/tests/chaos-restart.test.ts`
- `apps/api/tests/fixtures/rpc-golden-trace.json`
- `qa/gauntlet/gates/g14-qa-ladder.mjs`
- `qa/gauntlet/cli.mjs` (add G14)
- `docs/runbooks/phase129-qa-ladder.md`
