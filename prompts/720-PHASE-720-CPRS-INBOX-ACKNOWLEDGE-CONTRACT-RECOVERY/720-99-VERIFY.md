# Phase 720 - CPRS Inbox Acknowledge Contract Recovery Verify

## Verification Steps

1. Confirm Docker infra is running and the API is restarted on the required
   `npx tsx --env-file=.env.local src/index.ts` command.
2. Verify `GET /vista/inbox` still returns `ok: true` with live inbox items for
   the authenticated clinician session.
3. Verify `POST /vista/inbox/acknowledge` returns a structured response instead
   of `404 Not Found`.
4. Confirm the response includes `integrationPending` and a truthful explanation
   that `ORWORB KILL EXPIR MSG` is unavailable in the VEHU sandbox.
5. In the live browser, click `Acknowledge` on `/cprs/inbox` and confirm the
   page remains on the inbox view instead of surfacing `Not Found`.
6. Confirm the yellow `Integration Pending` banner appears and the acknowledged
   item remains visible, matching the documented posture.
7. Re-run `GET /vista/inbox` afterward to confirm the read path still works and
   no unrelated inbox regressions were introduced.

## Acceptance Criteria

- Inbox acknowledge no longer fails with a missing-route 404.
- The API contract is truthful about VistA persistence limits in VEHU.
- The browser surfaces integration-pending posture instead of a fatal page error.
- Existing inbox read behavior remains intact.
- Ops artifacts reference the live verification evidence.
