# Phase 411 — W24-P3: Customer Integration Intake Model — IMPLEMENT

## Objective

Build a structured intake pipeline that captures partner info, generates
integration config artifacts, and tracks status through submission → review →
approved → provisioning → active lifecycle.

## Deliverables

1. `apps/api/src/pilots/intake/types.ts` — domain types
2. `apps/api/src/pilots/intake/intake-store.ts` — in-memory CRUD store
3. `apps/api/src/pilots/intake/config-generator.ts` — config artifact generator
4. `apps/api/src/pilots/intake/intake-routes.ts` — 8 Fastify endpoints
5. `apps/api/src/pilots/intake/index.ts` — barrel export
6. Route wiring in `register-routes.ts` + AUTH_RULES in `security.ts`

## Partner Types Supported

- HL7 (ADT/ORM/ORU/SIU/MDM message types)
- X12 (837P/837I/835/270/271/276/277/999 transactions)
- Device (DICOM modalities)
- HIE (FHIR bundles via IHE profiles)
- FHIR (R4 native)

## Endpoints

| Method | Path                                | Purpose                  |
| ------ | ----------------------------------- | ------------------------ |
| GET    | /pilots/intakes                     | List all intakes         |
| GET    | /pilots/intakes/:id                 | Get single intake        |
| POST   | /pilots/intakes                     | Create new intake        |
| PUT    | /pilots/intakes/:id                 | Update intake            |
| POST   | /pilots/intakes/:id/transition      | Lifecycle transition     |
| POST   | /pilots/intakes/:id/generate-config | Generate config artifact |
| GET    | /pilots/intakes/:id/config          | Retrieve stored config   |
| GET    | /pilots/intake/dashboard            | Dashboard stats          |

## Auth

All `/pilots/*` routes require `admin` auth level.
