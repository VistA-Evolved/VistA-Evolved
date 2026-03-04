# Phase 18 — Enterprise Interop + Imaging Platform Integration — Summary

## What Changed

### New Files (API)

- `apps/api/src/config/integration-registry.ts` — Central integration registry model
  with 11 integration types, per-tenant in-memory store, health monitoring, queue
  metrics, error log ring buffer (max 20), and seeded defaults (vista-primary,
  vista-imaging, optional fhir-c0fhir)
- `apps/api/src/routes/interop.ts` — Admin CRUD + probe + toggle + device onboarding
  endpoints under `/admin/registry/`
- `apps/api/src/services/imaging-service.ts` — Enhanced imaging routes with patient
  study list, DICOMweb QIDO-RS/WADO-RS, OHIF viewer URL generation, registry-status

### Modified Files (API)

- `apps/api/src/index.ts` — Import swap (imaging-service), interop route registration,
  integration health in /metrics
- `apps/api/src/lib/audit.ts` — 5 new AuditAction types

### Modified Files (Web)

- `apps/web/src/app/cprs/admin/integrations/page.tsx` — Full rewrite: 3-tab integration
  console (Registry, Device Onboarding, Legacy Connectors)
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx` — Imaging status indicator,
  study list, viewer launch button
- `apps/web/src/app/cprs/remote-data-viewer/page.tsx` — External sources from registry

### Documentation

- `docs/runbooks/interop-imaging-phase18.md` — Full runbook
- `prompts/20-PHASE-18-INTEROP-IMAGING/` — IMPLEMENT + VERIFY prompt files
- `scripts/verify-phase18-interop-imaging.ps1` — 164-check verifier
- `scripts/verify-latest.ps1` — Updated to point to Phase 18 verifier

## How to Test Manually

1. Start Docker + API: `pnpm -C apps/api dev`
2. Login as PROV123/PROV123!! (admin)
3. `curl -b cookies.txt http://127.0.0.1:3001/admin/registry/default` — list integrations
4. `curl -X POST -b cookies.txt http://127.0.0.1:3001/admin/registry/default/probe-all` — probe all
5. `curl -b cookies.txt http://127.0.0.1:3001/admin/registry/default/health-summary` — health summary
6. Navigate to `/cprs/admin/integrations` — 3-tab admin console
7. Navigate to `/cprs` → Reports tab → imaging status + studies
8. `curl http://127.0.0.1:3001/metrics | jq .integrations` — integration health in metrics

## Verifier Output

```
164 PASS, 0 FAIL, 0 WARN
```

## Follow-ups

- Persist integration registry to database (currently in-memory)
- Real DICOMweb endpoints for testing (Orthanc Docker Compose profile)
- OHIF viewer integration with authentication
- C0FHIR Suite KIDS install + Docker testing
- Modality Worklist (MWL) SCP implementation
- HL7v2 MLLP listener for ADT/ORM/ORU
