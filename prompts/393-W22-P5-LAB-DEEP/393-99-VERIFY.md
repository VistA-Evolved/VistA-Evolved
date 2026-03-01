# Phase 393 — W22-P5: Lab Deep Workflows — VERIFY

## Verification Steps
1. `pnpm exec tsc --noEmit` — zero errors.
2. 4 new files under `apps/api/src/lab/`.
3. `lab-store.ts` exports: createLabOrder, getLabOrder, listLabOrders,
   transitionLabOrder, createSpecimen, getSpecimen, listSpecimens,
   transitionSpecimen, linkDeviceObservation, createLabResult, getLabResult,
   listLabResults, updateResultStatus, getCriticalAlert, listCriticalAlerts,
   acknowledgeCriticalAlert, resolveCriticalAlert, getLabDashboardStats,
   getLabWritebackPosture, _resetLabStores.
4. `lab-routes.ts` registers 18 endpoints under `/lab/*`.
5. register-routes.ts imports and registers `labDeepRoutes`.
6. security.ts has `/lab/critical-alerts/:id/resolve` admin + `/lab/` session rules.
7. store-policy.ts has 4 lab domain entries (lab-orders, lab-specimens,
   lab-results, lab-critical-alerts).
8. Critical value thresholds cover 10 analytes.
9. Specimen → device observation bridging via `linkDeviceObservation`.
10. Writeback posture shows ORWDX SAVE + ORWLRR ACK as available.
