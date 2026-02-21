# Phase 80 IMPLEMENT — Patient Record Portability v1 (Health Summary First)

**Phase**: 80
**Bundle**: Patient Record Portability
**Date**: 2026-02-22

## User Request

Implement patient-facing record portability:
- Generate a patient summary using VistA Health Summary / reporting capabilities
- Allow download (PDF/HTML)
- Allow share link (time-limited, revocable) for another provider
- Include "who accessed" audit view for the patient

## Non-Negotiables

- VistA-first: use GMTS / ORWRP RPCs first
- No exporting raw PHI into logs
- Share features must be time-limited and auditable
- Do not claim compliance; implement controls

## Implementation Steps

### 1. VistA Plan Artifact
- `scripts/portability/buildPortabilityPlan.ts` -> `/artifacts/phase80/portability-plan.json`
- Probes VistA for available Health Summary types via `ORWRP REPORT LISTS`
- Documents which RPCs are used vs which are pending

### 2. API Endpoints (new route file: `apps/api/src/routes/record-portability.ts`)
- `POST /portal/record/export` — generate summary, return file token
- `GET /portal/record/export/:token` — download PDF/HTML by token
- `POST /portal/record/share` — create share link with TTL
- `POST /portal/record/share/:id/revoke` — revoke share link
- `GET /portal/record/share/audit` — access audit for patient's shares

### 3. Storage (new service: `apps/api/src/services/record-portability-store.ts`)
- In-memory export store (Map keyed by token)
- AES-256-GCM encryption at rest for stored summaries
- TTL cleanup job (runs every 5 minutes)
- Reuses portal-sharing.ts patterns for share links

### 4. Portal UI (`apps/portal/src/app/dashboard/records/page.tsx`)
- "My Records" page with 3 tabs: Summary, Download, Share
- Download button triggers export + auto-download
- Share link creation with TTL selector + revoke
- Access audit table

### 5. E2E Tests (`apps/portal/e2e/record-portability.spec.ts`)
- Export + download flow
- Share link access then revoke, confirm denied
- Expired token denied

## Files Touched

- `apps/api/src/services/record-portability-store.ts` (new)
- `apps/api/src/routes/record-portability.ts` (new)
- `apps/api/src/index.ts` (register routes)
- `apps/api/src/services/portal-audit.ts` (add new audit actions)
- `apps/portal/src/app/dashboard/records/page.tsx` (new)
- `apps/portal/e2e/record-portability.spec.ts` (new)
- `scripts/portability/buildPortabilityPlan.ts` (new)
- `scripts/verify-phase80-record-portability.ps1` (new)

## Verification

Run `scripts/verify-phase80-record-portability.ps1`
