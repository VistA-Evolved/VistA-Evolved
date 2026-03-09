# Phase 691 Verify - CPRS AI Intake Action Truth Recovery

## Verify Goal

Prove the CPRS AI Assist Intake Summary action is not clickable when the current patient has no intake session to ground the request.

## Preconditions

- VEHU Docker lane running
- API reachable on `http://127.0.0.1:3001`
- Web reachable on `http://127.0.0.1:3000`
- Clinician credentials: `PRO1234 / PRO1234!!`

## Verification Steps

1. Authenticate as the clinician account.
2. Call `GET /intake/by-patient/46` and confirm the response is `{"ok":true,"sessions":[]}`.
3. Open `/cprs/chart/46/aiassist`.
4. Confirm the `Generate Intake Summary` button is disabled.
5. Confirm the panel shows truthful helper text that a real intake session is required.
6. Run `pnpm -C apps/web exec tsc --noEmit` and confirm the edited file remains clean.

## Expected Result

- No dead click remains in the AI Assist Intake Summary sub-tab for patients without intake sessions.
- The governed AI generation flow is still available for patients with real intake data.
