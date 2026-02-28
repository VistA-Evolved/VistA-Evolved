# Phase 212 -- Verify: Repair Prompts Tree

## Verification Steps

1. `node scripts/qa-gates/prompts-tree-health.mjs` -- 0 FAIL, WARNs reduced
2. `node scripts/qa-gates/prompts-quality-gate.mjs` -- 0 FAIL
3. `node scripts/qa-gates/phase-index-gate.mjs` -- 6/6 PASS
4. `pnpm qa:prompts` -- All gates PASS
5. No orphan flat files at prompts root (except 00-* meta files)
6. No split IMPLEMENT/VERIFY across folders
7. No duplicate phase numbers without B-suffix

## Acceptance Criteria
- [ ] prompts-tree-health: orphan-flat PASS (no orphan `197-01-IMPLEMENT.md`)
- [ ] prompts-tree-health: impl-verify-pair WARNs reduced by >= 5
- [ ] prompts-tree-health: duplicate-phase WARNs reduced by >= 2
- [ ] phase-index-gate: 6/6 PASS
- [ ] pnpm qa:prompts: All gates PASS
- [ ] Wave 2 mega-phase moved to playbooks
- [ ] Phase 43 has both IMPLEMENT and VERIFY in one folder

## Failure Recovery
If tree-health still shows issues, run `node scripts/qa-gates/prompts-tree-health.mjs`
and fix remaining items one by one.
