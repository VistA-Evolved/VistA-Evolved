# Phase 523 — C2: ED Durability v1

## Goal
Add PG tables and repo for ED visits and beds. Update store-policy
durability from in_memory_only to pg_backed.

## Implementation
- PG schema: pgEdVisit, pgEdBed in pg-schema.ts
- PG migration v53: CREATE TABLE ed_visit, ed_bed
- PG repo: pg-ed-repo.ts with full CRUD
- CANONICAL_RLS_TABLES: add ed_visit, ed_bed
- Store-policy: update ed-visits, ed-beds to pg_backed

## Verification
- Migration v53 SQL is valid
- Repo exports match store API surface
- RLS table entries present
- Store-policy reflects pg_backed
