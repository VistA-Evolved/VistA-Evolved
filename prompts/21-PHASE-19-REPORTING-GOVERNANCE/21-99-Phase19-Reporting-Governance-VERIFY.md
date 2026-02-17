# Phase 19 — VERIFY Checklist

> **Verified**: 2026-02-17 — All checks PASS

## API Endpoints

- [x] `GET /reports/operations` → 200 with `{ ok: true, rpcHealth, process }`
- [x] `GET /reports/integrations` → 200 with `{ ok: true, summary, entries }`
- [x] `GET /reports/audit` → 200 with `{ ok: true, stats, events }`
- [x] `GET /reports/clinical` → 200 with `{ ok: true, totalClinicalActions, uniquePatientCount }`
- [x] `POST /reports/export` → 200 with `{ ok: true, jobId, status }`
- [x] `GET /reports/export/jobs` → 200 with `{ ok: true, jobs }`
- [x] `GET /reports/export/:jobId` → downloads file or 404

## Auth / RBAC

- [x] All `/reports/*` return 401 without session
- [x] All `/reports/*` return 403 for non-admin users
- [x] Export policy blocks clinical export when `EXPORT_ALLOW_PHI=false`

## Data Minimization / PHI Safety

- [x] Clinical report returns counts only — no PHI text (confirmed: `note` field says so)
- [x] Audit exports include only DFN, not full demographics
- [x] `PHI_CONFIG.auditIncludesDfn` controls DFN in audit events
- [x] No note text, demographics dumps, or free-text patient data in any report endpoint

## Audit Trail

- [x] `report.generate` events are logged on each report view
- [x] `export.request` events are logged on export creation
- [x] `export.download` events are logged on export download
- [x] `export.policy-check` events are logged on denied exports

## Export Governance

- [x] Export jobs recorded with `createExportJob()` and in-memory store
- [x] Job retention enforced via `purgeExpired()` with `EXPORT_CONFIG.jobRetentionHours`
- [x] `GET /reports/export/jobs` lists jobs with stripped data field
- [x] `GET /reports/export/:jobId` requires admin, serves `Content-Disposition: attachment`
- [x] Concurrent job limit enforced (`maxConcurrentJobsPerUser`)
- [x] Row limit enforced (`maxExportRows`)
- [x] Format validation enforced (`allowedFormats`)

## Pagination / Limits / Performance

- [x] `REPORT_CONFIG.defaultPageSize = 100`, `maxPageSize = 500`
- [x] `clampPageSize()` enforces bounds on audit queries
- [x] `maxAuditRangeDays = 90` enforces query time window
- [x] Export capped at `EXPORT_CONFIG.maxExportRows = 10000`
- [x] Report caching with TTLs: ops 30s, integrations 30s, clinical 60s

## Ops Analytics

- [x] `/reports/operations` has: RPC latency, error rates, circuit breaker state, cache hits, process metrics
- [x] `/reports/integrations` has: health summary, per-entry status, queue metrics
- [x] Both endpoints return structured JSON suitable for dashboarding

## Feature Flags

- [x] `rcm.enabled` added to FeatureFlagId type
- [x] `rcm.enabled` defaults to false in DEFAULT_FEATURE_FLAGS
- [x] RCM page shows "disabled" message when flag is false
- [x] RCM page shows placeholder panels when flag is true

## Web UI

- [x] `/cprs/admin/reports` renders with 5 tabs
- [x] `/cprs/admin/rcm` renders feature-gated content

## Prompts Ordering

- [x] Phase 19 folder renumbered from `22-` to `21-` (contiguous after audit file moved)
- [x] VERIFY files in Phase 11, 14, 17 renamed from `-02-` to `-99-`
- [x] Standalone audit file moved to `00-PLAYBOOKS/`
- [x] Sub-phase interleaving pattern codified in `00-ORDERING-RULES.md`

## No Regressions

- [x] Phase 10→18 verification checks still pass
- [x] Existing `/metrics`, `/audit/events`, `/audit/stats` endpoints unchanged
- [x] Existing admin routes unchanged
- [x] `verify-phase19-reporting-governance.ps1` → 130 PASS / 0 FAIL / 0 WARN

## Documentation

- [x] Runbook at `docs/runbooks/vista-reporting-export-governance.md`
- [x] Runbook linked in `docs/runbooks/README.md`
