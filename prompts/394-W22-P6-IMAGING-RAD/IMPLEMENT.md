# Phase 394 -- W22-P6: Imaging/Radiology Deep Workflows -- IMPLEMENT

## User Request

Implement deep radiology workflows: order management with protocol assignment,
radiologist reading worklist, report lifecycle (draft->prelim->final->addendum),
radiation dose registry with DRL comparison, critical finding alerting per ACR
guidelines, and peer review / RADPEER quality scoring.

## Implementation Steps

1. Create `apps/api/src/radiology/types.ts` -- RadOrder (9-state FSM),
   ReadingWorklistItem (5-state), RadReport (6-state), DoseRegistryEntry,
   RadCriticalAlert (4-state), PeerReview (4-point RADPEER scoring),
   RadDashboardStats, RadWritebackPosture.
2. Create `apps/api/src/radiology/radiology-store.ts` -- 6 in-memory stores
   with FSM validation, DRL threshold evaluation (7 procedure/modality pairs),
   accession number generation, Wave 21 MWL/MPPS bridging, cumulative dose
   tracking, ACR critical finding communication deadlines.
3. Create `apps/api/src/radiology/radiology-routes.ts` -- 28 endpoints.
4. Create `apps/api/src/radiology/index.ts` -- barrel as radiologyDeepRoutes.
5. Wire into register-routes.ts, security.ts, store-policy.ts.
6. Type-check clean.

## Files Touched

- apps/api/src/radiology/types.ts (new)
- apps/api/src/radiology/radiology-store.ts (new)
- apps/api/src/radiology/radiology-routes.ts (new)
- apps/api/src/radiology/index.ts (new)
- apps/api/src/server/register-routes.ts (modified)
- apps/api/src/middleware/security.ts (modified)
- apps/api/src/platform/store-policy.ts (modified)
