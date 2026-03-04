# Phase 281 — Data Migration Foundations (IMPLEMENT)

## Goal

Build the import-side migration infrastructure so data can flow INTO VistA-Evolved
from FHIR R4 Bundles, CCD/CCDA documents, and CSV extracts — completing the
migration toolkit started in Phase 50 which only had export + CSV import stubs.

## Context

- Phase 50 created `apps/api/src/migration/` with types, templates, mapping
  engine, import/export pipelines, store, and routes (16 endpoints).
- All FHIR code is VistA→FHIR (read/export). No FHIR→domain import exists.
- CCD/CCDA parsing is completely absent.
- Migration stores are in-memory only.
- No reconciliation/evidence tooling exists.

## Deliverables

### 1. FHIR Bundle Import Parser (`fhir-bundle-parser.ts`)

- Parse FHIR R4 JSON Bundle (`Bundle.entry[].resource`)
- Extract: Patient, AllergyIntolerance, Condition, Observation, MedicationRequest,
  Encounter, Appointment, DocumentReference
- Map to internal domain types from `migration/types.ts`
- Validation: reject bundles with missing resourceType, flag unsupported types
- Test mode: dry-run returns parsed entities without writing

### 2. CCD/CCDA Parser Stub (`ccda-parser.ts`)

- Accept XML string input (CDA R2 format)
- Regex-based section extraction (no heavy XML library)
- Sections: patient demographics, problems, medications, allergies, vitals
- Returns structured `ImportRecord[]` compatible with existing pipeline
- Integration-pending markers for sections not yet mapped

### 3. Migration Reconciliation Engine (`reconciliation.ts`)

- Compare source records to imported records
- Generate evidence report: matched, mismatched, missing, extra
- SHA-256 content hashing for integrity verification
- Export reconciliation report as JSON

### 4. Migration Orchestrator (`migration-orchestrator.ts`)

- Dependency-ordered import: patients → problems → meds → allergies → appointments
- Batch processing with configurable chunk size
- Dry-run mode for full pipeline
- Progress tracking per entity type

## Files Touched

- `apps/api/src/migration/fhir-bundle-parser.ts` (NEW)
- `apps/api/src/migration/ccda-parser.ts` (NEW)
- `apps/api/src/migration/reconciliation.ts` (NEW)
- `apps/api/src/migration/migration-orchestrator.ts` (NEW)
- `scripts/qa-gates/data-migration-gate.mjs` (NEW)
- `prompts/279-PHASE-281-DATA-MIGRATION-FOUNDATIONS/281-01-IMPLEMENT.md` (this file)
- `prompts/279-PHASE-281-DATA-MIGRATION-FOUNDATIONS/281-99-VERIFY.md`
