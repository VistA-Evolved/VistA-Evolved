# Phase 114: Durability Wave 1 -- Summary

## What Changed
Three critical in-memory stores converted to DB-backed persistence:

1. **Auth sessions** (`auth_session` table) -- sessions survive API restart
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
