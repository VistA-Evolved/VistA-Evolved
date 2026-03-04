# 12-08 — Phase 10D: API Scaffold Generator — VERIFY

## What to verify

Phase 10D created a scaffold generator that reads `rpc_catalog.json` and
produces typed Fastify route stubs per domain.

## Automated checks

```powershell
# 1. Generator script exists and runs clean
Test-Path tools/cprs-extract/generate-api-stubs.mjs
pnpm run cprs:generate-stubs

# 2. Generated route files exist
Test-Path apps/api/src/routes/index.ts
Test-Path apps/api/src/routes/problems.ts
Test-Path apps/api/src/routes/meds.ts
Test-Path apps/api/src/routes/notes.ts
Test-Path apps/api/src/routes/orders.ts
Test-Path apps/api/src/routes/labs.ts
Test-Path apps/api/src/routes/reports.ts

# 3. TypeScript build succeeds
pnpm -C apps/api build

# 4. Spot-check: problems.ts exports correct RPC count
$content = Get-Content apps/api/src/routes/problems.ts -Raw
$content -match 'ORQQPL PROBLEM LIST'   # should be True
```

## RPC count verification

| Domain   | Expected RPCs | Prefix(es)               |
| -------- | ------------- | ------------------------ |
| problems | 25            | ORQQPL\*                 |
| meds     | 59            | ORWPS*, ORWDPS*          |
| notes    | 111           | TIU*, ORWTIU*            |
| orders   | 135           | ORWDX*, ORWOR*, ORWORR\* |
| labs     | 36            | ORWLRR*, ORWDLR*         |
| reports  | 38            | ORWRP*, ORWSR*           |

## Manual spot-checks

| Check                                     | Expected                                    |
| ----------------------------------------- | ------------------------------------------- |
| Each route file has Fastify plugin export | `export default async function`             |
| Catalog endpoint exists                   | `GET /vista/{domain}/rpcs` returns RPC list |
| Stub endpoints return not-implemented     | `{ ok: false, error: "Not implemented" }`   |
| index.ts barrel registers all 6 plugins   | `registerDomainRoutes` function             |

## Pass criteria

Generator runs. `pnpm -C apps/api build` exits 0. All 7 route files present with correct RPC counts.
