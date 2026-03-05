# Phase 576 — Notes

> Wave 42: Production Remediation | Phase 576

## Why This Phase Exists

Phase 3A of the remediation plan: many PG tables were created in prior phases but routes still use in-memory Maps. This phase wires those existing tables to their store logic so data survives API restarts and multi-instance deployments.

## Key Decisions

- **Templates**: May already be PG-backed; verify and remove any Map fallback.
- **Webhook/FHIR subscriptions**: If v45/v46 tables don't exist, create them in this phase or Phase 575.
- **Fallback in dev**: Allow in-memory when PG unavailable for faster local iteration; block in rc/prod.

## Deferred Items

- Redis caching layer for hot stores (e.g., telehealth rooms) — Phase 574 covers Redis; optional cache-aside can be added later.
- Batch write optimization for high-throughput stores (e.g., portal access logs) — defer until load testing shows need.
