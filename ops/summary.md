# Phase 143 VERIFY -- AI Intake Engine

## What Changed (VERIFY fixes)

### 1. Portal → Brain Provider Wiring (HIGH)
- `apps/portal/src/app/dashboard/intake/page.tsx`: `startNewIntake()` now sends `brainProvider: selectedProvider` in POST body
- `apps/api/src/intake/intake-routes.ts`: `createSession()` now receives `body.brainProvider`
- **Before**: Provider dropdown existed but selection was dead — never transmitted

### 2. TIU Draft VistA RPC Capability Check (HIGH)
- `apps/api/src/intake/brain-routes.ts`: `/tiu-draft` now checks `isRpcAvailable("TIU CREATE RECORD")` and `isRpcAvailable("TIU SET DOCUMENT TEXT")`
- Returns `status: "integration_pending"` with per-RPC breakdown when VistA unavailable
- Returns `status: "draft_ready"` only when both RPCs are confirmed available

### 3. Error Handling on Brain Routes (MEDIUM)
- All 5 brain operation routes (start, next, submit, summary, tiu-draft) now have try/catch
- Structured `log.error()`, 500 responses with safe error messages

### 4. AUTH_RULE for /intake/ (PRE-EXISTING BUG FIX)
- `apps/api/src/middleware/security.ts`: Added `{ pattern: /^\/intake\//, auth: "none" }`
- Portal users (with `portal_session` cookie) were blocked by auth gateway
- Intake routes do own session checking — matches `/portal/` pattern

## Verifier Output
- Gauntlet FAST: 4P/0F/1W (baseline maintained)
- Gauntlet RC: 15P/0F/1W (baseline maintained)
- TSC: clean (api, portal, web)
- Runtime: All 10 brain endpoints exercised, 3 languages, TIU VistA check confirmed

## Follow-ups
- Clinical question i18n: Pack text is English-only; certified medical translation needed
- Brain audit hash chain linking (low priority — append-only with FIFO eviction)
- LLM/3P integration: Env-gated scaffolds ready; needs real AI Gateway endpoint

---

# Phase 142 -- RCM Operational Excellence (Polling + Denial Loop + Reconciliation)

## What Changed

### A. Durable Job Queue (SQLite-Backed)
- New `rcm_durable_job` table with idempotency, retry+backoff, dead-letter, priority scheduling
- `DurableJobQueue` class implementing `RcmJobQueue` interface with full SQLite persistence
- Fallback to `InMemoryJobQueue` if DB unavailable
- 2 new job types: `REMITTANCE_IMPORT`, `DENIAL_FOLLOWUP_TICK`
- Store policy entry added

### B. Evidence-Gated Adapter Enforcement
- `evidence-gate.ts` checks integration_evidence registry before payer API calls
- Missing/unverified evidence blocks the call with audit trail
- Stale evidence (>90 days) generates warning; `RCM_EVIDENCE_STRICT=true` hard blocks
- Evidence Gate tab in RCM admin UI

### C. Denial Followup Tick Job
- Background SLA scanner: finds denials approaching/past deadline
- Creates work queue items for approaching/overdue SLA denials
- Dedup via workqueue source check
- Configurable: `RCM_DENIAL_FOLLOWUP_HORIZON_DAYS=7`, `RCM_DENIAL_FOLLOWUP_INTERVAL_MS=3600000`
- Enabled by default in PollingScheduler

### D. Reconciliation Automation
- `remittance-import-job.ts`: Background ERA 835 import processing
- `runBatchMatch()` wrapper for matching engine
- Auto-underpayment detection (threshold: `RCM_UNDERPAYMENT_THRESHOLD=0.95`)

### E. Ops Routes (5 New Endpoints)
- `GET /rcm/ops/jobs/durable` -- Durable job stats + list
- `POST /rcm/ops/jobs/durable/purge` -- Purge completed jobs
- `GET /rcm/ops/evidence-gate/check` -- Evidence validation endpoint
- `POST /rcm/ops/denial-followup/run` -- Manual trigger for denial tick
- `POST /rcm/ops/enqueue-remittance` -- Enqueue a remittance import job

### F. 4 New RCM Audit Actions
- `evidence.gate_blocked`, `evidence.stale_warning`, `denial.followup_flagged`, `remittance.import_processed`

## Verifier Output
- Gauntlet FAST: 4P/0F/1W (matches baseline)
- Gauntlet RC: 15P/0F/1W (matches baseline)
- TSC: clean (both api and web)

## Follow-ups
- Enable REMITTANCE_IMPORT polling via `RCM_REMITTANCE_IMPORT_ENABLED=true` when 835 parsers wired
- Add PG-backed durable queue variant when `PLATFORM_RUNTIME_MODE=rc/prod`
- `GET /portal/documents` — Lists 5 document types (health_summary, immunization_record, medication_list, allergy_list, lab_results)
- `POST /portal/documents/generate` — Generates signed HMAC-SHA256 token (5-min TTL, single-use) for document download
- `GET /portal/documents/download/:token` — Downloads VistA-sourced document via signed token
- `GET /portal/consents` — Lists 5 consent types with status (hipaa_release, data_sharing, research_participation, telehealth_consent, portal_terms)
- `POST /portal/consents` — Updates consent status (granted/revoked) with PG persistence

### Data Model
- **PG migration v17**: `patient_consent` + `patient_portal_pref` tables
- **RLS**: Both tables added to `applyRlsPolicies()` tenant tables (now 46)
- **pg-consent-repo.ts**: CRUD repo for consents + portal preferences (Drizzle ORM)

### Audit
- **immutable-audit.ts**: +5 actions (`portal.document.list`, `portal.document.generate`, `portal.document.download`, `portal.consent.view`, `portal.consent.update`)

### Portal UI
- **documents/page.tsx**: Document center with generate/download workflow, DataSourceBadge, card layout
- **consents/page.tsx**: Consent management with grant/revoke, status badges, required indicators
- **portal-nav.tsx**: +3 nav items (Immunizations 💉, Documents 📑, Consents ✅)
- **i18n**: 3 new nav keys in en.json, fil.json, es.json

### Security
- Signed tokens: HMAC-SHA256 with random 32-byte secret, 5-min TTL, single-use, in-memory store with 60s cleanup
- Session-authenticated endpoints via `requirePortalSession()`
- Consent writes audited via `immutableAudit()`

## How to Test Manually

```bash
# Login as portal patient
curl -X POST http://localhost:3001/portal/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"patient1","password":"patient1"}' \
  -c cookies-p140.txt

# List document types
curl http://localhost:3001/portal/documents -b cookies-p140.txt

# Generate signed token for allergy_list
curl -X POST http://localhost:3001/portal/documents/generate \
  -H 'Content-Type: application/json' \
  -d '{"documentType":"allergy_list"}' -b cookies-p140.txt

# Download document (use token from generate response)
curl http://localhost:3001/portal/documents/download/<TOKEN> -b cookies-p140.txt

# List consents
curl http://localhost:3001/portal/consents -b cookies-p140.txt

# Grant a consent
curl -X POST http://localhost:3001/portal/consents \
  -H 'Content-Type: application/json' \
  -d '{"consentType":"hipaa_release","status":"granted"}' -b cookies-p140.txt
```

## Verifier Output

- **Gauntlet FAST**: 4 PASS / 0 FAIL / 1 WARN
- **Gauntlet RC**: 15 PASS / 0 FAIL / 1 WARN
- **TSC**: Clean (API + Portal + Web)
- **Builds**: Clean (24 static pages including new documents + consents)

## Follow-ups
- Health card with QR code (optional, deferred)
- Consent-gated route middleware (future phase)
- VistA consent integration when consent RPCs available
  -d '{"patientDfn":"3","clinicName":"Primary Care"}'

curl http://localhost:3001/scheduling/clinic/44/preferences -b cookies.txt
```

## Follow-ups
- Wire SDOE UPDATE ENCOUNTER for real VistA check-in/check-out writeback
- Migrate in-memory request store to full PG-backed request queue
- Add scheduling notification hooks (email/SMS on approve/reject)
- Clinic preferences: operating hours builder UI