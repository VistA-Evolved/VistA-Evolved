# Phase 523 — C2: VERIFY
## Gates
1. pg-schema.ts exports pgEdVisit, pgEdBed
2. pg-migrate.ts has v53 migration with ed_visit + ed_bed DDL
3. pg-ed-repo.ts exists with CRUD functions
4. CANONICAL_RLS_TABLES includes ed_visit, ed_bed
5. store-policy.ts ed-visits + ed-beds show pg_backed
