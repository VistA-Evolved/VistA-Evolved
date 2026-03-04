# 496-01-IMPLEMENT — Retention + DSAR Workflows

## Objective

Create retention enforcement engine and DSAR (Data Subject Access Request)
workflow for pack-aware regulatory compliance.

## Files Changed

| File                                        | Change                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/api/src/services/retention-engine.ts` | NEW — retention validation against pack's retentionMinYears/retentionMaxYears |
| `apps/api/src/services/dsar-store.ts`       | NEW — in-memory DSAR request/fulfill/export store                             |
| `apps/api/src/routes/dsar-routes.ts`        | NEW — DSAR REST endpoints (create, list, fulfill, export)                     |
| `apps/api/src/server/register-routes.ts`    | Register dsarRoutes                                                           |

## Policy Decisions

1. Retention engine validates deletes: blocks if record is younger than retentionMinYears.
2. DSAR requests follow lifecycle: pending → processing → fulfilled → exported | denied.
3. DSAR store is in-memory (same pattern as imaging worklist Phase 23).
4. rightToErasure from pack gates whether erasure DSARs are accepted.
5. dataPortability from pack gates whether export DSARs are accepted.
