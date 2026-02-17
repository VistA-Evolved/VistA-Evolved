# Phase 19 — VERIFY Checklist

## API Endpoints

- [ ] `GET /reports/operations` → 200 with `{ ok: true, rpcHealth, process }`
- [ ] `GET /reports/integrations` → 200 with `{ ok: true, summary, entries }`
- [ ] `GET /reports/audit` → 200 with `{ ok: true, stats, events }`
- [ ] `GET /reports/clinical` → 200 with `{ ok: true, totalClinicalActions, uniquePatientCount }`
- [ ] `POST /reports/export` → 200 with `{ ok: true, jobId, status }`
- [ ] `GET /reports/export/jobs` → 200 with `{ ok: true, jobs }`
- [ ] `GET /reports/export/:jobId` → downloads file or 404

## Auth / RBAC

- [ ] All `/reports/*` return 401 without session
- [ ] All `/reports/*` return 403 for non-admin users
- [ ] Export policy blocks clinical export when `EXPORT_ALLOW_PHI=false`

## Audit Trail

- [ ] `report.generate` events are logged on each report view
- [ ] `export.request` events are logged on export creation
- [ ] `export.download` events are logged on export download
- [ ] `export.policy-check` events are logged on denied exports

## Feature Flags

- [ ] `rcm.enabled` added to FeatureFlagId type
- [ ] `rcm.enabled` defaults to false in DEFAULT_FEATURE_FLAGS
- [ ] RCM page shows "disabled" message when flag is false
- [ ] RCM page shows placeholder panels when flag is true

## Web UI

- [ ] `/cprs/admin/reports` renders with 5 tabs
- [ ] `/cprs/admin/rcm` renders feature-gated content

## No Regressions

- [ ] Phase 10→18 verification checks still pass
- [ ] Existing `/metrics`, `/audit/events`, `/audit/stats` endpoints unchanged
- [ ] Existing admin routes unchanged
