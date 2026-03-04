# Portal Parity Closure — Phase 140 Runbook

## Overview

Phase 140 closes the portal parity gap by adding:

- **Documents page** — generate and download VistA-backed health documents with signed tokens
- **Consents page** — manage patient consent decisions (HIPAA, research, telehealth, etc.)
- **Nav entries** — immunizations, documents, and consents now appear in sidebar
- **PG tables** — `patient_consent` and `patient_portal_pref` (migration v17)

## Architecture

### Document Center

- `GET /portal/documents` — lists available document types (health summary, immunizations, medications, allergies, labs)
- `POST /portal/documents/generate` — fetches VistA data and creates a signed download token (5-min TTL)
- `GET /portal/documents/download/:token` — single-use signed token download (HMAC-SHA256)
- All clinical data comes from VistA RPCs (ORQQAL LIST, ORWPS ACTIVE, ORQQPX IMMUN LIST, ORWLRR INTERIM)
- Audit trail: `portal.document.list`, `portal.document.generate`, `portal.document.download`

### Consent Management

- `GET /portal/consents` — returns all consent types merged with patient decisions
- `POST /portal/consents` — records consent grant/revoke decision
- PG-backed when `PLATFORM_PG_URL` is configured; in-memory fallback otherwise
- 5 consent types: HIPAA release, data sharing, research, telehealth, portal terms
- Required consents (HIPAA, portal terms) cannot be revoked via UI
- Audit trail: `portal.consent.view`, `portal.consent.update`

### PG Tables (Migration v17)

- `patient_consent` — consent decisions with type, status, signed_at, revoked_at, locale, version
- `patient_portal_pref` — portal preferences (notifications, language, display)
- Both are tenant-scoped with RLS policies

### Navigation

- 3 new sidebar entries: Immunizations (💉), Documents (📑), Consents (✅)
- i18n keys added for en, fil, es locales

## Prerequisites

- VistA Docker running on port 9430
- API running with `.env.local`
- PG running on port 5433 (optional for consents; in-memory fallback works)

## Manual Testing

```bash
# Test document types
curl -s -b cookies.txt http://localhost:3001/portal/documents | jq .

# Generate a document
curl -s -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"documentType":"health_summary"}' \
  http://localhost:3001/portal/documents/generate | jq .

# Download document (use token from above)
curl -s -b cookies.txt http://localhost:3001/portal/documents/download/<token>

# List consents
curl -s -b cookies.txt http://localhost:3001/portal/consents | jq .

# Grant consent
curl -s -b cookies.txt -X POST -H "Content-Type: application/json" \
  -d '{"consentType":"hipaa_release","status":"granted"}' \
  http://localhost:3001/portal/consents | jq .
```

## Verification

```powershell
# TSC
pnpm -C apps/api exec tsc --noEmit
pnpm -C apps/portal build

# Gauntlet
node qa/gauntlet/cli.mjs fast
node qa/gauntlet/cli.mjs rc
```

## Follow-ups

- Health card with QR code (Phase 140D — optional)
- Consent-gated route middleware (future phase)
- PDF binary generation instead of text download
- Consent version tracking with diff view
