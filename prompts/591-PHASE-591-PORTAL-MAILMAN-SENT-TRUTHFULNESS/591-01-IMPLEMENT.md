# Phase 591 -- IMPLEMENT: Portal MailMan Sent-History Truthfulness

## User Request

Continue closing real end-user workflow gaps so the full UI works from the
frontend, backend, VistA, database, and live user perspective. If something is
still pending or incomplete, check the original phase prompts and finish it
properly.

## Goal

Make portal secure messaging truthful and durable from the patient perspective:
a successful send must appear in Sent history immediately, and the UI must show
whether the message was delivered through VistA MailMan or stored in local mode.

## Implementation Steps

1. Inventory the original messaging intent from Phases 64, 70, and 130 and the
   current portal messaging + portal MailMan split.
2. Fix the portal message persistence path so sent-state updates are durable and
   visible immediately after send, including PG-backed flows.
3. Add a portal-side durable mirror for successful VistA MailMan sends so the
   patient Sent list remains complete even when the primary transport is VistA.
4. Update the portal Messages UI to show truthful source and sync posture per
   sent message, not just a page-level assumption.
5. Keep all message body PHI out of logs and audits; metadata only.
6. Verify against live API + VEHU/portal auth using the real patient portal
   flow: login, send, reload Sent, confirm visibility and truthful status.

## Files Inspected

- `prompts/69-PHASE-64-SECURE-MESSAGING-V1/69-01-IMPLEMENT.md`
- `prompts/70-PHASE-70-MAILMAN-RPC-BRIDGE/70-01-IMPLEMENT.md`
- `prompts/134-PHASE-130-MAILMAN-BRIDGE/130-01-IMPLEMENT.md`
- `apps/portal/src/app/dashboard/messages/page.tsx`
- `apps/portal/src/lib/api.ts`
- `apps/api/src/routes/portal-mailman.ts`
- `apps/api/src/routes/portal-core.ts`
- `apps/api/src/services/portal-messaging.ts`
- `apps/api/src/services/secure-messaging.ts`

## Files Touched

- `prompts/591-PHASE-591-PORTAL-MAILMAN-SENT-TRUTHFULNESS/591-01-IMPLEMENT.md`
- `prompts/591-PHASE-591-PORTAL-MAILMAN-SENT-TRUTHFULNESS/591-99-VERIFY.md`
- `apps/api/src/routes/portal-mailman.ts`
- `apps/api/src/services/portal-messaging.ts`
- `apps/portal/src/app/dashboard/messages/page.tsx`
- `docs/runbooks/portal-messaging.md`
- `ops/summary.md`
- `ops/notion-update.json`

## Verification Steps

- `pnpm -C apps/api exec tsc --noEmit`
- `pnpm -C apps/portal exec tsc --noEmit`
- Portal login via `/portal/auth/login` succeeds for demo patient
- `POST /portal/mailman/send` returns truthful source + sync status
- `GET /portal/messages/sent` immediately includes the just-sent message
- If VistA MailMan is active, sent item shows synced posture; if not, it shows
  local mode without fake delivery claims
