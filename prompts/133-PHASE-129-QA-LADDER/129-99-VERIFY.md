# Phase 129 — VERIFY: QA LADDER

## Verification Steps

### Gate 1: All spec files exist
- [ ] `apps/web/e2e/qa-ladder-journeys.spec.ts` exists
- [ ] `apps/web/e2e/visual-regression.spec.ts` exists
- [ ] `apps/api/tests/qa-ladder-contracts.test.ts` exists
- [ ] `apps/api/tests/rpc-trace-replay.test.ts` exists
- [ ] `apps/api/tests/chaos-restart.test.ts` exists
- [ ] `apps/api/tests/fixtures/rpc-golden-trace.json` exists

### Gate 2: G14 wired into gauntlet
- [ ] `qa/gauntlet/gates/g14-qa-ladder.mjs` exists
- [ ] G14_qa_ladder in SUITE_GATES.rc
- [ ] G14_qa_ladder in SUITE_GATES.full
- [ ] G14_qa_ladder in GATE_MODULES

### Gate 3: TypeScript passes
- [ ] `pnpm -C apps/api exec tsc --noEmit` clean

### Gate 4: G14 passes
- [ ] `node qa/gauntlet/cli.mjs --suite rc` includes G14 PASS

### Gate 5: PHI safety
- [ ] Golden trace contains NO patient data, credentials, or SSN patterns
- [ ] Test files use env-var fallbacks only for credentials

### Gate 6: No placeholder tests
- [ ] No empty it() blocks in any spec file

### Gate 7: Documentation
- [ ] `docs/runbooks/phase129-qa-ladder.md` exists
- [ ] Prompt file at `prompts/133-PHASE-129-QA-LADDER/129-01-IMPLEMENT.md`

## Files Touched
- `prompts/133-PHASE-129-QA-LADDER/129-01-IMPLEMENT.md`
- `prompts/133-PHASE-129-QA-LADDER/129-99-VERIFY.md` (this file)
- `apps/web/e2e/qa-ladder-journeys.spec.ts`
- `apps/web/e2e/visual-regression.spec.ts`
- `apps/api/tests/qa-ladder-contracts.test.ts`
- `apps/api/tests/rpc-trace-replay.test.ts`
- `apps/api/tests/chaos-restart.test.ts`
- `apps/api/tests/fixtures/rpc-golden-trace.json`
- `qa/gauntlet/gates/g14-qa-ladder.mjs`
- `qa/gauntlet/cli.mjs`
- `docs/runbooks/phase129-qa-ladder.md`
