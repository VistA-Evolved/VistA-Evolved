# Phase 456 — W30-P1: FHIR Import Pipeline

## Objective
Build a FHIR R4 Bundle import pipeline that ingests patient data from external
systems into VistA-Evolved. Supports Patient, Condition, MedicationRequest,
AllergyIntolerance resources.

## Deliverables

| # | File | Purpose |
|---|------|---------|
| 1 | `apps/api/src/migration/fhir-import.ts` | FHIR R4 bundle parser + importer |
| 2 | `apps/api/src/migration/types.ts` | Migration domain types |
| 3 | `apps/api/src/routes/migration-routes.ts` | REST endpoints for import operations |
| 4 | `docs/runbooks/fhir-import.md` | FHIR import operations guide |

## Acceptance Criteria
1. Parse FHIR R4 Bundle with Patient + Condition + MedicationRequest + AllergyIntolerance
2. Validate resources against required fields
3. Store import batches in-memory with status tracking
4. No PHI in logs
