# Phase 661 - CPRS Labs Transition Selector Truthfulness Recovery - Verify

1. Authenticate as clinician and open `/cprs/chart/46/labs`.
2. Create a workflow lab order if one is not already present.
3. Attempt an invalid order transition such as `pending -> resulted`.
4. Confirm the backend still returns the rejection message.
5. Confirm the transition selector resets to the neutral `Transition...` state instead of remaining stuck on the invalid target.

## Acceptance Criteria

- Failed lab transitions do not leave the selector visually implying a successful state change.
- Backend lifecycle validation remains unchanged.
- The user sees a truthful error message and a truthful selector state.
