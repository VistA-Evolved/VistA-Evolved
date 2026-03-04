# Phase 18 — Enterprise Interop + Imaging Platform Integration

## User Request

Build enterprise interop (HL7/FHIR/DICOM/LIS/PACS) + imaging platform
integration (Orthanc/OHIF-ready) + device onboarding surfaces.
Reference: WorldVistA VistA-FHIR-Server (C0FHIR Suite — RPC `C0FHIR GET FULL BUNDLE`,
endpoint `/fhir?dfn=<DFN>`, context `C0FHIR CONTEXT`).

## Implementation Steps

### A — Integration Registry + Health Model

- Extend `ConnectorConfig` type with new integration types
- Add `IntegrationEntry` with: type, enabled, endpoints, auth, health, queue, metrics
- Add `IntegrationRegistry` in-memory store with CRUD + health tracking
- New file: `apps/api/src/config/integration-registry.ts`

### B — Admin Integration Console API

- Extend `apps/api/src/routes/admin.ts` with integration registry endpoints
- CRUD for integrations, enable/disable, test connection, error log, queue depth
- RBAC admin-only + audit events

### C — Imaging Integration Service

- New file: `apps/api/src/services/imaging-service.ts`
- VistA adapter: patient image list via RPC, metadata fetch, TIU document link
- Archive adapter: Orthanc REST / DICOMweb endpoint config
- Viewer adapter: OHIF launch URL generation

### D — Modality Worklist / Device Onboarding

- Config model for modality AE Titles in integration registry
- Admin UI: onboarding checklist (DICOM echo, MWL, MPPS, audit)

### E — Remote Data Viewer Upgrade

- List configured external sources from integration registry
- Show FHIR endpoint status when C0FHIR is configured

### F — Metrics + Audit

- Per-integration metrics: request count, error rate, last success
- New audit events: integration.config-change, imaging.viewer-launch, integration.dashboard-view

### G — Verifier + Runbook

- `scripts/verify-phase1-to-phase18.ps1` (includes Phase 10→17 checks)
- `docs/runbooks/interop-imaging-phase18.md`
- Update `verify-latest.ps1`

## Files Touched

- `apps/api/src/config/integration-registry.ts` (NEW)
- `apps/api/src/config/tenant-config.ts` (type extensions)
- `apps/api/src/services/imaging-service.ts` (NEW)
- `apps/api/src/routes/admin.ts` (integration endpoints)
- `apps/api/src/routes/imaging.ts` (enhanced)
- `apps/api/src/lib/audit.ts` (new actions)
- `apps/api/src/middleware/security.ts` (auth rules)
- `apps/api/src/index.ts` (register new routes)
- `apps/web/src/app/cprs/admin/integrations/page.tsx` (enhanced)
- `apps/web/src/app/cprs/remote-data-viewer/page.tsx` (upgraded)
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx` (imaging indicators)
- `apps/web/src/stores/tenant-context.tsx` (integration data)
- `scripts/verify-phase1-to-phase18.ps1` (NEW)
- `scripts/verify-latest.ps1` (updated)
- `docs/runbooks/interop-imaging-phase18.md` (NEW)
- `prompts/20-PHASE-18-INTEROP-IMAGING/` (NEW)

## Verification

- Run `scripts/verify-latest.ps1` — all PASS, no FAIL, no new WARN
- Phase 10→17 regression checks included
- Integration registry CRUD validated
- Imaging service adapter load states (configured + unconfigured)
- Viewer launch enabled/disabled correctly
- RBAC admin-only on integration config
