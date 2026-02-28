# Phase 175 -- Schema Migration Source of Truth

## Implementation Steps
1. Consolidate all PG migrations into sequential versioned list
2. Ensure pg-migrate.ts runs all migrations idempotently on startup
3. Add migration version tracking table
4. Validate all tables have tenant_id columns for RLS

## Files Touched
- apps/api/src/platform/pg/pg-migrate.ts
- apps/api/src/platform/db/schema.ts

## Source
- Derived from wave playbook decomposition (Q213-Q215)
- Original phase specification in wave mega-document
- Enriched by Q219 audit to meet quality floor

## Dependencies
- Requires completion of prior phases in the wave sequence
- See wave playbook for cross-phase dependencies
