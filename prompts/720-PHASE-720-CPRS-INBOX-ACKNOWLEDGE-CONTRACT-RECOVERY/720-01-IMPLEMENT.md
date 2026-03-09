# Phase 720 - CPRS Inbox Acknowledge Contract Recovery

## Goal

Recover the clinician-visible inbox acknowledge workflow so clicking `Acknowledge`
no longer triggers a missing backend route and page-level `Not Found` error.
The action must honor the existing Phase 124 contract: API-backed when possible,
and explicit integration-pending posture when VistA persistence is unavailable.

## Implementation Steps

1. Inventory the current `/cprs/inbox` acknowledge action and the existing
   `/vista/inbox` backend route implementation before editing.
2. Confirm the missing backend contract by verifying that `/vista/inbox/acknowledge`
   is not implemented and that the UI already expects `integrationPending` or
   `pending` responses.
3. Add `POST /vista/inbox/acknowledge` to the inbox route module with a truthful
   response contract for the current VEHU sandbox.
4. Return structured `integration-pending` metadata explaining that VistA
   acknowledgement persistence requires `ORWORB KILL EXPIR MSG`, which is not
   available in the current sandbox lane.
5. Preserve the item in the clinician UI and allow the existing yellow pending
   banner to surface instead of a fatal page error.
6. Update the Phase 13 operational runbook so the inbox acknowledge contract is
   documented as server-backed integration-pending rather than an absent route.
7. Update ops artifacts with the live defect, fix, and verification evidence.

## Files Touched

- apps/api/src/routes/inbox.ts
- docs/runbooks/vista-rpc-phase13-operationalization.md
- ops/summary.md
- ops/notion-update.json
