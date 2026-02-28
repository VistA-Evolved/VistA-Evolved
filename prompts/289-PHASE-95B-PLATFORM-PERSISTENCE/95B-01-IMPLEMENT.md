# Phase 95B — Platform Persistence Unification + Payer Registry Audit/Evidence

## Status: IMPLEMENT

## Summary
Superseding patch to Phase 95. Upgrades payer registry from JSON-file persistence
to SQLite via Drizzle ORM. Adds structured evidence ingest pipeline, immutable
audit trail backed by DB, and proper capability matrix change tracking.

## Non-Negotiable Constraints
1. SQLite file DB for local/dev (no external server required)
2. Optional Postgres via DATABASE_URL (supported but not required)
3. JSON used ONLY for fixtures/seeds/committed snapshots — NOT live state
4. One ADR, one runbook, no scattered docs
5. VistA IB/AR/PCE remains authoritative billing ledger
6. No fabricated APIs/URLs; no credential storage

## Persistence Inventory (pre-Phase 95B)
| File | Subsystem | Persistence Type |
|------|-----------|------------------|
| rcm/payers/payer-persistence.ts | Payer Registry (Phase 95) | JSON file + in-memory cache |
| rcm/payers/payer-audit.ts | Payer Audit (Phase 95) | In-memory ring + JSONL file |
| rcm/payers/evidence-manager.ts | Evidence (Phase 95) | Stateless (URL hashing) |
| rcm/payer-registry/registry.ts | Legacy Payer Registry (Phase 38) | In-memory Map (seed-loaded) |
| rcm/payers/ph-hmo-registry.ts | PH HMO Registry (Phase 93) | In-memory Map (seed-loaded) |
| rcm/payerOps/registry-store.ts | PayerOps Registry (Phase 88) | In-memory Map |
| rcm/payerOps/capability-matrix.ts | Capability Matrix (Phase 88) | In-memory Map |
| ~50+ other stores | Various subsystems | In-memory Maps |

## Implementation Plan
1. Add drizzle-orm + better-sqlite3 to apps/api
2. Create apps/api/src/platform/db/ with schema, migrations, repos
3. Create evidence ingest pipeline (JSON snapshot, PDF upload, URL fetch OFF)
4. Create admin routes for payer registry CRUD, evidence, audit
5. Update admin UI with SQLite-backed data
6. Wire DB init into server startup

## Files Created
- apps/api/src/platform/db/db.ts
- apps/api/src/platform/db/schema.ts
- apps/api/src/platform/db/migrate.ts
- apps/api/src/platform/db/seed.ts
- apps/api/src/platform/db/init.ts
- apps/api/src/platform/db/repo/payer-repo.ts
- apps/api/src/platform/db/repo/tenant-payer-repo.ts
- apps/api/src/platform/db/repo/capability-repo.ts
- apps/api/src/platform/db/repo/task-repo.ts
- apps/api/src/platform/db/repo/evidence-repo.ts
- apps/api/src/platform/db/repo/audit-repo.ts
- apps/api/src/platform/db/repo/index.ts
- apps/api/src/platform/index.ts
- apps/api/src/platform/payers/evidence-ingest.ts
- apps/api/src/routes/admin-payer-db-routes.ts
- apps/web/src/app/cprs/admin/payer-db/page.tsx

## Files Modified
- apps/api/package.json (add drizzle-orm, better-sqlite3, @types/better-sqlite3)
- apps/api/src/index.ts (add DB init + new routes)
- .gitignore (add data/platform.db*)

## Verification
- scripts/verify-phase95b-persistence.ps1
