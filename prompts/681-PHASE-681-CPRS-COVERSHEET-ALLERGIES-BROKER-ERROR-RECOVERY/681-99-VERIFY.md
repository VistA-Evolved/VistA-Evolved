# Phase 681 - VERIFY: CPRS Cover Sheet Allergies Broker Error Recovery

## User Request

- Continue autonomous VistA-first recovery work.
- Verify real clinician-facing behavior in the live browser, not just static code health.
- Keep the Cover Sheet truthful when VistA returns degraded or contaminated payloads.

## Verification Steps

1. Verify Docker shows healthy `vehu` and `ve-platform-db` containers.
2. Start or reuse the API with `.env.local` and confirm `/health` returns `ok:true` with platform PG healthy and no migration failures.
3. Log in with `PRO1234 / PRO1234!!` and capture an authenticated session cookie.
4. Call `GET /vista/allergies?dfn=46` and confirm the response contains real allergy rows from `ORQQAL LIST` or an explicit truthful pending payload.
5. Confirm the response never includes a fake allergy row whose id or allergen is actually foreign broker text such as `Remote Procedure '...' doesn't exist on the server.`.
6. Open the live CPRS Cover Sheet for DFN 46 and confirm the allergies card no longer renders false pending posture or leaked broker text.
7. Run targeted diagnostics for the touched backend file and confirm they stay clean.
8. Update runbook and ops artifacts to capture the verified recovery.

## Acceptance Criteria

- `GET /vista/allergies?dfn=46` no longer uses contaminated broker text as allergy data.
- The allergies route uses the session-bound pooled RPC path and preserves truthful response semantics.
- The live Cover Sheet allergies card reflects the real VEHU-backed result for DFN 46.
- The documented ops trail reflects the verified fix without claiming unsupported behavior.

## Files Touched

- prompts/681-PHASE-681-CPRS-COVERSHEET-ALLERGIES-BROKER-ERROR-RECOVERY/681-01-IMPLEMENT.md
- prompts/681-PHASE-681-CPRS-COVERSHEET-ALLERGIES-BROKER-ERROR-RECOVERY/681-99-VERIFY.md
- apps/api/src/server/inline-routes.ts
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json