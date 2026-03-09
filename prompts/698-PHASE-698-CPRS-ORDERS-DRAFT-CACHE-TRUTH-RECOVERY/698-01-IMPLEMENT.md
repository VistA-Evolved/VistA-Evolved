# Phase 698 - CPRS Orders Draft Cache Truth Recovery

The CPRS Orders panel now loads live VistA active orders from `/vista/cprs/orders`, but the lower draft-cache pane can still show an empty-state message that reads like there are no orders at all.

## Implementation Steps

1. Inspect the Orders panel split-pane rendering in `apps/web/src/components/cprs/panels/OrdersPanel.tsx`.
2. Reconfirm the panel contract that live VistA orders render above the draft/local cache section.
3. Change the empty-state copy so it explicitly refers to draft or local cache entries rather than implying that no orders exist.
4. When live VistA orders exist for the active type, make the draft-cache message point clinicians to the live list above.
5. Keep the edit minimal and do not change order placement, sign, verify, flag, or discontinue behavior.
6. Update the CPRS parity runbook with the Orders draft-cache truth contract.
7. Update ops artifacts after browser verification.

## Files Touched

- `apps/web/src/components/cprs/panels/OrdersPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`
