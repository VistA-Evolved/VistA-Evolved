# ADR: Imaging Stack — Orthanc Extension

- **Status**: Accepted
- **Date**: 2026-03-01
- **Phase**: 378 (W21-P1)

## Context

Phase 22-24 established Orthanc + OHIF as the imaging stack
(`services/imaging/docker-compose.yml`, `imaging-proxy.ts`, DICOMweb proxy,
audit, device registry). We need to decide whether to keep Orthanc, migrate
to dcm4chee, or adopt a managed PACS for the expanded device/modality
integration scope.

## Decision

**Keep Orthanc and extend** the existing stack for modality connectivity
(MWL, MPPS, DICOM ingest from additional modalities).

### Rationale

1. **Already deployed and proven**: Orthanc is running in dev
   (`services/imaging/docker-compose.yml`) and prod compose
   (`docker-compose.prod.yml`). Phase 22-24 built DICOMweb proxy,
   audit trail, device registry, and ingest reconciliation on top of it.

2. **License**: Orthanc is GPLv3 with a REST API. Our usage (Docker sidecar,
   REST/DICOMweb access) does not create a derivative work concern. dcm4chee
   uses MPL-2.0 for some components but has a larger operational footprint
   (WildFly, Keycloak, LDAP).

3. **MWL/MPPS support**: Orthanc supports Modality Worklist (C-FIND SCP)
   via the worklist plugin and MPPS via the MPPS plugin. Both are
   configuration-only — no custom code needed.

4. **Operational simplicity**: Orthanc is a single C++ binary with Lua
   scripting (already used for `on-stable-study.lua`). dcm4chee requires
   Java EE + multiple containers.

### License Notes

| Component | License | Notes |
|-----------|---------|-------|
| Orthanc | GPLv3 | Server binary — deployed as Docker container |
| Orthanc plugins | GPLv3 or AGPLv3 | DICOMweb, Worklist, MPPS plugins |
| OHIF Viewer | MIT | Client-side viewer |
| Our code | Proprietary | Accesses Orthanc via REST/DICOMweb API |

GPLv3 applies to Orthanc distribution, not to code that accesses it via
network API. Our imaging routes (`imaging-proxy.ts`) are a REST client,
not a derivative work.

### What we extend

- `services/imaging/orthanc.json` — add MWL and MPPS plugin config
- `services/imaging/docker-compose.yml` — add worklist/MPPS volumes
- `apps/api/src/services/imaging-worklist.ts` — bridge to Orthanc MWL
- `apps/api/src/routes/imaging-proxy.ts` — add modality connectivity endpoints

## Consequences

- No new PACS infrastructure — Orthanc is the single imaging backend
- Must manage Orthanc plugin updates for security patches
- If enterprise PACS migration is needed later, the DICOMweb proxy layer
  abstracts the backend — swap Orthanc URL for any DICOM-compliant PACS
