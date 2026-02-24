# Phase 116 VERIFY -- Postgres Job Queue (Graphile Worker)

## What Changed

### Bug Fixes (4 bugs found during VERIFY)
1. **BUG-069** -- `registry.ts`: Made `payerId` optional in eligibility schema (cron sends minimal payload)
2. **BUG-070** -- `governance.ts`: Moved PHI check before zod parsing (zod strips unknown keys)
3. **BUG-071** -- `governance.ts`: Fixed JSONB parsing in `getRecentJobRuns` (PG driver returns object)
4. **BUG-072** -- `pg-migrate.ts`: Added DROP FUNCTION before CREATE OR REPLACE in v7

### New Files
- `apps/api/tests/job-worker-smoke.test.ts` -- 29-test CI smoke suite
- `apps/api/package.json` -- Added `test:jobs` script

## Verifier Output
Phase 116: 34 PASS / 0 FAIL / 0 SKIP

## Test Results
- job-worker-smoke: 29/29 PASS (NEW)
- contract: 27/27 PASS
- qa-security: 12/12 PASS
- gateway-packs: 33/33 PASS
- Full suite: 256 PASS / 14 FAIL (all pre-existing)

## Follow-ups
- PG connection string redaction in `redactErrorMessage`
- rcm-quality-loop workqueue store init (pre-existing)
- rpc-boundary VistA Docker auth (pre-existing)1. **Auth sessions** (`auth_session` table) -- sessions survive API restart
2. **RCM workqueues** (`rcm_work_item` + `rcm_work_item_event`) -- work items + audit trail persist
3. **Capability matrix audit** -- all mutations write to `payer_audit_event` table

Additional artifacts:
- `docs/architecture/store-policy.md` -- 4-class store classification standard
- `scripts/qa-gates/restart-durability.mjs` -- 25-gate structural QA gate
- `scripts/verify-phase114-durability-wave1.ps1` -- full phase verifier
- `docs/runbooks/durability-wave1.md` -- runbook

## Verification Results

### Automated Gates
| # | Gate | Result |
|---|------|--------|
| 1 | Restart-Durability QA Gate | **25/25 PASS** |
| 2 | verify-phase114-durability-wave1.ps1 | **31/31 PASS** |
| 3 | API TypeScript compile | **PASS** (0 errors) |
| 4 | Web build (next build) | **PASS** |
| 5 | IDE errors (all Phase 114 files) | **0 errors** |

### Live API Tests
| # | Test | Result |
|---|------|--------|
| 6 | Health endpoint | **PASS** |
| 7 | Login (PROV123) | **PASS** |
| 8 | Session check (authenticated) | **PASS** |
| 9 | Session token stored as SHA-256 hash in DB | **PASS** |
| 10 | **Session survives API restart** | **PASS** |
| 11 | Logout revokes session (revoked_at set in DB) | **PASS** |
| 12 | RCM workqueue stats endpoint | **PASS** |
| 13 | RCM claims endpoint | **PASS** |
| 14 | Capability matrix endpoint | **PASS** |
| 15 | No new PHI introduced | **PASS** |

## How to Test Manually
```powershell
.\scripts\verify-phase114-durability-wave1.ps1
node scripts/qa-gates/restart-durability.mjs
```

## Follow-ups
- registry-store.ts durability (Phase 115)
- payerops store.ts durability (Phase 116)
- Imaging worklist/ingest store durability
- Telehealth room store durability
