# 402-01-IMPLEMENT — Provider Directory

## Phase 402 (W23-P4)

### Goal

Implement a FHIR-aligned Provider Directory with Practitioner, Organization, and Location
resources. Supports NPI lookup, specialty filtering, and organization hierarchy.

### Source Files

- `apps/api/src/provider-directory/types.ts` — DirectoryPractitioner, DirectoryOrganization, DirectoryLocation
- `apps/api/src/provider-directory/directory-store.ts` — CRUD + search + dashboard
- `apps/api/src/provider-directory/directory-routes.ts` — REST endpoints
- `apps/api/src/provider-directory/index.ts` — Barrel export

### Endpoints

- GET/POST/PUT /provider-directory/practitioners[/:id]
- GET /provider-directory/practitioners/search?q=
- GET/POST/PUT /provider-directory/organizations[/:id]
- GET/POST/PUT /provider-directory/locations[/:id]
- GET /provider-directory/dashboard
