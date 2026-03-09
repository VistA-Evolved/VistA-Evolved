# Phase 680 - CPRS Cover Sheet Reminders Broker Error Recovery

User request
- Continue autonomous VistA-first clinician workflow recovery until the live CPRS UI behaves truthfully.

Problem statement
- The Cover Sheet Clinical Reminders card can render a leaked broker error string such as `Remote Procedure 'ORWORB UNSIG ORDERS' doesn't exist on the server.` as if it were a real reminder row.
- The existing `/vista/cprs/reminders` route currently maps any non-empty line from `ORQQPX REMINDERS LIST` into a reminder record, even when the payload is actually a broker error or cross-RPC contamination.

Implementation steps
1. Reuse the existing Wave 1 broker error detection posture from other CPRS helper routes.
2. Harden `/vista/cprs/reminders` so broker error payloads and execution errors are never parsed into reminder rows.
3. Retry once when the reminders payload is clearly contaminated or malformed under concurrent Cover Sheet load.
4. Return truthful route posture: live results, `ok-empty`, or explicit integration-pending with pending targets.
5. Verify the Cover Sheet reminders card no longer renders broker error strings as clinician data.

Files touched
- apps/api/src/routes/cprs/wave1-routes.ts
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json