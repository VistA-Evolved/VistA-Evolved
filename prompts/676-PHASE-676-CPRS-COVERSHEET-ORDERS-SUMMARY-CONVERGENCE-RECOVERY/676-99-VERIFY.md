# Phase 676 - VERIFY: CPRS Coversheet Orders Summary Convergence Recovery

## Verification Steps

1. Confirm the touched API files compile cleanly after the orders-summary convergence change.
2. Start from a fresh authenticated clinician browser session on `/cprs/chart/46/cover`.
3. Call `/vista/cprs/orders?dfn=46&filter=active` and `/vista/cprs/orders-summary?dfn=46` in the same session and compare the unsigned order rows.
4. Reload the Cover Sheet and capture the actual `/vista/cprs/orders-summary?dfn=46` network response during chart load.
5. Verify the Cover Sheet Orders Summary card matches the normalized active-orders truth and no longer renders duplicate discontinue rows or inflated unsigned counts.
6. Re-run the relevant verifier script or targeted route check needed to confirm no new regression was introduced in the CPRS read path.

## Acceptance Criteria

- Orders Summary and Orders tab converge on the same truthful unsigned-order data for the same patient and session.
- Cover Sheet reloads no longer produce duplicate fallback rows or incorrect unsigned counts.
- `/vista/cprs/orders-summary?dfn=46` remains VistA-backed and declares the actual RPCs used.
- No new TypeScript or lint errors are introduced in the touched files.
