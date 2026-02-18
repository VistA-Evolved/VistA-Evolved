# 26-01 — Phase 24 Imaging Enterprise Hardening — IMPLEMENT

## User Request
Make Imaging "enterprise-grade" while staying VistA-first:
- Strong authz + break-glass
- Device onboarding playbook (DICOM conformance-driven)
- DICOM networking hardening (AE title policy, optional TLS posture, allowlists)
- Multi-site readiness (tenant isolation, site/facility routing)
- Audit trail suitable for compliance review
- Performance: caching, streaming-friendly proxy, safe timeouts

## Implementation Steps

### A) Inventory and Gap Triage
1. Read imaging architecture docs, confirm VistA-first design
2. Identify existing endpoints (imaging, proxy, ingest, worklist)
3. Map current audit logging and RBAC model
4. Create docs/imaging/phase24-enterprise-requirements.md

### B) Imaging Authorization & Break-Glass
1. Define imaging_view, imaging_diagnostic, imaging_admin, break_glass roles
2. Enforce in API via security middleware AUTH_RULES
3. Implement POST /security/break-glass/start + /stop
4. Add break-glass UI banner

### C) Imaging Audit Trail (Hash-Chained)
1. Create immutable append-only audit store with hash chaining
2. Imaging-specific actions: VIEW_STUDY, VIEW_SERIES, SEARCH_STUDIES, etc.
3. Compliance admin UI with filters + CSV export
4. No DICOM pixel data or message bodies in audit

### D) Device Onboarding Framework
1. Device Registry in-memory store (AE Title, modality, IP allowlist, TLS mode)
2. CRUD API endpoints for devices
3. Enterprise runbook + test harness script

### E) Imaging Service Hardening
1. DICOMweb proxy rate limiting (separate from general)
2. QIDO caching with TTL
3. WADO-RS streaming with strict timeouts
4. /imaging/health composite endpoint

### F) Multi-Site / Tenant Readiness
1. Tenant/facility → Orthanc URL mapping config
2. Per-facility AE allowlists
3. Document dcm4chee VNA upgrade path

## Files Touched
- apps/api/src/services/imaging-authz.ts (NEW)
- apps/api/src/services/imaging-audit.ts (NEW)
- apps/api/src/services/imaging-devices.ts (NEW)
- apps/api/src/config/server-config.ts (MODIFIED)
- apps/api/src/middleware/security.ts (MODIFIED)
- apps/api/src/routes/imaging-proxy.ts (MODIFIED)
- apps/api/src/index.ts (MODIFIED)
- apps/web/src/components/cprs/panels/ImagingPanel.tsx (MODIFIED)
- docs/imaging/phase24-enterprise-requirements.md (NEW)
- docs/runbooks/imaging-enterprise-security.md (NEW)
- docs/runbooks/imaging-device-onboarding-enterprise.md (NEW)
- docs/runbooks/imaging-audit.md (NEW)
- scripts/verify-imaging-devices.ps1 (NEW)

## Verification Steps
- Run scripts/verify-latest.ps1 (no regression)
- Test break-glass flow (start → active → timeout → audit)
- Test imaging RBAC (blocked without imaging_view)
- Device registry CRUD
- Audit hash chain integrity
- DICOMweb rate limits triggered at threshold
