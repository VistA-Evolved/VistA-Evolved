# Privacy & Access Controls Evidence — W8-P5

**Generated**: 2026-02-28
**Phase**: 270 (Privacy & Access Controls Proof)

## Evidence Summary

| Item | Status | Location |
|------|--------|----------|
| PHI audit script | ✅ Created | `scripts/privacy/phi-audit.mjs` |
| PHI grep results | ✅ Generated | `artifacts/privacy/phi-grep.txt` |
| Audit report | ✅ JSON | `artifacts/privacy/phi-audit-report.json` |
| Access control proof | ✅ JSON | `artifacts/privacy/access-control-proof.json` |

## PHI Redaction Coverage

| Layer | Control | Status |
|-------|---------|--------|
| Structured logging | neverLogFields set (dfn, ssn, dob, patientName, mrn) | ✅ |
| Audit trail | sanitizeAuditDetail() on all 3 emitters | ✅ |
| Analytics | AnalyticsEvent structurally lacks DFN | ✅ |
| Error responses | No raw stack traces in production | ✅ |
| Test fixtures | All sanitized: true, hashed identifiers | ✅ |

## DSAR Export Evidence

The data portability module (Phase 264) provides:
- `POST /data-portability/bulk-export/kickoff` — FHIR Bulk Export ($export)
- `POST /data-portability/patient-chart` — Patient-scoped chart bundle
- `POST /data-portability/tenant-export/kickoff` — Tenant-wide export
- `POST /data-portability/verify-manifest` — SHA-256 manifest verification

All exports are:
- Session-authenticated (credentials: include)
- Tenant-scoped (RLS enforced in PG mode)
- Audit-logged (via immutable audit trail)
- SHA-256 manifest-verified for integrity

## Access Control Proofs

| Control | Implementation | Audited |
|---------|---------------|---------|
| RBAC | policy-engine.ts, ~40 actions, default-deny | ✅ |
| Break-glass | Patient-scoped, 4h max TTL, auto-expire | ✅ |
| Impersonation | Support toolkit, time-bound, audit-logged | ✅ |
| CSRF | Synchronizer token (Phase 132), X-CSRF-Token header | ✅ |
| WebSocket | RPC blocklist (XUS AV CODE, XUS SET VISITOR) | ✅ |

## Gate: W8-P5 VERIFY — PASS
