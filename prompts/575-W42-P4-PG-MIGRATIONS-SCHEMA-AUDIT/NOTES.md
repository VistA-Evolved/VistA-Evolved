# Phase 575 — Notes

## Why This Phase Exists

Phase 3B of the remediation plan requires PG tables for 17 in-memory stores.
These tables must exist before PG repos can be created and wired.

## Decisions

- **Single migration v60**: All 14 tables in one migration for atomicity.
  The remaining 3 (webhook_subscription, fhir_subscription, plugin_registry)
  already exist from prior phases.
- **JSONB for flexible schemas**: Several tables use `JSONB` columns for
  semi-structured data (responses, plans, details) that varies by domain.
- **TEXT primary keys**: Consistent with existing pattern (UUIDs generated
  in application code, not by PG).

## Deferred

- PG repos for each table — Phase 577
- Schema integrity audit of all 120+ existing tables — Phase 584
