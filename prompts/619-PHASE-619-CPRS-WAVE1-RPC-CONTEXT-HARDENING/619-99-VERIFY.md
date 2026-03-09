# Phase 619 - CPRS Wave 1 RPC Context Hardening - Verify

## Verification Checklist

1. Confirm `vehu` and `ve-platform-db` are healthy before route verification.
2. Start the API with `.env.local` and confirm startup has no migration failures.
3. Authenticate with `PRO1234 / PRO1234!!` and call:
   - `/vista/cprs/orders-summary?dfn=46`
   - `/vista/cprs/appointments?dfn=46`
   - `/vista/cprs/reminders?dfn=46`
4. Verify responses are truthful and still include `rpcUsed` / pending metadata where appropriate.
5. Open the live CPRS Cover Sheet for DFN 46 and confirm:
   - appointments no longer show a false empty state while pending
   - fresh load cycles can retry transient pending states
   - orders/reminders/appointments remain readable after reload

## Expected Outcome

- Wave 1 Cover Sheet helper routes run on the session-bound pooled RPC path.
- No legacy singleton broker lifecycle remains in the touched routes.
- Cover Sheet cards show truthful pending vs empty posture.