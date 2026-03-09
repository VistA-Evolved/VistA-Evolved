# Phase 717 — IMPLEMENT: CPRS MailMan Mount Race Recovery

## User Request

Continue the live clinician-facing CPRS audit and fix real browser defects so
the built product is truthful, VistA-first, and production-usable.

## Implementation Steps

1. Reproduce the live clinician defect on `/cprs/messages` from the File menu.
2. Inventory the CPRS MailMan page, the clinician MailMan routes, and the
   shared secure-messaging service path.
3. Remove any duplicate broker lifecycle handling in the route layer when the
   service already uses `safeCallRpc` or `safeCallRpcWithList` with broker
   locking.
4. Preserve the existing route contracts, audit behavior, and VistA-first
   semantics.
5. Re-run diagnostics on touched files.
6. Re-verify in the browser that `/cprs/messages` loads live VistA MailMan
   content without the false `Connection closed before response` posture.

## Files Touched

- `apps/api/src/routes/vista-mailman.ts`
- `apps/api/src/routes/messaging/index.ts`
- `docs/runbooks/phase70-mailman-bridge.md`
- `ops/summary.md`
- `ops/notion-update.json`