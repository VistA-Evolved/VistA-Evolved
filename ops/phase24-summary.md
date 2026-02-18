# Phase 24 — Imaging Enterprise Hardening Summary

## VERIFY Pass Results

### Automated Verifier
```
Phase 24 - Imaging Enterprise Hardening
PASS: 84   FAIL: 0   WARN: 0
ALL GATES PASSED (includes Phase 22 + Phase 23 regression)
```

### Live E2E Tests (API + Docker)
| Test | Result |
|------|--------|
| `/health` → 200 | PASS |
| No-auth DICOMweb → 401 | PASS |
| Auth DICOMweb → 200 | PASS |
| QIDO cache: first MISS, second HIT | PASS |
| `/imaging/health` → RBAC + audit + rate limit info | PASS |
| `/imaging/devices` CRUD (create/list/delete/re-register) | PASS |
| AE Title uniqueness → 409 | PASS |
| AE Title re-register after decommission → 201 (BUG-043 fix) | PASS |
| Break-glass start → 201, active → count=1 | PASS |
| Break-glass stop → 200, duplicate stop → 409 | PASS |
| Break-glass negative TTL → 400 (BUG-044 fix) | PASS |
| Audit stats → chain valid, 8 action types logged | PASS |
| Audit chain verify → chainValid: true | PASS |
| Audit CSV export → proper headers, no PHI | PASS |
| Viewer launch → 200 + VIEWER_LAUNCH audited | PASS |
| TypeScript API compilation → clean | PASS |
| TypeScript Web compilation → clean | PASS |

### Bugs Found and Fixed
| Bug ID | Severity | Description |
|--------|----------|-------------|
| BUG-041 | HIGH | `imagingAuditDenied()` corrupts JSONL with orphaned success entries |
| BUG-042 | MEDIUM | CORS origin reflection in proxyToOrthanc — open CORS vuln |
| BUG-043 | MEDIUM | Decommissioned devices block AE Title re-registration |
| BUG-044 | MEDIUM | Negative ttlMinutes creates expired break-glass session |
| BUG-045 | MEDIUM | PHI header strip set incomplete despite comment claims |

### Additional Hardening (not bugs)
- `sanitizeDetail()` now case-insensitive and recursive (depth 5)
- Removed local `SessionData` type shadow in imaging-proxy.ts (imported real type)
- Removed `as any` casts in RBAC checks

## What Changed

### New Files (7)
- `apps/api/src/services/imaging-authz.ts` — Imaging RBAC (4 permissions: imaging_view, imaging_diagnostic, imaging_admin, break_glass) + break-glass system (4 endpoints: start/stop/active/history)
- `apps/api/src/services/imaging-audit.ts` — SHA-256 hash-chained imaging audit trail (15 action types, PHI sanitization, CSV export, chain verification)
- `apps/api/src/services/imaging-devices.ts` — DICOM device registry (CRUD, AE Title validation, C-ECHO via Orthanc, soft delete, IP allowlist)
- `apps/api/src/config/imaging-tenant.ts` — Multi-tenant imaging config (facility→Orthanc URL mapping, AE allowlists per facility)
- `apps/api/src/routes/imaging-audit-routes.ts` — 4 audit compliance endpoints (events, stats, verify, export)
- `docs/imaging/phase24-enterprise-requirements.md` — Enterprise gap analysis (7 sections, 30+ endpoints inventoried)
- `prompts/26-PHASE-24-IMAGING-ENTERPRISE/` — IMPLEMENT + VERIFY prompt files

### Modified Files (4)
- `apps/api/src/index.ts` — Added 3 route plugin registrations (imagingAuthzRoutes, imagingDeviceRoutes, imagingAuditRoutes)
- `apps/api/src/middleware/security.ts` — Added 4 AUTH_RULES for /imaging/health, /imaging/devices, /imaging/audit, /security/break-glass
- `apps/api/src/routes/imaging-proxy.ts` — Added imaging_view RBAC on all DICOMweb read routes, imaging_admin on STOW-RS/upload, DICOMweb per-user rate limiter (120/60s), hash-chained imaging audit logging, denied event logging
- `apps/web/src/components/cprs/panels/ImagingPanel.tsx` — Break-glass active banner, break-glass request panel, admin-only Devices tab, admin-only Audit Log tab

### New Runbooks (3)
- `docs/runbooks/imaging-enterprise-security.md` — RBAC, break-glass, rate limiting guide
- `docs/runbooks/imaging-device-onboarding-enterprise.md` — Device registry, AE Titles, C-ECHO guide
- `docs/runbooks/imaging-audit.md` — Hash-chained audit trail guide

### New Scripts (2)
- `scripts/verify-phase24-imaging-enterprise.ps1` — 84 verification gates
- `scripts/verify-imaging-devices.ps1` — Device registry test harness

### Updated References
- `AGENTS.md` — 6 new gotchas (#34-#39), Phase 24 architecture map
- `scripts/verify-latest.ps1` — Delegates to Phase 24 verifier

## How to Test Manually

### 1. RBAC enforcement
```bash
# Login as admin → DICOMweb access should work
curl -X POST http://localhost:3001/auth/login -H 'Content-Type: application/json' \
  -d '{"accessCode":"PROV123","verifyCode":"PROV123!!"}' -c cookies.txt

# Check /imaging/health to see security + audit subsystem status
curl http://localhost:3001/imaging/health -b cookies.txt
```

### 2. Break-glass
```bash
# Start break-glass
curl -X POST http://localhost:3001/security/break-glass/start \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"reason":"Emergency patient review needed","patientDfn":"100022","ttlMinutes":30}'

# Check active sessions
curl http://localhost:3001/security/break-glass/active -b cookies.txt
```

### 3. Device registry
```bash
# Create device
curl -X POST http://localhost:3001/imaging/devices \
  -H 'Content-Type: application/json' -b cookies.txt \
  -d '{"aeTitle":"TEST_CT_01","hostname":"192.168.1.100","port":11112,"modality":"CT"}'

# List devices
curl http://localhost:3001/imaging/devices -b cookies.txt
```

### 4. Audit trail
```bash
# Query events
curl http://localhost:3001/imaging/audit/events -b cookies.txt

# Verify chain integrity
curl http://localhost:3001/imaging/audit/verify -b cookies.txt
```

## Verifier Output

```
Phase 24 - Imaging Enterprise Hardening (post bug-fix)
PASS: 84   FAIL: 0   WARN: 0
ALL GATES PASSED
```

## Bugs Fixed During VERIFY
- BUG-041: Rewrote `imagingAuditDenied()` to build denied entry directly
- BUG-042: Removed manual CORS headers from `proxyToOrthanc()`
- BUG-043: Added `aeTitleIndex.delete()` on soft-delete
- BUG-044: Added TTL floor + negative rejection in break-glass start
- BUG-045: Added PHI-relevant headers to strip set

## Follow-ups
- Wire `imaging-tenant.ts` into proxy routes (replace hardcoded IMAGING_CONFIG.orthancUrl)
- Add VistA MAG security key checking when RPCs become available
- JSONL audit trail rotation for long-running instances
- Break-glass notification to admin (email/webhook)
- Device registry persistence (currently in-memory, resets on restart)
- C-ECHO result history per device
