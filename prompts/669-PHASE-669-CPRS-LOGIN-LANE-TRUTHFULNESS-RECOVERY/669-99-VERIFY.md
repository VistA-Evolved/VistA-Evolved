# Phase 669 - CPRS Login Lane Truthfulness Recovery

## Verification Steps
1. Verify the API is healthy and the web app is reachable.
2. Open /cprs/login in the browser with a clean unauthenticated session.
3. Confirm the login form no longer advertises the legacy PROV123 credentials as the default sandbox guidance.
4. Confirm the form now shows the verified VEHU clinician account PRO1234 / PRO1234!! in development mode.
5. Use the displayed credentials to sign in.
6. Verify the browser navigates to the requested CPRS chart route instead of remaining on the login page.
7. Confirm the result is truthful from a clinician perspective: the on-screen credentials are sufficient to reach the chart in the active lane.
8. Record any remaining post-login UI defects separately instead of masking them as login failures.

## Acceptance Criteria
- CPRS login no longer displays dead credentials for the current VEHU lane.
- Development-mode placeholder text is aligned with the live verified account.
- Development-mode helper content only shows credentials with live proof.
- Browser login with the displayed credentials reaches the chart successfully.
- Any unrelated post-login defects remain explicitly tracked rather than hidden.
