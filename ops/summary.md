# Ops Summary — Phase 27: Portal Core (Records, Messaging, Appointments, Sharing, Settings)

## What Changed

### Backend Services (6 new files)
- `portal-pdf.ts` — Minimal PDF 1.4 builder, no external deps. Section formatters for allergies, problems, vitals, medications, demographics.
- `portal-messaging.ts` — Threaded secure messaging. Inbox/drafts/sent CRUD. Attachments (5MB, PDF/JPEG/PNG/GIF). SLA disclaimer.
- `portal-appointments.ts` — Demo seed data + request/cancel/reschedule flows.
- `portal-sharing.ts` — Time-limited share links with access codes. DOB verification. Lock after 5 failures.
- `portal-settings.ts` — Language (7), notification toggles, display prefs, MFA stub.
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
