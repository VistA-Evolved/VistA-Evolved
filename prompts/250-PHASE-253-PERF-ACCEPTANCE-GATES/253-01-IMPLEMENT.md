# Phase 253 -- Performance Acceptance Gates (Wave 7 P6)

## Objective

Formalize k6 performance tests as acceptance gates with CI integration,
pass/fail thresholds, and tier-based execution (smoke for CI, load for nightly).

## Implementation Steps

### 1. Performance Config (`tests/k6/perf-acceptance-config.ts`)

- `PerfScenario` interface: id, script, tier, options, thresholds
- 3 smoke scenarios (auth, reads, FHIR) -- < 30s total
- 2 load scenarios (mixed, DB) -- 2-5 min total
- p95/p99 latency thresholds + error rate limits per scenario

### 2. CI Workflow (`.github/workflows/perf-acceptance-gate.yml`)

- Smoke job: runs on workflow_dispatch, 3 k6 scripts
- Load job: runs nightly at 03:00 UTC
- Uploads result JSON as artifacts (30/90 day retention)
- continue-on-error per script to capture all results

### 3. Local Runner (`tests/k6/run-acceptance-gate.ps1`)

- Tier-parameterized: -Tier smoke|load
- Pre-checks: k6 installed, API healthy
- Runs each scenario, reports pass/fail per scenario

## Files Touched

- `tests/k6/perf-acceptance-config.ts` -- NEW
- `.github/workflows/perf-acceptance-gate.yml` -- NEW
- `tests/k6/run-acceptance-gate.ps1` -- NEW
- `scripts/verify-phase253-perf-gates.ps1` -- NEW

## Depends On

- Phase 252 (P5) -- E2E Clinical Journeys
- Existing: 10 k6 test scripts, run-smoke.ps1

## Verification

Run `scripts/verify-phase253-perf-gates.ps1` -- 17 gates, all must PASS.
