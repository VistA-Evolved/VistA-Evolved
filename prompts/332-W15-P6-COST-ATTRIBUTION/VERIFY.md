# Phase 332 — VERIFY: Cost Attribution & Budgets (W15-P6)

## Verification Steps

1. `npx tsc --noEmit` — 0 errors
2. Service exports: ingestCostRecord, getCostBreakdown, setBudget, listBudgets,
   acknowledgeAlert, resolveAlert, detectAnomalies, getOpenCostConfig, getCostSummary
3. 17 REST endpoints under /platform/costs/, /platform/budgets/
4. AUTH_RULES: 2 admin rules (costs, budgets)
5. Store-policy: 5 entries (cost-records, tenant-budgets, budget-alerts,
   cost-anomalies, cost-audit-log)
6. Budget tier defaults match ADR table
7. Anomaly detection uses 7-day rolling average per ADR
8. Hard limits are notify-only, no throttling per ADR

## Evidence

- tsc: 0 errors
- ADR-COST-ATTRIBUTION alignment verified
