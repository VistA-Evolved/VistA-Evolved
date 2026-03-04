# 405-01-IMPLEMENT — Consent + Purpose of Use

## Phase 405 (W23-P7)

### Goal

Implement consent directive management, purpose-of-use (POU) enforcement engine,
and disclosure accounting — covering HIPAA, GDPR, and TEFCA consent requirements.

### Source Files

- `apps/api/src/consent-pou/types.ts` — ConsentDirective, DisclosureLog, PurposeOfUse
- `apps/api/src/consent-pou/consent-store.ts` — CRUD + POU enforcement + disclosure log
- `apps/api/src/consent-pou/consent-routes.ts` — REST endpoints
- `apps/api/src/consent-pou/index.ts` — Barrel export

### Endpoints

- GET/POST/PUT /consent-pou/directives[/:id]
- POST /consent-pou/directives/:id/revoke
- POST /consent-pou/evaluate (POU enforcement + auto disclosure log)
- GET /consent-pou/disclosures
- GET /consent-pou/dashboard
