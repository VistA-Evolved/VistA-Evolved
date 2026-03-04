# Phase 265 -- Pilot Hospital Hardening Pack (IMPLEMENT)

## Summary

Add SAT (Site Acceptance Test) suite with 30 scenarios across 10 categories,
degraded-mode tracking with automatic mitigation, and evidence export with
SHA-256 tamper-evident hashing.

## Inventory (files inspected)

- apps/api/src/pilot/site-config.ts (Phase 246 -- pilot site CRUD)
- apps/api/src/pilot/preflight.ts (Phase 246 -- 12 preflight checks)
- apps/api/src/routes/pilot-routes.ts (Phase 246 -- 7 pilot endpoints)
- apps/api/src/posture/\* (Phase 107 -- 8 posture modules, 50+ gates)
- apps/api/src/lib/rpc-resilience.ts (Phase 15B -- circuit breaker)
- apps/api/src/rcm/connectors/connector-resilience.ts (Phase 48)
- apps/api/src/adapters/adapter-loader.ts (Phase 37C -- stub fallback)
- apps/api/src/routes/hardening-routes.ts (Phase 118 -- RC checklist)
- qa/gauntlet/\* (Phase 119 -- 30 gate QA framework)
- tests/k6/hardening-smoke.js (Phase 36 -- k6 load test)

## Files Created

1. apps/api/src/pilot/sat-suite.ts -- SAT scenario engine, run lifecycle, degraded mode tracking, evidence export
2. apps/api/src/routes/sat-routes.ts -- 11 endpoints for SAT runs and degraded mode
3. apps/api/tests/sat-suite.test.ts -- unit tests

## Existing Files Preserved (NOT modified)

- pilot/site-config.ts (Phase 246)
- pilot/preflight.ts (Phase 246)
- routes/pilot-routes.ts (Phase 246)
- All posture modules
- All hardening routes

## Key Decisions

- 30 SAT scenarios covering: connectivity (3), authentication (3), clinical-data (4), orders (3), imaging (3), integrations (3), performance (3), security (3), backup (2), degraded-mode (3)
- Scoring: 60% critical weight + 40% overall -> verdict: accept/conditional/reject
- 8 degradation sources with pre-registered automatic mitigations
- Evidence export includes SHA-256 manifest hash for tamper evidence
- autoCheckFn names are placeholders -- actual implementations delegate to existing infrastructure (posture, preflight, circuit breaker stats)
