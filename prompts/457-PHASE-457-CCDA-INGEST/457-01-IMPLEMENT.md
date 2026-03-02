# Phase 457 — C-CDA Ingest (W30-P2)

## Goal
Parse Consolidated CDA (C-CDA) XML documents into the migration pipeline,
extracting Patient, Problems, Medications, and Allergies sections.

## Deliverables
1. `apps/api/src/migration/ccda-ingest.ts` — C-CDA XML parser + section extractor
2. Update `apps/api/src/routes/migration-routes.ts` — POST /migration/ccda/import endpoint
3. `docs/runbooks/ccda-ingest.md` — operations guide

## Design
- Accept raw XML text in POST body (Content-Type: application/xml or text/xml)
- Parse using regex/string extraction (no heavy XML library — keep deps minimal)
- Extract sections by templateId OID
- Map to FhirMigrationBatch for unified tracking
- Section OIDs: Problems 2.16.840.1.113883.10.20.22.2.5.1, Medications 2.16.840.1.113883.10.20.22.2.1.1,
  Allergies 2.16.840.1.113883.10.20.22.2.6.1

## Verification
- POST a minimal C-CDA document and verify batch created
- GET /migration/batches shows ccda format entry
