# Phase 631 — CPRS Labs Route Resilience Recovery

## User Request

- Continue autonomously until the CPRS UI behaves like a production clinical system.
- Keep the implementation VistA-first, inspect prompt lineage before editing, and avoid fake completion states.
- Recover any clinician-facing panel that still shows a clean empty state when the live VistA route is actually transport-failing.

## Scope

- Restore truthful and resilient behavior for the Phase 12 Labs read route.
- Ensure the Labs panel only shows an empty state when `GET /vista/labs?dfn=46` returns `ok:true` from live VistA.
- Reuse the same resilient read pattern already applied to Surgery and D/C Summaries.

## Prompt Lineage

- Phase 12D — Labs read parity
- Phase 595 — Lab acknowledgement truthfulness
- Phase 610 — CPRS Phase 12 parity panel truthfulness recovery
- Phase 614 — CPRS Labs deep workflow recovery

## Inventory

- Inspected route: `apps/api/src/server/inline-routes.ts` (`GET /vista/labs`)
- Inspected client cache: `apps/web/src/stores/data-cache.tsx` (`fetchLabs`)
- Inspected panel contract: `apps/web/src/components/cprs/panels/LabsPanel.tsx`
- Inspected prompt lineage: `prompts/614-PHASE-614-CPRS-LABS-DEEP-WORKFLOW-RECOVERY/614-01-IMPLEMENT.md`

## Implementation Steps

1. Confirm the live VEHU failure mode for `GET /vista/labs?dfn=46` under an authenticated clinician session.
2. Replace the raw broker call inside `GET /vista/labs` with `safeCallRpc('ORWLRR INTERIM', ...)`.
3. Preserve the existing result parsing and raw text fallback for successful responses.
4. Return explicit `request-failed` metadata and pending targets when the live RPC call fails so the web layer can surface truthful posture.
5. Restart the API and re-verify both the live route and the CPRS Labs panel.

## Files To Change

- `apps/api/src/server/inline-routes.ts`
- `prompts/631-PHASE-631-CPRS-LABS-ROUTE-RESILIENCE-RECOVERY/631-01-IMPLEMENT.md`
- `prompts/631-PHASE-631-CPRS-LABS-ROUTE-RESILIENCE-RECOVERY/631-99-VERIFY.md`

## Verification Notes

- Verify Docker/runtime health before and after the edit.
- Login with `PRO1234 / PRO1234!!` and call `GET /vista/labs?dfn=46`.
- Confirm the route returns `ok:true` with truthful data or `count:0` instead of transport failure.
- Reload the CPRS Labs tab and confirm the visible state matches the live route posture.