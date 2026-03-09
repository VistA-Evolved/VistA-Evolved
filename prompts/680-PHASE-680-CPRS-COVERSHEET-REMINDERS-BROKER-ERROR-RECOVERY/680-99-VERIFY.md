# Phase 680 - CPRS Cover Sheet Reminders Broker Error Recovery - VERIFY

Verification steps
1. Confirm Docker and API health.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /vista/cprs/reminders?dfn=46` and confirm the route returns either real reminders, `ok-empty`, or explicit integration-pending posture.
4. Open the Cover Sheet for DFN 46 and confirm the reminders card does not display broker error strings as reminder rows.
5. Run targeted diagnostics on touched files.

Acceptance
- Clinical Reminders never show leaked RPC error text as live chart data.