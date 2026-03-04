# Phase 140 — Portal Parity Closure (Immunizations + Documents + Consents)

## What Changed

### Portal Document Center (5 endpoints)

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
```
