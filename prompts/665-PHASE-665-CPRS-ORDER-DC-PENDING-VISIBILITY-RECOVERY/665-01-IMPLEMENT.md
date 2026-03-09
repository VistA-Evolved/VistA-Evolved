# Phase 665 - CPRS Order Discontinue Pending Visibility Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- Recover clinician-visible workflow drift by checking existing prompt lineage before editing.

## Defect

- Live DFN 46 Orders verification showed that `POST /vista/cprs/orders/dc` can truthfully return `syncPending` when ORWDXA DC creates an unsigned discontinue request in VistA.
- The Orders panel currently shows only a transient pending banner in that branch.
- The newly created unsigned discontinue request is not surfaced until the clinician manually clicks `Refresh`, leaving the workspace temporarily misleading.

## Inventory

- Inspected files:
  - `apps/web/src/components/cprs/panels/OrdersPanel.tsx`
  - `apps/api/src/routes/cprs/wave2-routes.ts`
  - `apps/api/src/routes/cprs/orders-cpoe.ts`
  - `apps/web/src/stores/data-cache.tsx`
- Existing routes involved:
  - `POST /vista/cprs/orders/dc`
  - `GET /vista/cprs/orders`
- Existing UI involved:
  - Orders detail action pane
  - Orders active-list refresh behavior after discontinue

## Implementation Steps

1. Update the Orders discontinue `syncPending` branch so the panel refreshes live VistA orders immediately after the pending response.
2. Preserve the truthful pending banner that explains the original order may remain active until the unsigned discontinue order is signed.
3. Keep the active list/source behavior VistA-first and avoid fabricating a local-only discontinue state.

## Files Touched

- `prompts/665-PHASE-665-CPRS-ORDER-DC-PENDING-VISIBILITY-RECOVERY/665-01-IMPLEMENT.md`
- `prompts/665-PHASE-665-CPRS-ORDER-DC-PENDING-VISIBILITY-RECOVERY/665-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/OrdersPanel.tsx`
- `ops/summary.md`
- `ops/notion-update.json`
