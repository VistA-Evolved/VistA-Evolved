# Phase 146 -- Durability Wave 3: Store Elimination (VERIFY)

## Verification Gates (all PASS)

| Gate                   | Result       | Detail                                                 |
| ---------------------- | ------------ | ------------------------------------------------------ |
| System audit           | PASS         | 177 in-memory stores, 33 high-risk                     |
| G7 Restart Durability  | PASS         | Migrated stores survive restart                        |
| G16 DR & Chaos         | PASS         | 16P/0F                                                 |
| G17 Store Policy       | PASS         | 124 stores (47 critical), all migrationTarget declared |
| G21 Critical Map Store | PASS         | 129 current = 129 baseline                             |
| Gauntlet FAST          | 4P/0F/1W     | WARN = pre-existing secret scan                        |
| Gauntlet RC            | 18P/0F/1S/1W | SKIP = API smoke (offline), WARN = secret scan         |

## Deep Audit Findings & Fixes

### HIGH -- SQL injection via column name interpolation

- generic-pg-repo.ts: `findByField`, `update`, `insert`, `upsert` interpolated
  column names from `Object.keys()` directly into SQL
- **Fix**: Added `SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/` regex +
  `assertSafeIdentifier()` validation on all column/table name interpolation

### HIGH -- 28 missing write-through mutations across 8 files

Phase 146 IMPLEMENT only covered create/insert paths. All update/transition/
delete/patch mutations wrote to in-memory Maps without PG persistence.

| File                 | Was  | Now   | Mutations fixed                                                                                   |
| -------------------- | ---- | ----- | ------------------------------------------------------------------------------------------------- |
| portal-user-store.ts | 1/13 | 13/13 | auth lockout/success, password reset/change, MFA setup/confirm/disable, profiles, device sessions |
| loa-store.ts         | 1/5  | 5/5   | transition, checklist, attachment, assign                                                         |
| remittance-intake.ts | 1/4  | 4/4   | tag, review, markAsPosted                                                                         |
| portal-refills.ts    | 1/3  | 3/3   | cancel, review                                                                                    |
| portal-tasks.ts      | 1/3  | 3/3   | dismiss, complete                                                                                 |
| proxy-store.ts       | 1/3  | 3/3   | respondToInvitation, cancelInvitation                                                             |
| write-backs.ts       | 1/3  | 3/3   | markDraftSynced, markDraftFailed                                                                  |
| envelope.ts          | 1/2  | 2/2   | transitionTransaction                                                                             |

### HIGH -- Unwired facility setup repo

- philhealth-store.ts `facilitySetups` Map had zero DB wiring despite
  `rcm_ph_facility_setup` table in migration v18
- **Fix**: Added `phFacilityDbRepo` + `initPhFacilityStoreRepo()` + index.ts wiring

### Deferred (intentional)

- `portal-auth.ts` portalSessions -- ephemeral session tokens, regenerate on login
- `portal-iam-routes.ts` iamSessions -- same, ephemeral auth state

## Files changed (11 code + 2 auto-generated)

- `apps/api/src/platform/pg/repo/generic-pg-repo.ts` -- SQL injection guards
- `apps/api/src/rcm/payerOps/philhealth-store.ts` -- facility setup wiring + 6 write-through
- `apps/api/src/index.ts` -- initPhFacilityStoreRepo wiring
- `apps/api/src/rcm/loa/loa-store.ts` -- 4 write-through additions
- `apps/api/src/rcm/workflows/remittance-intake.ts` -- 3 write-through additions
- `apps/api/src/rcm/transactions/envelope.ts` -- 1 write-through addition
- `apps/api/src/services/portal-refills.ts` -- 2 write-through additions
- `apps/api/src/services/portal-tasks.ts` -- 2 write-through additions
- `apps/api/src/portal-iam/portal-user-store.ts` -- 12 write-through additions
- `apps/api/src/portal-iam/proxy-store.ts` -- 2 write-through additions
- `apps/api/src/routes/write-backs.ts` -- 2 write-through additions
