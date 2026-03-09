# Phase 697 - CPRS Labs Selection Truth Recovery

The live clinician audit continues from the CPRS chart shell.
The Labs Results tab already reads from live `/vista/labs` data, but the panel keeps local UI selection state across refreshes.
That makes the panel vulnerable to showing or acting on a stale result after a newer live fetch returns an empty or different result set.

## Implementation Steps

1. Inspect the Labs panel selection and acknowledgement state handling in `apps/web/src/components/cprs/panels/LabsPanel.tsx`.
2. Reconfirm the live lab read contract in `apps/web/src/stores/data-cache.tsx` so the fix follows the actual `/vista/labs` payload shape.
3. Reconcile the selected result against the latest live result set after every refresh.
4. Reconcile the selected acknowledgement ids against the latest live result set after every refresh.
5. Ensure the panel clears stale client-side selection when VEHU returns `0 live result(s)` for patients such as DFN 46.
6. Keep the fix minimal and do not change the existing live read contract or acknowledgement route contract.
7. Update the CPRS parity runbook with a Labs selection truth contract.
8. Update ops artifacts after live verification.

## Files Touched

- `apps/web/src/components/cprs/panels/LabsPanel.tsx`
- `docs/runbooks/cprs-parity-closure-phase14.md`
- `ops/summary.md`
- `ops/notion-update.json`
