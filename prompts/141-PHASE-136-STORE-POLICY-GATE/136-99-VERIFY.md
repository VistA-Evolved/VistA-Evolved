# Phase 136 — VERIFY: Store Policy Gate + Durability Sweep

## Verification Steps

### Sanity

- [ ] Prompt folder exists with both files
- [ ] No source-code drift from spec
- [ ] TypeScript clean (api, web, portal)

### Feature Integrity

- [ ] `store-policy-gate.mjs` passes in dev mode (all stores classified)
- [ ] `store-policy-gate.mjs` would FAIL if a critical store had no PG backing
- [ ] `/posture/store-policy` returns 200 with classification summary
- [ ] Cache stores have TTL + maxSize declared
- [ ] `system-store-inventory.json` matches actual codebase stores

### Regression

- [ ] Gauntlet FAST: 5P/0F/0W+
- [ ] Gauntlet RC: 16P/0F/0W+
- [ ] Existing tests still pass
- [ ] API starts cleanly

## Expected Diff

~7 new/modified files, ~600 lines added.
