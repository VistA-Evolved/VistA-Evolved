# Phase 620 - VERIFY: CPRS Consults + Nursing Truthfulness Recovery

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy.
2. Confirm the API is healthy at `http://127.0.0.1:3001/health` and VistA is reachable at `/vista/ping`.
3. Log in with `PRO1234 / PRO1234!!` and call `GET /vista/consults?dfn=46`.
4. Confirm the consults read no longer returns the legacy `Connection closed before response` failure from the inline broker lifecycle path.
5. Log in with the same session and call `GET /vista/nursing/vitals?dfn=46`.
6. Confirm nursing vitals still return live VistA data when the RPC succeeds.
7. If nursing vitals are forced into failure, confirm the response posture is `request-failed`, not a generic integration-pending banner.
8. Reload the CPRS Consults and Nursing tabs in the browser and confirm the user-visible state matches the backend posture.

## Acceptance Criteria

- `/vista/consults?dfn=46` uses the session-bound resilient RPC path and returns truthful live data or explicit `request-failed` metadata.
- `/vista/consults/detail?id=<IEN>` uses the same resilient path.
- Nursing vitals runtime failures are labeled as request failures, not missing-capability placeholders.
- The browser no longer presents Consults as a silent legacy broker failure.
- The Nursing vitals tab distinguishes runtime failure from true integration-pending gaps.
