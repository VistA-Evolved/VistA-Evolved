# Phase 712 - VERIFY: CPRS Session Expiry Truth Recovery

## Verification Steps

1. Confirm Docker and the API are healthy, then verify `/vista/ping` reaches VEHU.
2. Authenticate with `PRO1234 / PRO1234!!` and call `GET /auth/session` from the browser-backed web session.
3. Confirm `GET /vista/cprs/orders?dfn=46` returns live VistA orders in the same authenticated browser session.
4. Open `/cprs/chart/46/orders` and confirm the panel renders the live order rows with `Source: vista` during a fresh session.
5. Trigger a stale-session scenario by expiring or invalidating the API session, then refresh Orders.
6. Confirm the UI no longer settles into `Source: http-401` plus fake empty local-cache messaging.
7. Confirm stale session detection clears client auth state and returns the clinician toward `/cprs/login`.

## Acceptance Criteria

- The shared CPRS web session state does not remain authenticated indefinitely after the API starts returning 401.
- Orders treats live API 401 as session expiry, not as an empty-order posture.
- Fresh authenticated sessions still show the live VistA order list for DFN 46.
- Genuine `pending` behavior remains unchanged when the backend really returns a pending source.
