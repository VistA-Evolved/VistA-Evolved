# Phase 19 — Reporting + Export Governance + Ops Analytics + Optional RCM

## User Request

Implement Phase 19 with five deliverables:

- A) Reporting API endpoints (`/reports/operations`, `/reports/integrations`, `/reports/audit`, `/reports/clinical`)
- B) Export governance (policy config, job model, CSV/JSON generation, audit every export)
- C) Admin reports UI under `/cprs/admin/reports`
- D) Optional RCM/billing placeholder surfaces behind feature flag
- E) Prompts, runbook, verifier

## Non-Negotiables

- No regressions: Phases 10→18 must still PASS
- Exports are RBAC-gated and fully audited; no bulk PHI export by default
- Reports are paginated, cached, and have query limits

## Implementation Steps

### A — Reporting API

1. Create `apps/api/src/config/report-config.ts` — REPORT_CONFIG + EXPORT_CONFIG constants
2. Create `apps/api/src/routes/reports.ts` — Fastify plugin with 4 GET endpoints + 1 POST export
3. Wire into `apps/api/src/index.ts` — `server.register(reportRoutes)`
4. Add `/reports/` to AUTH_RULES in `apps/api/src/middleware/security.ts`

### B — Export Governance

1. Create `apps/api/src/lib/export-governance.ts` — ExportPolicy, ExportJob, CSV/JSON generators
2. Add new AuditAction types to `apps/api/src/lib/audit.ts`:
   - `report.generate`, `export.request`, `export.download`, `export.policy-check`
3. Export endpoints are rate-limited, RBAC-gated, and fully audited

### C — Admin Reports UI

1. Create `apps/web/src/app/cprs/admin/reports/page.tsx` — dashboard with tabs for each report type
2. Export buttons (CSV/JSON) trigger audited downloads
3. Follow existing CPRS admin page conventions

### D — RCM Placeholder

1. Add `"rcm.enabled"` to FeatureFlagId in `apps/api/src/config/tenant-config.ts`
2. Create `apps/web/src/app/cprs/admin/rcm/page.tsx` — placeholder gated by feature flag

### E — Docs

1. Create prompt files (this file + 22-99-VERIFY)
2. Create `docs/runbooks/vista-reporting-export-governance.md`
3. Update verifier script

## Files Touched

- `apps/api/src/config/report-config.ts` (NEW)
- `apps/api/src/lib/export-governance.ts` (NEW)
- `apps/api/src/routes/reports.ts` (NEW)
- `apps/api/src/index.ts` (EDIT — register reportRoutes)
- `apps/api/src/middleware/security.ts` (EDIT — AUTH_RULES)
- `apps/api/src/lib/audit.ts` (EDIT — new action types)
- `apps/api/src/config/tenant-config.ts` (EDIT — new feature flag)
- `apps/web/src/app/cprs/admin/reports/page.tsx` (NEW)
- `apps/web/src/app/cprs/admin/rcm/page.tsx` (NEW)
- `docs/runbooks/vista-reporting-export-governance.md` (NEW)
- `scripts/verify-latest.ps1` (EDIT — Phase 19 checks)
- `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-01-*.md` (NEW)
- `prompts/21-PHASE-19-REPORTING-GOVERNANCE/21-99-*.md` (NEW)

## Verification Steps

- All Phase 10→18 tests still pass
- `GET /reports/operations` returns ops metrics (admin only)
- `GET /reports/integrations` returns integration health (admin only)
- `GET /reports/audit` returns audit summary (admin only)
- `GET /reports/clinical` returns counts only, no PHI text (admin only)
- `POST /reports/export` creates audited export job
- Non-admin users get 403 on all /reports/\* endpoints
- Web UI at `/cprs/admin/reports` renders with tabs
- RCM placeholder at `/cprs/admin/rcm` renders behind feature flag
