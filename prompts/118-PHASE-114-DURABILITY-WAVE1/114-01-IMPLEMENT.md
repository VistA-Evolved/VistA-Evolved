# Phase 114 -- IMPLEMENT: Durability Wave 1 (No More Restart Data Loss)

## Objective

Replace in-memory Map stores with DB-backed persistence for:

- Auth sessions (session-store.ts)
- RCM work queues (workqueue-store.ts)
- PayerOps capability matrix (capability-matrix.ts)

Add append-only capability matrix audit trail.
Add restart-durability CI gate.
Establish store policy standard.

## Deliverables

1. docs/architecture/store-policy.md -- classification standard
2. DB schema + repos for auth_session, rcm_work_item, rcm_work_item_event
3. DB-backed capability matrix with audit trail via payer_audit_event
4. Updated session-store.ts, workqueue-store.ts, capability-matrix.ts
5. scripts/qa-gates/restart-durability.mjs -- restart-survival test
6. scripts/verify-phase114-durability-wave1.ps1
7. docs/runbooks/durability-wave1.md
8. CI wiring in qa-gauntlet.yml

## Files Touched

- apps/api/src/platform/db/schema.ts (new tables)
- apps/api/src/platform/db/migrate.ts (new DDL)
- apps/api/src/platform/db/repo/session-repo.ts (new)
- apps/api/src/platform/db/repo/workqueue-repo.ts (new)
- apps/api/src/platform/db/repo/index.ts (barrel)
- apps/api/src/auth/session-store.ts (DB-backed)
- apps/api/src/rcm/workqueues/workqueue-store.ts (DB-backed)
- apps/api/src/rcm/payerOps/capability-matrix.ts (DB-backed)
- apps/api/src/middleware/security.ts (unchanged API)
- scripts/qa-gates/restart-durability.mjs (new)
- scripts/verify-phase114-durability-wave1.ps1 (new)
- scripts/verify-latest.ps1 (updated delegate)
- .github/workflows/qa-gauntlet.yml (new gate)
- docs/architecture/store-policy.md (new)
- docs/runbooks/durability-wave1.md (new)
