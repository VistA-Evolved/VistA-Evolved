# Phase 621 - VERIFY: CPRS Orders Panel Session Recovery

## Verification Steps

1. Confirm the API is healthy and `/vista/ping` reaches VEHU.
2. Authenticate with `PRO1234 / PRO1234!!` and call `GET /vista/cprs/orders?dfn=46`.
3. Confirm the response contains live VistA order data for the patient.
4. Open the CPRS Orders tab in an authenticated browser session.
5. Confirm the panel no longer settles into `Source: pending` when the backend route is already returning `source: vista`.
6. Confirm the active medication order row is visible in the Orders tab for DFN 46.

## Acceptance Criteria

- Orders fetch waits for session readiness before evaluating panel posture.
- Authenticated Orders tab shows the live VistA order list instead of a fake empty cache view.
- Genuine pending behavior still works when the backend really returns pending posture.
