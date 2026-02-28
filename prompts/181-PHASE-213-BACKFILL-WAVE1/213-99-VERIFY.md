# Phase 213 -- Verify: Backfill Wave 1

## Verification Steps
1. `node scripts/qa-gates/prompts-tree-health.mjs` -- 0 FAIL
2. Individual phase folders exist for 173-178
3. Mega-phase moved to playbooks
4. `pnpm qa:prompts` -- All gates PASS

## Acceptance Criteria
- [ ] 6 individual phase folders created (173-178)
- [ ] Each has IMPLEMENT + VERIFY
- [ ] Mega-phase in playbooks
- [ ] Phase index regenerated and passes
