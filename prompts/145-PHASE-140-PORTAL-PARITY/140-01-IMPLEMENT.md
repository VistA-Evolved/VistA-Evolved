# Phase 140 — Portal Parity Closure (Immunizations + Documents + Consents) — IMPLEMENT

## User Request

Complete portal parity by adding:
- A) Immunizations — nav entry for existing page (Phase 65)
- B) Document center — portal page + API for generate/download with signed tokens
- C) Consent management — PG tables (patient_consent, patient_portal_pref), portal UI, consent-gated access
- D) Shareable health card — QR code patient health summary (optional)

VistA-first approach for all clinical data. PG for portal operational state.

## Implementation Steps

1. Create prompt files (this file + 140-99-VERIFY.md)
2. Add audit actions to immutable-audit.ts (portal.document.*, portal.consent.*)
3. PG schema + migration v17:
   - patient_consent table
   - patient_portal_pref table
   - PG repo CRUD
   - Add to tenantTables for RLS
4. API routes:
   - GET /portal/documents — list available document types
   - POST /portal/documents/generate — build VistA-backed PDF
   - GET /portal/documents/download/:token — signed-token download
   - GET /portal/consents — list patient consents
   - POST /portal/consents — record consent decision
5. Portal pages:
   - apps/portal/src/app/dashboard/documents/page.tsx
   - apps/portal/src/app/dashboard/consents/page.tsx
6. Portal nav: add immunizations, documents, consents entries
7. i18n: add keys to en.json, fil.json, es.json
8. Portal API client: add fetch functions to api.ts
9. Runbook + ops artifacts

## Verification Steps

- TSC clean (api + portal)
- Web + portal build
- Live API curl tests for new routes
- Gauntlet FAST + RC stable

## Files Touched

- prompts/145-PHASE-140-PORTAL-PARITY/140-01-IMPLEMENT.md
- prompts/145-PHASE-140-PORTAL-PARITY/140-99-VERIFY.md
- apps/api/src/lib/immutable-audit.ts
- apps/api/src/platform/pg/pg-schema.ts
- apps/api/src/platform/pg/pg-migrate.ts
- apps/api/src/platform/pg/repo/pg-consent-repo.ts (new)
- apps/api/src/routes/portal-documents.ts (new)
- apps/api/src/index.ts
- apps/portal/src/app/dashboard/documents/page.tsx (new)
- apps/portal/src/app/dashboard/consents/page.tsx (new)
- apps/portal/src/components/portal-nav.tsx
- apps/portal/src/lib/api.ts
- apps/portal/public/messages/en.json
- apps/portal/public/messages/fil.json
- apps/portal/public/messages/es.json
- docs/runbooks/portal-parity.md (new)
- ops/summary.md
- ops/notion-update.json
