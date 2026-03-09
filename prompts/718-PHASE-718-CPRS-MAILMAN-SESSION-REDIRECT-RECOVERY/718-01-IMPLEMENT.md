# Phase 718 — IMPLEMENT: CPRS MailMan Session Redirect Recovery

## User Request

Continue the live CPRS audit and fix real user-facing defects so clinician
flows are truthful, VistA-first, and production-usable.

## Implementation Steps

1. Reproduce the unauthenticated `/cprs/messages` behavior in the browser.
2. Compare the MailMan page against the established CPRS session-gated pattern
   used by other protected surfaces.
3. Add session gating so unauthenticated access redirects to
   `/cprs/login?redirect=%2Fcprs%2Fmessages` instead of firing protected API
   requests and rendering misleading inline auth errors.
4. Suppress MailMan fetches until the CPRS session is ready and authenticated.
5. Treat 401s from MailMan requests as session-expired signals so stale auth
   does not settle into a fake empty-state posture.
6. Re-run diagnostics and re-verify in the browser.

## Files Touched

- `apps/web/src/app/cprs/messages/page.tsx`
- `docs/runbooks/phase70-mailman-bridge.md`
- `ops/summary.md`
- `ops/notion-update.json`