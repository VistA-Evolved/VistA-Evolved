# Phase 146 -- Durability Wave 3: Store Elimination (IMPLEMENT)

> **Placeholder -- implementation deferred to Phase 146.**

## Scope
Persist all high-risk in-memory Map stores to PostgreSQL.
Targets from Phase 145 priority backlog: Blockers #1, #4, #6, #7, #10.

## Key stores to migrate
- RCM claim store, payment store, LOA store
- Portal access log, session, consent, enrollment
- Imaging worklist, ingest reconciliation
- Telehealth room store
- Credentials, scrub rules, EDI pipeline state

## Constraints
- VistA-first: do not bypass VistA for clinical data
- Use existing PG migration infrastructure (`pg-migrate.ts`)
- Register all stores in `store-policy.ts` with `durability: "pg_backed"`
- Gauntlet G21 must stay green after migration
