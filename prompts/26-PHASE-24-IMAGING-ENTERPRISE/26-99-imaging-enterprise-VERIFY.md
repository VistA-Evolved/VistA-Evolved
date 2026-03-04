# 26-99 — Phase 24 Imaging Enterprise Hardening — VERIFY

## Prerequisites

- Phase 23 verifier passes (80+ gates)
- API running with .env.local
- Docker running (Orthanc + OHIF)

## Gate 1: Phase 23 Regression

```powershell
.\scripts\verify-phase23-imaging-workflow.ps1 -SkipRegression
```

Must be 0 FAIL.

## Gate 2: Imaging RBAC

- Unauthenticated → 401 on all imaging endpoints
- Session without imaging_view → 403 on study list, viewer, DICOMweb
- Session with imaging_view → 200 on study list
- Device registry requires imaging_admin

## Gate 3: Break-Glass

- POST /security/break-glass/start → requires reason + TTL + patientDfn
- Break-glass session allows access to restricted patient imaging
- Hard timeout enforced (cannot exceed max TTL)
- Audit log contains BREAK_GLASS_START/STOP events
- POST /security/break-glass/stop terminates early

## Gate 4: Imaging Audit Trail

- Hash-chained entries with sha256 prev-hash
- Tenant-scoped queries
- CSV export (imaging_admin only)
- No DICOM pixel data in audit entries
- Filter by date, user, patient, study UID

## Gate 5: Device Registry

- CRUD: create, list, get, update, delete devices
- AE Title uniqueness enforced
- IP allowlist validation (CIDR format)
- TLS mode enum enforced

## Gate 6: Service Hardening

- DICOMweb proxy rate limit hit at threshold → 429
- QIDO cache returns cached response within TTL
- WADO-RS timeout enforced
- /imaging/health returns composite status

## Gate 7: Multi-Tenant Config

- Tenant config mapping exists in code
- Per-facility AE allowlists
- No hardcoded single-tenant values in imaging config

## Gate 8: Security Scan

- No credentials in Phase 24 files
- No PHI patterns (SSN)
- console.log ≤ 6

## Gate 9: TypeScript Compilation

- API: npx tsc --noEmit → exit 0
- Web: npx tsc --noEmit → exit 0

## Gate 10: Documentation

- docs/imaging/phase24-enterprise-requirements.md exists
- docs/runbooks/imaging-enterprise-security.md exists
- docs/runbooks/imaging-device-onboarding-enterprise.md exists
- docs/runbooks/imaging-audit.md exists
- AGENTS.md updated with Phase 24 gotchas
