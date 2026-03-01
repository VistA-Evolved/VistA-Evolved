# Phase 282 — Notes

## Key Decisions

- BASE_PHASE = 280 (max existing prefix was 279)
- ADRs stored in docs/decisions/ (existing pattern, not /docs/adrs/)
- Billing ADR: Lago adapter behind BillingProvider interface
- Feature Flags ADR: Extend existing DB-backed flags + optional Unleash adapter
- Both ADRs reference prior art (ADR-metering-choice.md, ADR-feature-flags-choice.md)

## Existing Assets Referenced

- `docs/decisions/ADR-metering-choice.md` — Prior metering decision (extend analytics-store)
- `docs/decisions/ADR-feature-flags-choice.md` — Prior flags decision (keep DB-backed, extend with %)
- `docs/decisions/ADR-OSS-Integrations.md` — Wave 8 OSS integration strategy
- `apps/api/src/config/tenant-config.ts` — Tenant config with feature flags + UI defaults
- `apps/api/src/platform/pg/repo/module-repo.ts` — DB-backed feature flag CRUD
