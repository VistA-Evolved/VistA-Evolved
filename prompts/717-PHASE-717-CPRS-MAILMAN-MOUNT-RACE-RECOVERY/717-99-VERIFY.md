# Phase 717 — VERIFY: CPRS MailMan Mount Race Recovery

## Verification Steps

1. Confirm the API is live with `GET /health` and `GET /vista/ping`.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Open File > Messages / MailMan from an authenticated CPRS chart session.
4. Confirm the page does not show `Error: Connection closed before response`
   during initial load.
5. Confirm the inbox renders live VistA MailMan rows instead of falling into an
   empty-state posture caused by the mount race.
6. Probe the clinician MailMan API endpoints directly and confirm they still
   return `ok: true` with `source: "vista"`.
7. Run editor diagnostics on the touched route files.

## Acceptance Criteria

- `/cprs/messages` loads truthfully from a live authenticated CPRS session.
- The route layer no longer adds duplicate `connect()/disconnect()` handling
  around service calls that already use the broker lock.
- The MailMan routes preserve their response shape and audit behavior.
- Touched files report no relevant diagnostics.