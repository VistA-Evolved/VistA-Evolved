# Phase 620 - IMPLEMENT: CPRS Consults + Nursing Truthfulness Recovery

## Implementation Steps

1. Inventory the live user-visible failures on the CPRS Consults and Nursing tabs before editing any code.
2. Verify Docker, API health, and VEHU connectivity before touching the read routes.
3. Replace the legacy inline Consults read path with the session-bound resilient RPC path so `/vista/consults` and `/vista/consults/detail` stop bypassing the pooled RPC context.
4. Preserve truthful response posture for Consults by returning explicit `request-failed` metadata when the live RPC read fails at runtime.
5. Correct the Nursing vitals runtime failure posture so a live-capable RPC failure is not mislabeled as generic `integration-pending`.
6. Update the Nursing vitals UI branch so request failures render as request failures while true pending capability gaps still render pending banners.
7. Re-run live VEHU checks for consults and nursing vitals after the code changes.
8. Re-check the affected CPRS browser tabs to confirm the user-visible posture matches live backend truth.

## Files Touched

- apps/api/src/server/inline-routes.ts
- apps/api/src/routes/nursing/index.ts
- apps/web/src/components/cprs/panels/NursingPanel.tsx
