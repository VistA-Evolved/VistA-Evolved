# ADR: PACS Viewer Selection

**Status:** Accepted
**Date:** 2026-03-01
**Context:** Wave 12 Phase 306 (Imaging/PACS Production Validation)

## Decision

**Keep OHIF Viewer** as the DICOM image viewer.

## Context

VistA-Evolved needs a web-based DICOM viewer integrated with the DICOMweb proxy
layer (Orthanc). Options considered:

1. **OHIF Viewer** (Open Health Imaging Foundation) -- already integrated
2. **Cornerstone.js** -- lower-level rendering library (OHIF uses it internally)
3. **Custom viewer** -- build from scratch
4. **dwv (DICOM Web Viewer)** -- lighter alternative

## Rationale

- OHIF is already deployed in `services/imaging/docker-compose.yml` (port 3003)
- Phase 24 hardened OHIF with RBAC, break-glass, rate limiting, and tenant config
- OHIF supports DICOMweb (QIDO-RS, WADO-RS, STOW-RS) natively
- Active open-source community (MIT license, RSNA-backed)
- Cornerstone.js is used internally by OHIF -- no benefit to dropping down a layer
- Custom viewer would be months of effort with no clinical advantage

## Consequences

- Continue using OHIF via `services/imaging/docker-compose.yml`
- Upgrade path: OHIF v3.x releases tracked via container tag pinning
- No additional viewer dependencies needed
- OHIF config customization via `ohif/app-config.js` (mounted as Docker volume)

## Alternatives Rejected

| Option | Reason |
|--------|--------|
| Custom viewer | Enormous effort, no clinical advantage |
| dwv | Less feature-complete than OHIF, smaller community |
| Cornerstone.js direct | OHIF already wraps it with clinical UI |
