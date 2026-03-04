# Phase 313 — IMPLEMENT: Terminology Strategy

> Wave 13-P5

## Objective

Build the pluggable terminology resolver registry with built-in resolvers
for ICD-10-CM, ICD-10-WHO, CPT, LOINC, NDC, and passthrough.

## Deliverables

### 1. Terminology Registry

- **File:** `apps/api/src/services/terminology-registry.ts`
- `TerminologyResolver` interface with resolve/validate/search
- 6 built-in resolvers: ICD-10-CM, ICD-10-WHO, CPT, LOINC, NDC, Passthrough
- `resolveCode()` with automatic fallback to passthrough
- Per-country defaults: US, PH, GH terminology mappings

### 2. Terminology Routes

- **File:** `apps/api/src/routes/terminology-routes.ts`
- `GET /terminology/resolvers` — list registered resolvers
- `GET /terminology/defaults/:country` — country terminology defaults
- `POST /terminology/resolve` — resolve VistA code
- `POST /terminology/validate` — validate code against system
