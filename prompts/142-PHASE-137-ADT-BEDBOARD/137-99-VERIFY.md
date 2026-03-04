# Phase 137 — ADT + Bedboard + Census — VERIFY

## Sanity (Tier 1)

- [ ] TypeScript compiles clean (`pnpm -C apps/api exec tsc --noEmit`)
- [ ] No new console.log (≤6 codebase)
- [ ] API starts and /health returns 200
- [ ] GET /vista/adt/wards returns ward list
- [ ] GET /vista/adt/census returns census or integration-pending
- [ ] GET /vista/adt/movements returns movements or integration-pending
- [ ] GET /vista/inpatient/wards includes census counts
- [ ] GET /vista/inpatient/ward-census returns patient list
- [ ] GET /vista/inpatient/bedboard returns bed grid or pending

## Integrity (Tier 2)

- [ ] Audit trail records census access events
- [ ] ZVEADT.m compiles in MUMPS syntax
- [ ] UI /inpatient/bedboard loads without errors
- [ ] UI /inpatient/census loads without errors
- [ ] capabilities.json includes new capabilities
- [ ] rpcRegistry includes ZVEADT RPCs (as expectedMissing until installed)

## Regression (Tier 3)

- [ ] Full vitest: 20+ files, 413+ tests, 0 failures
- [ ] Gauntlet FAST: 5P/0F/0W
- [ ] Gauntlet RC: 16P/0F/0W
- [ ] No pre-existing tests broken
