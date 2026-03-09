# Phase 686 - VERIFY: eMAR Allergy PSB Grounding

## Verification Steps

1. Confirm Docker, API, and VistA health are clean.
2. Authenticate with `PRO1234 / PRO1234!!`.
3. Call `GET /emar/allergies?dfn=46` and confirm the response includes live
   `rpcUsed` evidence for both `ORQQAL LIST` and `PSB ALLERGY`.
4. Confirm the route no longer reports `PSB ALLERGY` as a pending target when
   the RPC is successfully called.
5. Open `/cprs/emar?dfn=46`, switch to `Allergy Warnings`, and confirm the UI
   presents live allergy table data plus truthful BCMA scan-time warning
   posture instead of stale `integration-pending` wording for `PSB ALLERGY`.

## Acceptance Criteria

- `/emar/allergies` returns `ok:true` with documented allergy rows.
- `rpcUsed` shows `PSB ALLERGY` when that RPC is callable.
- The standalone eMAR allergy tab no longer tells the clinician that
  `PSB ALLERGY` is integration-pending.
- No new diagnostics are introduced in touched files.
