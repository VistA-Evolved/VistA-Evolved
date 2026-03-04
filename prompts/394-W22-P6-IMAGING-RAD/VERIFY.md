# Phase 394 -- W22-P6: Imaging/Radiology Deep Workflows -- VERIFY

## Verification Steps

1. `pnpm exec tsc --noEmit` -- zero errors.
2. 4 new files under `apps/api/src/radiology/`.
3. 28 REST endpoints under `/radiology/*`.
4. register-routes.ts imports and registers `radiologyDeepRoutes`.
5. security.ts has `/radiology/critical-alerts/:id/resolve` admin rule.
6. store-policy.ts has 6 radiology domain entries.
7. DRL thresholds cover 7 procedure/modality pairs.
8. Wave 21 bridging: MWL + MPPS linking on rad orders.
9. Writeback posture: ORWDX SAVE + TIU CREATE/SIGN available.
10. Report lifecycle: draft -> preliminary -> final -> addendum -> amended.
