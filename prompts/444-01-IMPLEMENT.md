# Phase 444 — IMPLEMENT: Regulatory Reporting Endpoints (W28 P6)

## Goal
REST endpoints for the entire regulatory module: classification, frameworks,
attestations, country-config, export pipeline, country validation, and posture.

## Files Created
- `apps/api/src/routes/regulatory-routes.ts` — ~25 endpoints under /regulatory/*

## Files Modified
- `apps/api/src/server/register-routes.ts` — Imported + registered regulatoryRoutes
- `apps/api/src/middleware/security.ts` — Added AUTH_RULE for /regulatory/ (admin)

## Endpoints
- GET /regulatory/frameworks — List all frameworks
- GET /regulatory/frameworks/:id — Get framework by ID
- GET /regulatory/frameworks/country/:cc — Resolve frameworks for country
- POST /regulatory/classify — Runtime classification
- GET /regulatory/attestations — List attestations
- GET /regulatory/attestations/:id — Get by ID
- POST /regulatory/attestations — Create attestation
- POST /regulatory/attestations/:id/revoke — Revoke
- GET /regulatory/attestations/summary — Coverage summary
- GET /regulatory/attestations/verify — Chain verification
- POST /regulatory/attestations/check-expired — Run expiry check
- GET /regulatory/country-config — List assignments
- GET /regulatory/country-config/:tenantId — Get tenant config
- POST /regulatory/country-config — Assign country
- GET /regulatory/country-config/audit — Audit trail
- GET /regulatory/country-config/audit/verify — Chain verification
- POST /regulatory/export — Create export package
- GET /regulatory/export — List packages
- GET /regulatory/export/:id — Get package
- GET /regulatory/export/audit — Export audit trail
- GET /regulatory/export/audit/verify — Chain verification
- GET /regulatory/validators — List validators
- POST /regulatory/validate — Validate data
- GET /regulatory/posture — Compliance posture summary
