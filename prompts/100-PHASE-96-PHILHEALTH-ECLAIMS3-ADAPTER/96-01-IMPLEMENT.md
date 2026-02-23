# Phase 96 — PhilHealth eClaims 3.0 Adapter Skeleton (IMPLEMENT)

## User Request

Build an eClaims 3.0 adapter skeleton that can assemble claim packets from
VistA-facing data, generate standards-compliant payloads when spec is available,
and support "print-ready + upload-ready" operational flow immediately.

PhilHealth eClaims 2.x disabled March 31, 2026. eClaims 3.0 required April 1, 2026.

## Implementation Steps

### A) Payer Registry Evidence
- Add eClaims 3.0 evidence + version notes to PH-PHIC in payer registry
- Contracting tasks for spec acquisition gates

### B) ClaimPacket Builder
- `apps/api/src/rcm/philhealth-eclaims3/types.ts` — ClaimPacket, SubmissionStatus, ExportFormat types
- `apps/api/src/rcm/philhealth-eclaims3/packet-builder.ts` — Assemble from PhilHealthClaimDraft → ClaimPacket
- `apps/api/src/rcm/philhealth-eclaims3/export-generators.ts` — PDF summary, JSON canonical
- `apps/api/src/rcm/philhealth-eclaims3/xml-generator.ts` — Placeholder XML with strict interface

### C) Spec Acquisition Gates
- `docs/runbooks/philhealth-eclaims3-spec-status.md` — structured status tracker
- Registry tasks in payer admin for PH-PHIC

### D) Submission Tracker
- `apps/api/src/rcm/philhealth-eclaims3/submission-tracker.ts` — Honest status FSM
- Status: Draft / Exported / Submitted(manual) / Accepted / Denied

### E) API Routes
- `apps/api/src/rcm/philhealth-eclaims3/eclaims3-routes.ts` — Fastify plugin

### F) Operational UI
- `apps/web/src/app/cprs/admin/philhealth-eclaims3/page.tsx`
- Encounter selection → build packet → export bundle
- Submission status board + denial capture

### G) Wiring
- Register in `apps/api/src/index.ts`
- Add nav entry in `apps/web/src/app/cprs/admin/layout.tsx`

## Verification Steps
- `npx tsc --noEmit` in both apps/api and apps/web
- Route wiring check
- Security: no hardcoded credentials, no fake submission success
- Status FSM: cannot reach "Accepted"/"Denied" without manual intervention

## Files Touched
- `apps/api/src/rcm/philhealth-eclaims3/types.ts` (new)
- `apps/api/src/rcm/philhealth-eclaims3/packet-builder.ts` (new)
- `apps/api/src/rcm/philhealth-eclaims3/export-generators.ts` (new)
- `apps/api/src/rcm/philhealth-eclaims3/xml-generator.ts` (new)
- `apps/api/src/rcm/philhealth-eclaims3/submission-tracker.ts` (new)
- `apps/api/src/rcm/philhealth-eclaims3/eclaims3-routes.ts` (new)
- `apps/web/src/app/cprs/admin/philhealth-eclaims3/page.tsx` (new)
- `docs/runbooks/philhealth-eclaims3-spec-status.md` (new)
- `apps/api/src/index.ts` (modified — import + register)
- `apps/web/src/app/cprs/admin/layout.tsx` (modified — nav entry)
