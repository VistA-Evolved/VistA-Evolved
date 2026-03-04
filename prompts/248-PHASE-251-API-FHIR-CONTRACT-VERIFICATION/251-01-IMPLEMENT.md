# Phase 251 -- API + FHIR Contract Verification (Wave 7 P4)

## Objective

Create a machine-readable API route contract registry and contract verification
tests that validate API shape stability and FHIR R4 conformance without a live
server.

## Implementation Steps

### 1. Route Contract Registry (`apps/api/src/api-contracts/route-contracts.ts`)

- `RouteContract` interface: method, path, auth, domain, successKeys, successStatus, unauthStatus, sincePhase, description
- 26+ contracts across 5 domains: infra, auth, clinical, fhir, admin
- Helper functions: getContractsByDomain, getPublicContracts, getSessionContracts, getFhirContracts

### 2. API Contract Verification Test (`apps/api/tests/api-contract-verification.test.ts`)

- Registry completeness: >= 25 contracts, unique method+path, valid auth levels
- Domain coverage: all 5 expected domains represented
- Public endpoints: >= 5 public, all return 200 when unauth
- Session endpoints: >= 7 session, all return 401 when unauth, all have ok key
- FHIR contracts: >= 9 FHIR, includes metadata + SMART + 7 resource types
- Auth flow: login, session, logout endpoints present
- Cross-cutting: no auth level collisions, correct prefixes

### 3. FHIR Conformance Test (`apps/api/tests/fhir-contract-verification.test.ts`)

- CapabilityStatement: valid R4 structure, all 7 resource types, read+search interactions
- SMART Configuration: authorization/token endpoints, capabilities, scopes
- US Core profiles: each resource references US Core
- Search parameter coverage: required params per US Core

## Files Touched

- `apps/api/src/api-contracts/route-contracts.ts` -- NEW
- `apps/api/src/api-contracts/index.ts` -- NEW
- `apps/api/tests/api-contract-verification.test.ts` -- NEW
- `apps/api/tests/fhir-contract-verification.test.ts` -- NEW
- `scripts/verify-phase251-api-fhir-contracts.ps1` -- NEW

## Depends On

- Phase 250 (P3) -- VistA RPC Contract Harness
- Existing: `apps/api/src/fhir/` (10 files), 8 existing FHIR tests

## Verification

Run `scripts/verify-phase251-api-fhir-contracts.ps1` -- 18 gates, all must PASS.
