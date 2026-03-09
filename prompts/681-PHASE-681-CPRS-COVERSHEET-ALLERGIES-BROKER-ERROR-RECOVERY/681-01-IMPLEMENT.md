# Phase 681 - IMPLEMENT: CPRS Cover Sheet Allergies Broker Error Recovery

## User Request

- Continue autonomous VistA-first recovery work.
- Keep the full CPRS UI truthful from the live clinician perspective.
- Check prompt lineage before changing incomplete or degraded Cover Sheet behavior.

## Problem Statement

Live verification of the CPRS Cover Sheet for DFN 46 showed the allergies surface still degrading under the real VEHU-backed workflow. Direct API inspection confirmed that `GET /vista/allergies?dfn=46` can return a foreign broker error line from `ORWORB UNSIG ORDERS` and the current route blindly parses that line into a fake allergy row because it still uses the legacy singleton broker lifecycle. The Cover Sheet must show real allergy rows, a truthful live-empty state, or explicit pending posture only.

## Implementation Steps

1. Reconfirm the recent Cover Sheet recovery phases, especially the load-stability and Wave 1 RPC-context hardening work, so the allergies fix follows the same truthfulness contract.
2. Create a minimal backend-first fix in `GET /vista/allergies?dfn=` instead of masking the symptom in the frontend.
3. Move the route onto the authenticated, session-bound `safeCallRpc(...)` path so it uses the request-scoped pooled broker context.
4. Add broker/runtime contamination detection for foreign RPC error lines and other execution failures before any allergy rows are parsed.
5. Retry the allergy read once when the payload looks contaminated, then return truthful `integration-pending` posture if the retry still is not trustworthy.
6. Preserve the existing successful allergy parsing format for real `ORQQAL LIST` rows.
7. Re-verify the live route and the CPRS Cover Sheet for DFN 46 against VEHU.

## Verification Steps

1. Run targeted diagnostics on the touched backend file.
2. Confirm the API is running cleanly against live VEHU and platform DB.
3. Authenticate with `PRO1234 / PRO1234!!` and call `GET /vista/allergies?dfn=46`.
4. Verify the route returns real allergy data or explicit truthful pending posture, but never a fake allergy row built from foreign broker text.
5. Re-open the CPRS Cover Sheet for DFN 46 and confirm the allergies card no longer shows false pending or leaked RPC error text.

## Files Touched

- prompts/681-PHASE-681-CPRS-COVERSHEET-ALLERGIES-BROKER-ERROR-RECOVERY/681-01-IMPLEMENT.md
- prompts/681-PHASE-681-CPRS-COVERSHEET-ALLERGIES-BROKER-ERROR-RECOVERY/681-99-VERIFY.md
- apps/api/src/server/inline-routes.ts
- docs/runbooks/vista-rpc-phase12-parity.md
- ops/summary.md
- ops/notion-update.json