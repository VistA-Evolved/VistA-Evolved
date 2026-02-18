# Ops Summary — Phase 25D: Risk Mitigation (ETL + Auth + Persistence)

## What Changed (during risk mitigation)

### Risk Fixes
1. **ETL Writer** — New `analytics-etl.ts` with PG v3.0 wire protocol client
   (zero npm dependencies). Syncs aggregated MetricBuckets to ROcto SQL tables.
   Hooks into aggregator via `setOnBucketsCreated` callback + manual POST sync.

2. **ROcto User Auth** — New `ZVEUSERS.m` creates users via M globals
   (Octo v1.1 lacks CREATE USER SQL). `etl_writer` readwrite, `bi_readonly`
   read-only. Custom `octo.conf` binds 0.0.0.0 + MD5 auth.

3. **Event Persistence** — JSONL flush every 10s to `data/analytics-events.jsonl`.
   Restore on startup. Events survive API restart.

### Octo v1.1 Compat
- `TIMESTAMP` → `VARCHAR(32)` in 7 tables
- Removed `DEFAULT` clauses and BI views
- Fixed INSERT SQL literal syntax
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
