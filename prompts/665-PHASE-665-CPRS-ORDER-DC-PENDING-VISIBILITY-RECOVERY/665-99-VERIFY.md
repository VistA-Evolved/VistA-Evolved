# Phase 665 - VERIFY - CPRS Order Discontinue Pending Visibility Recovery

## Verification Steps

1. Sign into `/cprs/chart/46/orders` as clinician.
2. Select an active VistA medication order and trigger `Discontinue`.
3. If the route returns a pending/unsigned discontinue outcome:
   - the Orders panel must keep the truthful pending banner
   - the active list must refresh automatically without requiring a manual `Refresh`
   - the new discontinue request must appear in the active list as `unsigned`
   - the original order may still remain active until the discontinue request is signed
4. Verify existing real-success and error messaging for discontinue remain intact.

## Acceptance Criteria

- No silent fake discontinue success is shown for unsigned discontinue responses.
- No manual refresh is required for the clinician to see the new unsigned discontinue request.
- The Orders panel remains VistA-first and does not invent a local-only completed discontinue state.
