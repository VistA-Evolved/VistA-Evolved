# Phase 393 — W22-P5: Lab Deep Workflows — IMPLEMENT

## User Request
Implement lab deep workflows: order → specimen collect → result → review →
critical alert → acknowledge pipeline. Bridge Wave 21 POCT device ingest.

## Implementation Steps
1. Create `apps/api/src/lab/types.ts` — LabOrder (9-state FSM), SpecimenSample
   (8-state), LabResult, CriticalAlert, LabDashboardStats, LabWritebackPosture.
2. Create `apps/api/src/lab/lab-store.ts` — 4 in-memory stores (orders,
   specimens, results, critical alerts). FSM validation for order/specimen
   transitions. Critical value auto-detection (10 analyte thresholds). Wave 21
   device observation linking on specimens. Dashboard stats (24h window).
   Writeback posture: ORWDX SAVE (available), ORWLRR ACK (available),
   LR VERIFY / LR PHLEBOTOMY / ORWLRR CHART (integration pending or available).
3. Create `apps/api/src/lab/lab-routes.ts` — 18 endpoints under `/lab/*`.
4. Create `apps/api/src/lab/index.ts` — barrel export as `labDeepRoutes`.
5. Wire into register-routes.ts, security.ts, store-policy.ts.
6. Type-check clean with `pnpm exec tsc --noEmit`.

## Files Touched
- apps/api/src/lab/types.ts (new)
- apps/api/src/lab/lab-store.ts (new)
- apps/api/src/lab/lab-routes.ts (new)
- apps/api/src/lab/index.ts (new)
- apps/api/src/server/register-routes.ts (modified — import + register)
- apps/api/src/middleware/security.ts (modified — AUTH_RULES for /lab/)
- apps/api/src/platform/store-policy.ts (modified — 4 lab store entries)
