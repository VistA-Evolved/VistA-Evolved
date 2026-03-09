# Phase 718 — VERIFY: CPRS MailMan Session Redirect Recovery

## Verification Steps

1. Open `/cprs/messages` in a fresh unauthenticated browser page.
2. Confirm the page redirects to `/cprs/login?redirect=%2Fcprs%2Fmessages`
   before protected MailMan API requests run.
3. Authenticate with `PRO1234 / PRO1234!!` and confirm the browser lands back
   on `/cprs/messages`.
4. Confirm the authenticated page renders live VistA MailMan baskets and inbox
   rows without the inline `Authentication required` posture.
5. Run editor diagnostics on the touched page.

## Acceptance Criteria

- Unauthenticated `/cprs/messages` follows the normal CPRS login redirect flow.
- Protected MailMan fetches do not run before session readiness.
- 401 MailMan responses are treated as session-expired state, not as a fake
  empty inbox.
- Touched files report no relevant diagnostics.