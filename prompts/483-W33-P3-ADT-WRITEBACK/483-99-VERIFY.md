# Phase 483 -- W33-P3: VERIFY

## Gates

| # | Gate | Check |
|---|------|-------|
| 1 | ADT routes import tier0Gate | `grep tier0Gate apps/api/src/routes/adt/index.ts` |
| 2 | Inpatient routes import tier0Gate | `grep tier0Gate apps/api/src/routes/inpatient/index.ts` |
| 3 | No static integration-pending in ADT write posts | `grep "status: .integration-pending" apps/api/src/routes/adt/index.ts` returns 0 matches in POST handlers |
| 4 | unsupported-in-sandbox in ADT routes | `grep "unsupported-in-sandbox" apps/api/src/routes/adt/index.ts` has matches |
| 5 | TypeScript compiles | `npx tsc --noEmit` passes |
| 6 | Budget gate passes | `integration-pending-budget.mjs` delta <= 0 |
