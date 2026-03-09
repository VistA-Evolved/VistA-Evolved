# Phase 637 - CPRS Medication Order Draft Truthfulness Recovery

## User Request

- Continue the live clinician audit until the CPRS UI is fully working and truthful.
- Use VistA first.
- If something is broken, pending, or misleading, recover it properly and validate it live.

## Defect

- Live clinician audit on `/cprs/chart/46/orders` reproduced a medication-order truthfulness bug.
- The medication composer showed `Order created: LISINOPRIL TAB` even when the backend returned a server-side draft/sync-pending response from `POST /vista/medications`.
- The local Orders pane then still showed `No med orders in local cache`, so the clinician got a false success message with no visible draft artifact.

## Inventory

- Inspected files:
  - `apps/web/src/components/cprs/panels/OrdersPanel.tsx`
  - `apps/api/src/server/inline-routes.ts`
- Existing routes involved:
  - `POST /vista/medications`
  - `GET /vista/cprs/orders`
- Existing UI involved:
  - Medication order composer in `OrdersPanel.tsx`

## Implementation Steps

1. Update the medication-order submit handler in `OrdersPanel.tsx` to distinguish:
   - live VistA order creation with `orderIEN`
   - draft/sync-pending response with `mode: draft` or `syncPending: true`
2. Cache sync-pending medication drafts in the local Orders store so the panel reflects the real outcome.
3. Replace the false `Order created` success text with truthful draft/pending messaging when ORWDXM AUTOACK does not return a live order.
4. Re-run the medication order workflow live and verify the local cache shows the draft entry.

## Files Touched

- `prompts/637-PHASE-637-CPRS-MED-ORDER-DRAFT-TRUTHFULNESS-RECOVERY/637-01-IMPLEMENT.md`
- `prompts/637-PHASE-637-CPRS-MED-ORDER-DRAFT-TRUTHFULNESS-RECOVERY/637-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/OrdersPanel.tsx`