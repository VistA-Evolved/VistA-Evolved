# 27-01 — Phase 25: Enterprise BI + Analytics + Clinical Reporting — IMPLEMENT

## User Request

Ship a BI/analytics subsystem that:

- Uses VistA reporting primitives first (Health Summary / ORWRP / FileMan)
- Provides scalable analytics for ops + quality + utilization without PHI leakage
- Supports modern BI tool connectivity (SQL endpoint + exports)
- Is multi-tenant, audited, and performance-safe

## Implementation Steps

### A) Inventory + Data Classification

1. Enumerate existing report UI + endpoints
2. Categorize: clinical (VistA-first), platform ops, analytics (PHI-safe)
3. Create docs/analytics/phase25-data-classification.md

### B) VistA-First Clinical Reporting

1. Implement Health Summary retrieval using ORWRP REPORT TEXT
2. Render safely (no HTML injection), cache per user+patient, audit access

### C) Analytics Event Stream + Store

1. Capture platform ops events (API latency, RPC failures, login counts)
2. Capture usage metrics (panel views, order drafts, imaging views)
3. Tenant-scoped append-only store, salted hashing for user IDs
4. No patient DFN in analytics (only in audit subsystem)

### D) Octo SQL Analytics Endpoint

1. Docker compose for analytics YottaDB + Octo + ROcto
2. SQL tables for 22+ aggregated metrics
3. Read-only BI user, internal ETL user for writes
4. ROcto on internal network, strong auth + IP allowlist

### E) BI Dashboards + Exports

1. Ops Dashboard (uptime, RPC latency, error rates, queue depth)
2. Clinical Utilization Dashboard (visit/order/imaging volume)
3. CSV export for metric series (admin-only)
4. Scheduled export stub with future connector hooks

### F) Analytics RBAC + Audit

1. Roles: analytics_viewer, analytics_admin
2. Audit: VIEW_DASHBOARD, EXPORT_METRICS, SQL_CONNECT
3. Security headers + rate limits on analytics endpoints

### G) Prompt Hygiene + Bug Tracking

1. Prompt folder 27-PHASE-25-BI-ANALYTICS
2. Update AGENTS.md with Phase 25 gotchas
3. Bug tracker updates as needed

## Files Touched

- apps/api/src/services/analytics-store.ts (NEW)
- apps/api/src/services/analytics-aggregator.ts (NEW)
- apps/api/src/services/clinical-reports.ts (NEW)
- apps/api/src/routes/analytics-routes.ts (NEW)
- apps/api/src/routes/clinical-report-routes.ts (NEW)
- apps/api/src/config/analytics-config.ts (NEW)
- apps/api/src/index.ts (MODIFIED)
- apps/api/src/middleware/security.ts (MODIFIED)
- apps/web/src/app/cprs/admin/analytics/ (NEW)
- services/analytics/docker-compose.yml (NEW)
- services/analytics/octo-seed.sql (NEW)
- docs/analytics/phase25-data-classification.md (NEW)
- docs/runbooks/analytics-octo-rocto.md (NEW)
- scripts/verify-phase25-bi-analytics.ps1 (NEW)

## Verification Steps

- verify-latest.ps1 passes
- VistA Health Summary report renders end-to-end
- Analytics dashboards show real metrics
- ROcto SQL endpoint accepts read-only queries
- No PHI in analytics store
- CSV export works for admin
