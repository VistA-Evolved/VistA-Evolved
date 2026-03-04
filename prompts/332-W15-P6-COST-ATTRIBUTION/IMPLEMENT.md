# Phase 332 — IMPLEMENT: Cost Attribution & Budgets (W15-P6)

## User Request

Implement per-tenant cost tracking with OpenCost integration model,
budget tiers, threshold alerting, anomaly detection, and cost breakdowns.

## Implementation Steps

1. Create `apps/api/src/services/cost-attribution.ts`
   - TenantCostDaily: per-tenant/date/region cost records (7 buckets)
   - OpenCost configuration model (label mapping, scrape interval)
   - Budget tiers (starter/professional/enterprise/custom) per ADR
   - Auto-alerting on threshold breach (warning) and hard limit (critical)
   - Hard limits are notify-only — no auto-throttle per ADR
   - Anomaly detection: 7-day rolling average baseline per ADR
   - Cost breakdown by tenant/period/region
2. Create `apps/api/src/routes/cost-attribution-routes.ts`
   - 17 REST endpoints (cost CRUD, budgets, alerts, anomalies, OpenCost config)
3. Wire AUTH_RULES, register-routes, store-policy

## ADR Reference

docs/adrs/ADR-COST-ATTRIBUTION.md — Option A: OpenCost + supplementary

## Files Touched

- apps/api/src/services/cost-attribution.ts (NEW)
- apps/api/src/routes/cost-attribution-routes.ts (NEW)
- apps/api/src/middleware/security.ts (2 AUTH_RULES)
- apps/api/src/server/register-routes.ts (import + register)
- apps/api/src/platform/store-policy.ts (5 store entries)
