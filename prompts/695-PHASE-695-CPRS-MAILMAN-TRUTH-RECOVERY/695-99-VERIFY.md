# Phase 695 - CPRS MailMan Truth Recovery Verify

## Verification Steps
1. Start with VEHU and platform DB running and confirm the API is reachable.
2. Authenticate in the clinician shell with PRO1234 / PRO1234!!.
3. Open /cprs/messages and verify the page identifies itself as VistA MailMan rather than local fallback.
4. Confirm inbox loading uses real MailMan baskets and message detail opens from VistA data.
5. Compose a clinician message and verify the success state reflects VistA send acceptance instead of local-cache success wording.
6. Open the File menu and confirm there is a direct Messages / MailMan navigation path.
7. Open /cprs/chart/46/tasks and confirm the Messages subtab is explicitly described as the portal staff queue rather than MailMan.
8. Run a TypeScript compile for apps/web and confirm no new diagnostics are introduced.

## Acceptance Criteria
- The CPRS clinician Messages page no longer shows local fallback or local-only messaging posture.
- The clinician compose flow uses direct VistA MailMan send semantics.
- The CPRS menu exposes the MailMan screen directly.
- The chart Tasks panel truthfully distinguishes the staff queue from MailMan.
- The web app compiles cleanly after the changes.

## Evidence
- Browser proof on /cprs/messages.
- Browser proof on /cprs/chart/46/tasks.
- Compile proof from pnpm -C apps/web exec tsc --noEmit.
