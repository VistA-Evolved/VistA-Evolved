# Phase 396 -- W22-P8: Clinical Reasoning + Quality Measures -- IMPLEMENT

## User Request

Implement CQL library management, quality measure definitions (eCQM/HEDIS/UDS),
measure evaluation pipeline, PlanDefinition/ActivityDefinition resources, and
QRDA-compatible measure reporting for Wave 22 clinical reasoning.

## Implementation Steps

1. Created `apps/api/src/clinical-reasoning/types.ts`:
   - CqlLibrary (CQL source + ELM JSON, dependency tracking, value set refs)
   - QualityMeasure (eCQM/HEDIS/UDS/MIPS/custom, 4 scoring types, 8 population codes)
   - MeasureEvalResult (pending/running/completed/failed pipeline)
   - PatientMeasureResult (per-patient population membership)
   - PlanDefinition + PlanDefinitionAction (nested actions, CQL conditions)
   - ActivityDefinition (5 activity kinds, dynamic CQL values)
   - MeasureReport (QRDA I/III, 4 report types)
   - ClinicalReasoningDashboardStats
2. Created `apps/api/src/clinical-reasoning/reasoning-store.ts`:
   - 7 Maps: libraries, measures, eval results, patient results, plans, activities, reports
   - Simulated async measure evaluation (500ms, generates placeholder population counts)
   - Duplicate library name+version prevention
   - QRDA report generation from completed evaluations
   - Dashboard stats aggregation
3. Created `apps/api/src/clinical-reasoning/reasoning-routes.ts`:
   - 30 REST endpoints covering all CRUD + evaluation + reporting
4. Created `apps/api/src/clinical-reasoning/index.ts` -- barrel export
5. Wired into register-routes.ts, security.ts, store-policy.ts (7 entries)

## Files Touched

- apps/api/src/clinical-reasoning/types.ts (new)
- apps/api/src/clinical-reasoning/reasoning-store.ts (new)
- apps/api/src/clinical-reasoning/reasoning-routes.ts (new)
- apps/api/src/clinical-reasoning/index.ts (new)
- apps/api/src/server/register-routes.ts (modified)
- apps/api/src/middleware/security.ts (modified)
- apps/api/src/platform/store-policy.ts (modified)
