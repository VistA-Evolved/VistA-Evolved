# 403-01-IMPLEMENT — Document Exchange

## Phase 403 (W23-P5)

### Goal
Implement a FHIR-first Document Exchange layer with DocumentReference registry,
repository, submission sets, and search — aligned with IHE MHD profile.

### Source Files
- `apps/api/src/document-exchange/types.ts` — DocumentReference, DocumentSubmissionSet
- `apps/api/src/document-exchange/exchange-store.ts` — CRUD + search + dashboard
- `apps/api/src/document-exchange/exchange-routes.ts` — REST endpoints
- `apps/api/src/document-exchange/index.ts` — Barrel export

### Endpoints
- GET/POST/PUT /document-exchange/documents[/:id]
- GET /document-exchange/documents/search?q=
- GET/POST /document-exchange/submissions[/:id]
- GET /document-exchange/dashboard
