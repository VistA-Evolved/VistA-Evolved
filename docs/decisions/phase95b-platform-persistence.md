# ADR: Phase 95B — Platform Persistence Unification

**Status:** Accepted  
**Date:** 2025-01-20  
**Decision Makers:** Engineering Team

## Context

VistA-Evolved accumulated ~50+ in-memory Map stores across modules (imaging
worklist, analytics, RCM claims, payer registry, etc.). Phase 95 added
JSON-file persistence for the payer registry, but that approach:

- Has no indexing or query capability
- Requires BOM-stripping (BUG-064)
- Cannot enforce referential integrity
- Requires custom read/write/audit code per file

The platform needs a single embedded database that can be adopted incrementally
by each subsystem.

## Decision

Adopt **SQLite** via **better-sqlite3** + **Drizzle ORM** as the platform
persistence layer.

### Key Choices

1. **SQLite** (not Postgres/MySQL): Zero-ops, embedded, single-file, WAL mode
   for concurrent reads. Matches the VistA sandbox operational model.

2. **better-sqlite3** (not node-sqlite3): Synchronous API is simpler, faster,
   and avoids callback hell. Works well with Drizzle ORM.

3. **Drizzle ORM** (not Prisma/TypeORM/Knex): Lightweight, SQL-first, excellent
   TypeScript inference, no code generation step required.

4. **Idempotent raw SQL migrations** (not Drizzle Kit push): Deterministic,
   auditable, no magic. `CREATE TABLE IF NOT EXISTS` + explicit indexes.

5. **Evidence pipeline** before production writes: All payer data changes must
   go through snapshot ingest → diff → review → promote workflow. No direct
   bulk edits.

6. **Audit-by-default**: Every mutation writes to `payer_audit_event` table.
   Audit repo is READ-ONLY (no update/delete methods).

## Schema

Six tables: `payer`, `tenant_payer`, `payer_capability`, `payer_task`,
`payer_evidence_snapshot`, `payer_audit_event`.

## Consequences

- **Positive:** Queryable data, referential integrity, full audit trail,
  evidence-based updates, incremental adoption path
- **Negative:** Native module (better-sqlite3) requires node-gyp build,
  adds ~2MB to node_modules
- **Migration:** Existing JSON-file persistence (Phase 95) continues to work.
  Phase 95B runs alongside it. Future phase will migrate remaining stores.

## File Inventory

| File                                              | Purpose                       |
| ------------------------------------------------- | ----------------------------- |
| `apps/api/src/platform/db/schema.ts`              | Drizzle table definitions     |
| `apps/api/src/platform/db/db.ts`                  | SQLite connection singleton   |
| `apps/api/src/platform/db/migrate.ts`             | Idempotent SQL migrations     |
| `apps/api/src/platform/db/seed.ts`                | Seed from data/payers/\*.json |
| `apps/api/src/platform/db/init.ts`                | Startup entrypoint            |
| `apps/api/src/platform/db/repo/*.ts`              | 6 repository modules          |
| `apps/api/src/platform/payers/evidence-ingest.ts` | Evidence pipeline             |
| `apps/api/src/routes/admin-payer-db-routes.ts`    | Admin REST endpoints          |
| `apps/web/src/app/cprs/admin/payer-db/page.tsx`   | Admin UI                      |
