# 27-99 — Phase 25: Enterprise BI + Analytics + Clinical Reporting — VERIFY

## Prerequisites
- Phase 24 verifier passes (84+ gates)
- API running with .env.local
- Docker running (VistA + Orthanc + Analytics containers)

## Gate 1: Phase 24 Regression
```powershell
.\scripts\verify-phase24-imaging-enterprise.ps1 -SkipRegression
```
Must be 0 FAIL.

## Gate 2: Data Classification
- docs/analytics/phase25-data-classification.md exists
- Defines 4 data classes: PHI, de-identified, aggregated, operational
- Specifies allowed storage + access patterns per class

## Gate 3: VistA Clinical Report Pipeline
- GET /vista/reports returns report list from ORWRP REPORT LISTS
- GET /vista/reports/text returns report text from ORWRP REPORT TEXT
- Report text rendered safely (HTML-escaped)
- Audit event VIEW_CLINICAL_REPORT logged
- Cache per user+patient (short TTL)

## Gate 4: Analytics Event Stream
- Analytics store captures platform ops events
- Events are tenant-scoped and append-only
- No patient DFN in analytics events
- Salted hash for user IDs in analytics
- Aggregation produces hourly/daily metrics

## Gate 5: Analytics Dashboards
- GET /analytics/dashboards/ops returns ops metrics
- GET /analytics/dashboards/clinical-utilization returns utilization metrics
- Both require analytics_viewer or analytics_admin permission
- Real data from event stream (not mock)

## Gate 6: Octo SQL Analytics
- services/analytics/docker-compose.yml exists
- SQL tables defined for aggregated metrics
- ROcto read-only user documented
- Runbook: docs/runbooks/analytics-octo-rocto.md exists

## Gate 7: BI Exports
- CSV export for metric series (admin-only)
- Export is audited (EXPORT_METRICS event)
- Scheduled export stub exists

## Gate 8: Analytics RBAC
- analytics_viewer permission defined
- analytics_admin permission defined
- Routes enforce proper permissions
- Audit: VIEW_DASHBOARD, EXPORT_METRICS events logged

## Gate 9: Security Scan
- No credentials in Phase 25 files
- No PHI patterns (SSN, DFN in analytics)
- console.log ≤ 6

## Gate 10: TypeScript Compilation
- API: npx tsc --noEmit → exit 0
- Web: npx tsc --noEmit → exit 0

## Gate 11: Documentation
- docs/analytics/phase25-data-classification.md exists
- docs/runbooks/analytics-octo-rocto.md exists
- AGENTS.md updated with Phase 25 gotchas
- Prompt files in 27-PHASE-25-BI-ANALYTICS/
