# Phase 591 -- VERIFY: Portal MailMan Sent-History Truthfulness

## Verification Steps

1. Confirm prompt pack exists and follows ordering rules.
2. Run TypeScript verification:
   - `pnpm -C apps/api exec tsc --noEmit`
   - `pnpm -C apps/portal exec tsc --noEmit`
3. Start or confirm live API health:
   - `curl.exe -s http://127.0.0.1:3001/health`
4. Portal live flow:
   - Login with demo portal credentials
   - Send a message through `/portal/mailman/send`
   - Fetch `/portal/messages/sent`
   - Confirm the new message is present immediately
5. Check returned posture:
   - `source: vista` only when MailMan send actually succeeds
   - `source: local` when MailMan path is unavailable or not configured
   - `vistaSync` status matches what the system really knows
6. Confirm no fake-success UI copy remains on the portal Messages page.

## Acceptance Criteria

- A portal message that the user just sent appears in Sent history without a
  manual retry or delayed refresh.
- VistA MailMan sends are mirrored durably into portal Sent history.
- Local-mode fallback sends are also visible immediately in Sent history.
- The portal UI labels each sent message truthfully as VistA-backed or local.
- No message body PHI is added to logs or audit entries.
- The touched files compile cleanly and the live portal flow succeeds.
