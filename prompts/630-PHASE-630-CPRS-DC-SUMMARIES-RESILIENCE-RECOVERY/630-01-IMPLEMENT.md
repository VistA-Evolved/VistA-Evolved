# Phase 630 - CPRS D/C Summaries Resilience Recovery

## User request

Continue the live CPRS chart audit until the clinician UI works truthfully end to end, using VistA-first behavior and checking prompt lineage whenever a panel appears broken, pending, or mislabeled.

## Problem observed live

During the live D/C Summaries audit for DFN=46:

- A direct live HTTP call to `GET /vista/dc-summaries?dfn=46` returned `ok:true` with zero results.
- The browser panel intermittently showed a pending banner with `Connection closed before response`.
- The banner named `ORQQCN DCSUM` as the target RPC even though the panel subtitle, the backend route, and the Phase 12 prompt all ground the panel to `TIU DOCUMENTS BY CONTEXT (CLASS 244)`.

This indicates two defects:

1. The D/C summary route is still on the fragile raw broker path instead of the resilient wrapper.
2. The frontend fallback metadata still points to an outdated RPC label.

## Inventory first

Files inspected:

- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/stores/data-cache.tsx`
- `apps/web/src/components/cprs/panels/DCSummPanel.tsx`
- `prompts/14-PHASE-12-CPRS-PARITY-WIRING/14-01-cprs-parity-wiring-IMPLEMENT.md`
- `prompts/610-PHASE-610-CPRS-PHASE12-PARITY-PANEL-TRUTHFULNESS-RECOVERY/610-01-IMPLEMENT.md`

Existing routes/endpoints involved:

- `GET /vista/dc-summaries?dfn=46`
- `GET /vista/tiu-text?id=...`

Existing UI involved:

- `DCSummPanel`
- data-cache `dcSummaries` domain

Exact files to change:

- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/stores/data-cache.tsx`

## Implementation steps

1. Replace the D/C summary list route raw broker calls with `safeCallRpc('TIU DOCUMENTS BY CONTEXT', ...)`.
2. Replace the shared TIU text route raw broker call with `safeCallRpc('TIU GET RECORD TEXT', ...)` so D/C summary detail reads are not transport-fragile.
3. Return explicit `request-failed` metadata from the D/C summary list route when runtime failures occur.
4. Update `dcSummaries` fallback targets in the web data cache from `ORQQCN DCSUM` to `TIU DOCUMENTS BY CONTEXT`.

## Verification steps

1. Confirm `/ready` is healthy.
2. Login and call `GET /vista/dc-summaries?dfn=46` against live VEHU.
3. Reload the D/C Summaries tab and verify it now truthfully shows the live empty state instead of an intermittent request-failed banner.
4. If summaries are present later, confirm `GET /vista/tiu-text?id=...` still returns real TIU text.
5. Run diagnostics on touched files.

## Files touched

- `apps/api/src/server/inline-routes.ts`
- `apps/web/src/stores/data-cache.tsx`
- `prompts/630-PHASE-630-CPRS-DC-SUMMARIES-RESILIENCE-RECOVERY/630-01-IMPLEMENT.md`
- `prompts/630-PHASE-630-CPRS-DC-SUMMARIES-RESILIENCE-RECOVERY/630-99-VERIFY.md`