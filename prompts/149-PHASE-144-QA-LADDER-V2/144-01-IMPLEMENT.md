# Phase 144 -- QA Ladder V2 (Phase-by-Phase Human QA Replacement) -- IMPLEMENT

## Goal
Systematic way to go from Phase 1..N and prove correctness via auto-generated tests.
Produces Playwright journeys, RPC golden trace replay tests, visual regression
snapshots, and restart/chaos tests per phase or per domain.

## Non-Negotiables
1. Tests must be deterministic in CI
2. VistA-dependent tests: recorded golden trace OR integration_pending skip
3. Output is code (tests), not report documents
4. CI: fast suite on PR, full suite nightly

## Implementation

### A. Phase Registry V2 (`scripts/qa/phase-registry.mjs`)
- Parse prompts/ + phase-index.json for phase -> domain -> route/page mapping
- Domain classification: clinical, portal, imaging, rcm, telehealth, iam, analytics, intake, scheduling, interop
- Per-phase metadata: routes, RPCs, UI pages, data stores, dependencies

### B. Test Generator V2 (`scripts/qa/generate-phase-tests.mjs`)
- Playwright domain journey tests per phase (not just route-exists)
- RPC trace replay: golden sequence verification per workflow
- Restart resilience: durable stores survive restart
- Visual regression: screenshot-based for stable pages
- Integration-pending classification + skip rules

### C. RPC Golden Trace System (`scripts/qa/rpc-trace-manager.mjs`)
- Record mode: capture RPC sequences from live API
- Replay mode: assert RPC sequences match baseline
- Diff mode: show what changed between runs
- Auto-skip when VistA unavailable

### D. CI Wiring
- `.github/workflows/qa-gauntlet.yml` — add Phase 144 generator run
- PR: smoke Playwright journeys (fast)
- Nightly: full + visual snapshots + RPC replay

### E. Gauntlet Gate: G18 (QA Ladder V2)
- Validates generator produces tests for Phase 139-144
- Validates RPC trace file is up-to-date
- Validates no empty test bodies

## Files Touched
- scripts/qa/phase-registry.mjs (NEW)
- scripts/qa/generate-phase-tests.mjs (NEW)
- scripts/qa/rpc-trace-manager.mjs (NEW)
- qa/gauntlet/gates/g18-qa-ladder-v2.mjs (NEW)
- qa/gauntlet/cli.mjs (add G18 to suites)
- qa/gauntlet/phase-manifest.json (add Phase 144)
- apps/web/e2e/domain-journeys/ (GENERATED)
- apps/api/tests/rpc-replay/ (GENERATED)
- apps/api/tests/restart-resilience/ (GENERATED)
- .github/workflows/qa-gauntlet.yml (CI updates)
- package.json (new scripts)

## Acceptance Criteria
- Can generate tests for Phase 139-144 at minimum
- CI runs them (gauntlet gate passes)
- RPC trace replay works for 5+ workflows
- Restart resilience tests pass for durable stores
