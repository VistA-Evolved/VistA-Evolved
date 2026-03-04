# 488-99 VERIFY -- W33-P8: UI Hardening

## Gates

1. `npx tsc --noEmit` -- clean compile (apps/web)
2. `ActionStatus` type includes `"unsupported-in-sandbox"`
3. `StatusBadge` in ActionInspector and RpcDebugPanel renders new status
4. Inpatient modal shows "Unsupported in Sandbox" for new status
5. eMAR admin+scan result handles both statuses
6. OrdersPanel sign flow handles new status
7. NursingPanel flowsheet message handles new status
8. Integration-pending budget gate passes
