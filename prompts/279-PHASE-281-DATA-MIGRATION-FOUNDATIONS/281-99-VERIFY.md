# Phase 281 — Data Migration Foundations (VERIFY)

## QA Gate
Run: `node scripts/qa-gates/data-migration-gate.mjs`

## Gates

### Structure Gates
1. `fhir-bundle-parser.ts` exists in `apps/api/src/migration/`
2. `ccda-parser.ts` exists in `apps/api/src/migration/`
3. `reconciliation.ts` exists in `apps/api/src/migration/`
4. `migration-orchestrator.ts` exists in `apps/api/src/migration/`

### FHIR Bundle Parser Gates
5. Exports `parseFhirBundle` function
6. Exports `extractPatientsFromBundle` function
7. Exports `listSupportedFhirResourceTypes` function
8. Handles Bundle.entry[].resource extraction
9. Returns typed `FhirImportResult` with entities + warnings

### CCD/CCDA Parser Gates
10. Exports `parseCcdaDocument` function
11. Extracts patient demographics section
12. Extracts problems/conditions section
13. Returns `CcdaImportResult` with sections + integration-pending markers

### Reconciliation Gates
14. Exports `reconcileImport` function
15. Generates matched/mismatched/missing/extra counts
16. Uses SHA-256 content hashing
17. Returns `ReconciliationReport` with evidence entries

### Orchestrator Gates
18. Exports `createMigrationPlan` function
19. Exports `executeMigrationPlan` function
20. Enforces dependency order (patients before problems/meds/allergies)
21. Supports dry-run mode

## Pass Criteria
All 21 gates PASS.
