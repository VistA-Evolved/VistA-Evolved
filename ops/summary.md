# Ops Summary — Phase 33: AI Gateway (governed, grounded, safe)

## What Changed

Phase 33 adds a governed AI Gateway with three initial use cases:
intake summary (clinician note draft), lab education (patient portal),
and portal search navigation assistant.

### Architecture
- 11-step gateway pipeline: validate, rate limit, safety check, model resolve,
  RAG assembly, PHI redaction, prompt render, model call, post-safety, audit, return
- Pluggable model registry with stub provider for dev
- Versioned prompt templates with SHA-256 content hashes
- Safety layer blocking 6 disallowed categories (diagnosis, treatment, prescribing, ordering, prognosis, differential)
- PHI redaction engine (10 patterns: SSN, phone, email, DOB, MRN, address, name, DFN, DUZ)
- RAG engine with role-based source access control
- Ring-buffer audit trail with hashed user/patient IDs

### CPRS Integration
- New AI Assist tab (CT_AIASSIST, id: 15) with Intake Summary, Lab Education, Audit sub-tabs
- Governance banner on all AI outputs
- Confirm/reject workflow for clinician review

### Portal Integration
- AI Help page with Lab Education and Portal Help sub-tabs
- Educational disclaimer on all patient-facing outputs

## How to Test

```bash
# Health check
curl http://127.0.0.1:3001/ai/health

# List models (requires auth)
curl http://127.0.0.1:3001/ai/models -b "session=<cookie>"

# Intake summary (requires auth + patient)
curl -X POST http://127.0.0.1:3001/ai/request \
  -H "Content-Type: application/json" \
  -b "session=<cookie>" \
  -d '{"useCase":"intake-summary","patientDfn":"3","userRole":"clinician","input":"Generate intake summary"}'

# Lab education (portal)
curl -X POST http://127.0.0.1:3001/ai/portal/education \
  -H "Content-Type: application/json" \
  -b "portal_session=<cookie>" \
  -d '{"labName":"Hemoglobin A1c","labValue":"7.2%"}'
```

## Verify

TSC --noEmit: pending

## Follow-ups

- Integrate real LLM providers (OpenAI, Anthropic, local models)
- Prompt A/B testing
- Patient consent workflow for AI features
- Feedback loop from confirm/reject data
- Multi-language lab education

### Component A: Messaging Enhancements
- Proxy send-on-behalf, clinician reply from CPRS Tasks tab
- Staff message queue, rate limiter (10/hr), blocklist, attachments OFF by default

### Component B: Refill Requests (VistA-first)
- Patient-initiated refill workflow (requested -> pending_review -> approved/denied)
- Target RPC: PSO RENEW (pending_filing in sandbox)
- Rate limiter (5/hr), duplicate detection, patient cancel

### Component C: Tasks & Notifications
- 6 categories, 4 priority levels, auto-expiry, badge counts
- Patient dismiss/complete, staff queue

### Component D: CPRS Integration
- New Tasks tab (CT_TASKS, id: 14) with Messages/Refills/Tasks sub-tabs

## Files

7 new + 10 modified (see docs/runbooks/phase32-messaging-refills.md)

## Verify

TSC --noEmit: PASS (all 3 apps)

## Follow-ups

- Wire PSO RENEW when production VistA has it
- Task auto-generation on appointment/message events
- ORB notification bridge
- Staff role check on /portal/staff/* routes
- `portal-pdf.ts` — Added immunizations + labs formatters. Added `buildStructuredJsonExport()` for FHIR-mappable JSON export.
- New JSON export route: `GET /portal/export/json` with optional `?sections=` filter.

### SMART Health Cards (Feature-Flagged)
- `portal-shc.ts` — New SHC adapter. Feature-flagged via `PORTAL_SHC_ENABLED` env var. Minimal FHIR Bundle builder for immunizations. Dev-mode JWS signing (HS256 stub). `shc:/` numeric URI generator for QR codes.
- New routes: `GET /portal/shc/capabilities`, `GET /portal/export/shc/:dataset`

### New Portal UI Pages
- `/dashboard/sharing` — Create/manage share links with one-time redeem, TTL selection, curated sections
- `/dashboard/exports` — PDF, structured JSON, and SHC downloads in one page

### Audit Trail Additions
- New actions: `portal.export.json`, `portal.export.shc`, `portal.share.view`

### Navigation
- Added "Share Records" and "Export" entries to portal sidebar (12 items total)

### API Client
- Added `exportJson()`, `getShcCapabilities()`, `exportShc()` functions
- Updated `verifyShare()` to accept optional `captchaToken`

## How to Test Manually

```bash
# 1. Start API
cd apps/api && npx tsx --env-file=.env.local src/index.ts

# 2. Start portal
cd apps/portal && pnpm dev

# 3. Login at http://localhost:3002, navigate to Share Records or Export

# 4. Test share creation via API
curl -X POST http://localhost:3001/portal/shares \
  -H "Content-Type: application/json" \
  -b "portal_session=<token>" \
  -d '{"sections":["medications","allergies"],"ttlMinutes":30,"oneTimeRedeem":true}'

# 5. Test JSON export
curl http://localhost:3001/portal/export/json -b "portal_session=<token>"

# 6. Test SHC capabilities
curl http://localhost:3001/portal/shc/capabilities

# 7. Test SHC export (requires PORTAL_SHC_ENABLED=true)
curl http://localhost:3001/portal/export/shc/immunizations -b "portal_session=<token>"
```

## Verifier Output

```
scripts/verify-phase31-sharing-exports.ps1 — pending
```

## Follow-ups
- Integrate real CAPTCHA provider (reCAPTCHA v3 or hCaptcha)
- Production SHC signing with ES256 + published JWKS
- VistA immunization RPCs (`PX IMMUNIZATION LIST`) for real data
- VistA lab results RPCs (`ORWLR CUMULATIVE REPORT`) for real data
- QR code rendering in portal UI for SHC credentials
- `portal-sensitivity.ts` — Proxy engine with 6 sensitivity rules.

### Route Registration
- `portal-core.ts` — 30+ routes for all Phase 27 modules.
- `portal-auth.ts` — Health routes now call REAL VistA RPCs (5 wired).
- `portal-audit.ts` — 21 audit action types (was 6).
- `index.ts` — portal-core registration.

### Portal UI (6 pages updated + 1 new)
- health, medications, messages, appointments, profile pages — all live data
- `share/[token]/page.tsx` — External share viewer
- `lib/api.ts` — 40+ fetch functions (was 13)

### Docs
- `docs/runbooks/portal-core.md` — Full runbook
- `docs/contracts/portal/known-gaps.md` — Gap analysis with migration paths

## How to Test
```bash
curl -c cookies.txt -X POST http://localhost:3001/portal/auth/login -H "Content-Type: application/json" -d '{"username":"patient1","password":"patient1"}'
curl -b cookies.txt http://localhost:3001/portal/health/allergies
curl -b cookies.txt http://localhost:3001/portal/export/full -o record.pdf
curl -b cookies.txt http://localhost:3001/portal/appointments
curl -b cookies.txt http://localhost:3001/portal/settings
```

## Follow-ups
- Wire remaining 5 RPCs (labs, consults, surgery, dc-summaries, reports)
- VistA MailMan integration (XMXAPI)
- VistA scheduling integration (SD APPOINTMENT LIST)
- MFA, email/SMS delivery, telehealth

### Modified
- `scripts/verify-latest.ps1` — delegates to Phase 26 verifier
- `apps/portal/package.json` — added `@playwright/test` dev dependency

## Verification Output (76 PASS / 0 FAIL / 0 WARN)

| Section | Gates | Status |
|---------|-------|--------|
| 1. Regression (Phase 25) | 1 | PASS |
| 2. Contract Integrity | 14 | PASS |
| 3. Portal App Skeleton | 25 | PASS |
| 4. API Portal Routes | 7 | PASS |
| 5. Security Baseline | 11 | PASS |
| 6. License Guard | 6 | PASS |
| 7. Portal UI Sanity (Playwright + static) | 2 | PASS |
| 8. Documentation | 4 | PASS |
| 9. Web App Regression | 1 | PASS |
| **TOTAL** | **76** | **ALL PASS** |

### Playwright Smoke Tests (11/11)
- Login page renders with form
- All 7 dashboard pages return 200
- Dashboard layout has all 7 nav items
- Clicking each nav item navigates without error
- DataSourceBadge visible on dashboard

## How to Test
```powershell
.\scripts\verify-phase1-to-phase26-portal.ps1 -SkipDocker
# Or just Playwright:
cd apps/portal && npx playwright test --reporter=list
```

## Follow-ups
- Wire portal health routes to VistA RPCs
- Secure messaging, scheduling, telehealth
- Replace dev auth with OIDC/SAML

## Follow-ups
- Wire portal health routes to VistA RPCs
- Secure messaging, scheduling, telehealth
- Replace dev auth with OIDC/SAML
   - File: `services/analytics/docker-compose.yml`
   - Fix: Custom entrypoint that sources `ydb_env_set`, seeds schema, runs `rocto` with full path

### Documentation
- `docs/BUG-TRACKER.md`: Added BUG-046, BUG-047 with root cause and preventive measures

## How to Test Manually

### Analytics Aggregate (BUG-046 fix)
```bash
curl -s -b cookies.txt -X POST http://127.0.0.1:3001/analytics/aggregate \
  -H "Content-Type: application/json"
# Should return {"ok":true,...} not 500
```

### Octo/ROcto (BUG-047 fix)
```bash
docker compose -f services/analytics/docker-compose.yml up -d
# Wait 10s, then:
docker ps --filter "name=ve-analytics"
# Should show: Up X seconds (healthy)
# Port 1338 should be reachable
```

## Verifier Output
```
verify-latest.ps1 (-SkipRegression -SkipDocker): 73 PASS / 0 FAIL / 0 WARN
```

## Follow-ups
- ETL writer to push aggregated data into Octo tables (Phase 26 scope)
- `bi_readonly` ROcto user authentication setup for production
| File | Purpose |
|------|---------|
| `apps/api/src/services/imaging-worklist.ts` | In-memory worklist sidecar: 5 REST endpoints for imaging order lifecycle |
| `apps/api/src/services/imaging-ingest.ts` | Orthanc ingest reconciliation: 3 strategies (accession, fuzzy, quarantine) + 5 endpoints |
| `services/imaging/on-stable-study.lua` | Orthanc Lua callback: fires on OnStableStudy, POSTs to API ingest endpoint |
| `services/imaging/ae-title-template.json` | DICOM AE Title device config template |
| `docs/runbooks/imaging-worklist.md` | Worklist API documentation |
| `docs/runbooks/imaging-ingest-reconciliation.md` | Ingest reconciliation architecture + API docs |
| `docs/runbooks/imaging-device-onboarding.md` | DICOM device onboarding procedure |
| `docs/runbooks/imaging-grounding.md` | VistA-first linking plan + RPC availability matrix |
| `prompts/25-PHASE-23-IMAGING-WORKFLOW/25-01-imaging-workflow-IMPLEMENT.md` | Implementation prompt |
| `prompts/25-PHASE-23-IMAGING-WORKFLOW/25-99-imaging-workflow-VERIFY.md` | Verification prompt |

### Modified Files
| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Register imaging-worklist + imaging-ingest route plugins |
| `apps/api/src/config/server-config.ts` | Add `IMAGING_INGEST_WEBHOOK_SECRET` to IMAGING_CONFIG |
| `apps/api/src/lib/audit.ts` | Add 6 new Phase 23 audit actions |
| `apps/api/src/middleware/security.ts` | Add `"service"` AuthLevel + `/imaging/ingest/callback` rule |
| `apps/api/src/services/imaging-service.ts` | Enrich studies with linkage data + orderSummary |
| `services/imaging/orthanc.json` | Register Lua script |
| `services/imaging/docker-compose.yml` | Mount Lua script + env vars for callback |
| `apps/web/src/components/cprs/panels/ImagingPanel.tsx` | Tab bar, worklist view, order form, linkage badges |
| `AGENTS.md` | Add gotchas #29–#33, update architecture map |

## How to Test Manually

### 1. Start services
```powershell
cd services/imaging
docker compose --profile dev --profile imaging up -d
cd ../../apps/api
npx tsx --env-file=.env.local src/index.ts
```

### 2. Create an imaging order
```powershell
curl.exe -s -X POST http://127.0.0.1:3001/imaging/worklist/orders `
  -H "Content-Type: application/json" -b "ehr_session=<cookie>" `
  -d '{"patientDfn":"100022","scheduledProcedure":"CHEST 2 VIEWS","modality":"CR","priority":"routine","clinicalIndication":"Annual screening","scheduledTime":"2025-01-15T10:00:00Z","facility":"WORLDVISTA","location":"RADIOLOGY"}'
```

### 3. Simulate Orthanc ingest callback
```powershell
curl.exe -s -X POST http://127.0.0.1:3001/imaging/ingest/callback `
  -H "Content-Type: application/json" `
  -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" `
  -d '{"studyInstanceUid":"1.2.3.4.5","orthancStudyId":"test-abc","patientId":"100022","accessionNumber":"<accession>","modality":"CR","studyDate":"20250115","studyDescription":"CHEST","seriesCount":1,"instanceCount":2}'
```

### 4. Verify linkage
```powershell
curl.exe -s "http://127.0.0.1:3001/imaging/ingest/linkages/by-patient/100022"
```

### 5. UI verification
- Open web app → patient chart → Imaging tab
- Verify 3 tabs: Studies, Worklist, New Order
- Create order via New Order tab  
- Check worklist tab shows the order

## Verifier Output
```
Phase 25 Verification Summary
  PASS: 74
  FAIL: 0
  WARN: 0
RESULT: ALL GATES PASSED
```

## Follow-ups
1. ETL sync count in verification script
2. JSONL rotation/max-size guard for production
3. SQL VIEWs for common BI queries
4. ROcto passwords: env var rotation for production
5. VistA Radiology RPC integration — migrate sidecar to native ordering
6. DICOM MWL — implement MWL SCP in Orthanc
