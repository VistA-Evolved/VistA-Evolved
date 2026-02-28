# Phase 179 — Wave 2: K8s / DR / Perf / FHIR (Q179–Q196)

## User Request

Implement Wave 2 covering 18 queue items:

- **Q179** Helm foundation layout (2 charts, scripts, overlays)
- **Q180** Docker image contracts (portal Dockerfile, build-images.ps1)
- **Q181** Shared layer chart (keycloak, observability, minio templates)
- **Q182** Tenant layer chart (API + VistA + PVC + HPA/PDB)
- **Q183** Tenant provisioning (provision/deprovision scripts)
- **Q184** Secrets strategy (.sops.yaml, rotate-secrets.ps1)
- **Q185** PG backup PITR (full/wal/restore)
- **Q186** YottaDB backup (online/offline/restore)
- **Q187** DR drill automation (7-step, RPO/RTO, JSON evidence)
- **Q188** Observability baseline (Grafana dashboard, Prometheus alerts)
- **Q189** Perf tuning runbook
- **Q190** Load test harness (k6 FHIR + mixed)
- **Q191** Queue backpressure (Graphile Worker)
- **Q192** K8s autoscaling (HPA + PDB verified)
- **Q193** FHIR Encounter resource (type, mapper, route, tests)
- **Q194** FHIR cache/ETag (in-memory SHA-256, 304 support)
- **Q195** SMART-on-FHIR posture (discovery endpoint)
- **Q196** FHIR conformance suite (44 structural conformance tests)

Every queue item ends with a verify gate; fix before proceeding.

## Implementation Steps

### Infrastructure (Q179–Q184)
1. Create `infra/helm/ve-shared/` chart with 11 templates
2. Create `infra/helm/ve-tenant/` chart with 9 templates
3. Create `infra/environments/` overlays (dev, staging, prod)
4. Create `infra/scripts/` (11 PowerShell scripts)
5. Add portal Dockerfile + build-images.ps1
6. Add .sops.yaml + dev secrets template + rotate script

### Backup & DR (Q185–Q187)
7. backup-pg.ps1 (full/wal/restore modes)
8. backup-yottadb.ps1 (online/offline/restore modes)
9. dr-drill.ps1 (7-step automated drill + JSON evidence)

### Observability & Perf (Q188–Q192)
10. Grafana dashboard JSON (6 panels) + Prometheus alerts YAML (7 rules)
11. Performance tuning runbook
12. k6 smoke-fhir.js + load-mixed.js
13. backpressure.ts for Graphile Worker
14. HPA + PDB in tenant chart verified

### FHIR R4 (Q193–Q196)
15. EncounterRecord type + adapter methods + VistA ORWCV VST mapper
16. FhirEncounter type + toFhirEncounter mapper + /fhir/Encounter route
17. fhir-cache.ts (ETag, 304, TTL, per-user keys)
18. smart-configuration.ts (/.well-known/smart-configuration)
19. fhir-conformance.test.ts (44 structural tests)

## Verification Steps

Each queue item verified individually:
- Q179: `helm lint` passes for both charts
- Q180: Dockerfile builds, build-images.ps1 validates 5 checks per image
- Q181–Q182: `helm template` renders clean YAML
- Q183–Q192: Scripts parse without errors, all required files exist
- Q193: 74/74 FHIR tests pass (12 Encounter + 1 CapStatement)
- Q194: 78/78 FHIR tests pass (4 cache/ETag tests added)
- Q195: 82/82 FHIR tests pass (4 SMART tests added)
- Q196: 126/126 total FHIR tests pass (82 gateway + 44 conformance)

## Files Touched

### Created
- `infra/helm/ve-shared/` (Chart.yaml, values.yaml, 11 templates)
- `infra/helm/ve-tenant/` (Chart.yaml, values.yaml, 9 templates)
- `infra/environments/` (dev.yaml, staging.yaml, prod.yaml)
- `infra/scripts/` (11 .ps1 files)
- `infra/secrets/dev/shared-secrets.yaml`
- `infra/.sops.yaml`
- `infra/README.md`
- `infra/observability/grafana-dashboard-api.json`
- `infra/observability/prometheus-alerts.yaml`
- `apps/portal/Dockerfile`
- `apps/api/src/jobs/backpressure.ts`
- `apps/api/src/fhir/fhir-cache.ts`
- `apps/api/src/fhir/smart-configuration.ts`
- `apps/api/tests/fhir-conformance.test.ts`
- `tests/k6/smoke-fhir.js`
- `tests/k6/load-mixed.js`
- `docs/runbooks/performance-tuning.md`

### Modified
- `apps/api/src/adapters/types.ts` (EncounterRecord)
- `apps/api/src/adapters/clinical-engine/interface.ts` (getEncounters)
- `apps/api/src/adapters/clinical-engine/stub-adapter.ts` (getEncounters stub)
- `apps/api/src/adapters/clinical-engine/vista-adapter.ts` (getEncounters impl)
- `apps/api/src/fhir/types.ts` (FhirEncounter)
- `apps/api/src/fhir/mappers.ts` (toFhirEncounter + helpers)
- `apps/api/src/fhir/fhir-routes.ts` (Encounter route + cache)
- `apps/api/src/fhir/capability-statement.ts` (Encounter entry)
- `apps/api/src/fhir/index.ts` (cache exports)
- `apps/api/src/server/register-routes.ts` (SMART config)
- `apps/api/src/middleware/security.ts` (SMART auth bypass)
- `apps/api/tests/fhir-gateway.test.ts` (82 tests total)
