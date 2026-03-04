# Phase 456 — VERIFY

| #   | Gate    | Check                                                                           |
| --- | ------- | ------------------------------------------------------------------------------- |
| 1   | Types   | `migration/types.ts` exports MigrationBatch, ImportStatus                       |
| 2   | Parser  | `fhir-import.ts` handles Patient+Condition+MedicationRequest+AllergyIntolerance |
| 3   | Routes  | `migration-routes.ts` has POST /migration/fhir/import + GET /migration/batches  |
| 4   | Runbook | `docs/runbooks/fhir-import.md` exists                                           |
