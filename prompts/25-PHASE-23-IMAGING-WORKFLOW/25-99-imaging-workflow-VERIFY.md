# Phase 23 — Imaging Workflow — VERIFY

## Prerequisites
- Docker running with `imaging` profile: `docker compose --profile dev --profile imaging up -d`
- API server running: `cd apps/api && npx tsx --env-file=.env.local src/index.ts`
- Orthanc accessible at http://localhost:8042
- OHIF accessible at http://localhost:3003

## Gate 1: TypeScript Compilation (API + Web)
```powershell
cd apps/api; npx tsc --noEmit   # expect exit 0
cd apps/web; npx tsc --noEmit   # expect exit 0
```
**PASS criteria:** Both exit 0, no errors.

## Gate 2: Worklist Service Endpoints
```powershell
# 2a. GET empty worklist
curl.exe -s http://127.0.0.1:3001/imaging/worklist | ConvertFrom-Json
# expect: { ok: true, items: [] }

# 2b. GET worklist stats
curl.exe -s http://127.0.0.1:3001/imaging/worklist/stats | ConvertFrom-Json
# expect: { ok: true, stats: { total: 0, ... } }

# 2c. POST create imaging order (session cookie required)
curl.exe -s -X POST http://127.0.0.1:3001/imaging/worklist/orders `
  -H "Content-Type: application/json" `
  -b "ehr_session=<session_cookie>" `
  -d '{"patientDfn":"100022","scheduledProcedure":"CHEST 2 VIEWS","modality":"CR","priority":"routine","clinicalIndication":"Cough","scheduledTime":"2025-01-15T10:00:00Z","facility":"WORLDVISTA","location":"RADIOLOGY"}'
# expect: { ok: true, item: { id: ..., accessionNumber: "VE-...", status: "ordered", ... } }

# 2d. GET worklist filtered by patient
curl.exe -s "http://127.0.0.1:3001/imaging/worklist?patientDfn=100022" | ConvertFrom-Json
# expect: { ok: true, items: [{ ... }] }

# 2e. PATCH status transition
curl.exe -s -X PATCH "http://127.0.0.1:3001/imaging/worklist/<id>/status" `
  -H "Content-Type: application/json" `
  -b "ehr_session=<session_cookie>" `
  -d '{"status":"scheduled"}'
# expect: { ok: true, item: { status: "scheduled", ... } }

# 2f. GET single worklist item
curl.exe -s "http://127.0.0.1:3001/imaging/worklist/<id>" | ConvertFrom-Json
# expect: { ok: true, item: { ... } }
```
**PASS criteria:** All 6 endpoints return expected JSON with `ok: true`.

## Gate 3: Ingest Reconciliation
```powershell
# 3a. POST ingest callback (service auth via X-Service-Key header)
curl.exe -s -X POST http://127.0.0.1:3001/imaging/ingest/callback `
  -H "Content-Type: application/json" `
  -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" `
  -d '{"studyInstanceUid":"1.2.3.4.5.6789","orthancStudyId":"abc-123","patientId":"100022","accessionNumber":"VE-20250115-0001","modality":"CR","studyDate":"20250115","studyDescription":"CHEST 2 VIEWS","seriesCount":1,"instanceCount":2}'
# expect: { ok: true, strategy: "accession-exact"|"patient-modality-date"|"quarantined", ... }

# 3b. Verify linkage was created
curl.exe -s "http://127.0.0.1:3001/imaging/ingest/linkages/by-patient/100022" | ConvertFrom-Json
# expect: linkages array with entry matching the study

# 3c. POST without valid service key → 401
curl.exe -s -X POST http://127.0.0.1:3001/imaging/ingest/callback `
  -H "Content-Type: application/json" `
  -H "X-Service-Key: wrong-key" `
  -d '{"studyInstanceUid":"1.2.3.4.5","orthancStudyId":"x","patientId":"1","modality":"CR"}'
# expect: 401 Unauthorized

# 3d. POST unmatched study (no matching order)
curl.exe -s -X POST http://127.0.0.1:3001/imaging/ingest/callback `
  -H "Content-Type: application/json" `
  -H "X-Service-Key: dev-imaging-ingest-key-change-in-production" `
  -d '{"studyInstanceUid":"9.9.9.9.9","orthancStudyId":"zzz","patientId":"999999","modality":"MR","studyDate":"20250115","accessionNumber":"UNKNOWN-001"}'
# expect: { ok: true, strategy: "quarantined" }

# 3e. GET unmatched studies (admin auth required)
curl.exe -s "http://127.0.0.1:3001/imaging/ingest/unmatched" -b "ehr_session=<admin_session>"
# expect: { ok: true, unmatched: [{ ... }] }
```
**PASS criteria:** Accession-exact linking works when order exists. Service key auth enforced. Unmatched → quarantine.

## Gate 4: Chart Integration (Study Enrichment)
```powershell
# After creating an order and ingesting a study with matching accession:
curl.exe -s "http://127.0.0.1:3001/vista/imaging/studies?dfn=100022" -b "ehr_session=<session>"
# Check response includes orderSummary and studies have linkedOrderId / orderLinked fields
```
**PASS criteria:** Response contains `orderSummary` and studies with linkage data.

## Gate 5: UI Verification (Manual)
1. Navigate to patient chart → Imaging tab
2. **Tab bar visible** with Studies / Worklist / New Order tabs
3. **New Order tab**: form renders with Procedure, Modality, Priority, Scheduled, Clinical Indication. Submit creates order.
4. **Worklist tab**: shows created order with accession, status, linked indicator
5. **Studies tab**: unmatched banner appears when studies lack order linkage. Linked studies show green "Linked" badge in detail panel.
6. **OHIF Viewer**: click "Open in OHIF Viewer" still works on studies with UIDs

## Gate 6: Orthanc Lua Callback (Integration)
1. Verify Lua script is mounted: `docker exec orthanc ls /etc/orthanc/on-stable-study.lua`
2. Upload a test DICOM to Orthanc: `curl.exe -X POST http://localhost:8042/instances -d @test.dcm`
3. Wait 60s (StableAge), check API logs for ingest callback receipt
4. Verify study appears in linkages or unmatched queue

## Gate 7: Security
- `/imaging/ingest/callback` rejects requests without `X-Service-Key`: returns 401
- `/imaging/ingest/callback` rejects requests with wrong key: returns 401
- `/imaging/ingest/unmatched` requires admin session
- `/imaging/ingest/unmatched/:id/link` requires admin session
- No `console.log` additions (structured logger only)
- No hardcoded credentials outside login page

## Gate 8: Regression
```powershell
# Existing Phase 22 imaging status endpoint still works
curl.exe -s http://127.0.0.1:3001/vista/imaging/status | ConvertFrom-Json
# expect: { ok: true, viewerEnabled: true, ... }

# Existing viewer URL endpoint still works
curl.exe -s "http://127.0.0.1:3001/imaging/viewer?studyUid=test" -b "ehr_session=<session>"
# expect: response (may be 404 for unknown UID, but endpoint is reachable)

# Existing proxy endpoint still works
curl.exe -s http://127.0.0.1:3001/imaging/orthanc/system -b "ehr_session=<session>"
# expect: Orthanc system info or 502 if Orthanc down
```

## Gate 9: Documentation
- [ ] `docs/runbooks/imaging-worklist.md` exists with API docs
- [ ] `docs/runbooks/imaging-ingest-reconciliation.md` exists with architecture
- [ ] `docs/runbooks/imaging-device-onboarding.md` exists with procedure
- [ ] `docs/runbooks/imaging-grounding.md` exists with VistA-first plan
- [ ] `prompts/25-PHASE-23-IMAGING-WORKFLOW/25-01-imaging-workflow-IMPLEMENT.md` exists
- [ ] `AGENTS.md` updated with Phase 23 gotchas

## Summary
| Gate | Description | Expected |
|------|-------------|----------|
| 1 | TypeScript compilation | 0 errors |
| 2 | Worklist endpoints (6) | All return ok:true |
| 3 | Ingest reconciliation | Link + quarantine work |
| 4 | Chart integration | orderedSummary in response |
| 5 | UI tabs + order form | Manual visual check |
| 6 | Orthanc Lua callback | Study ingested via callback |
| 7 | Security | Service auth enforced |
| 8 | Regression | Phase 22 endpoints intact |
| 9 | Documentation | All runbooks present |
