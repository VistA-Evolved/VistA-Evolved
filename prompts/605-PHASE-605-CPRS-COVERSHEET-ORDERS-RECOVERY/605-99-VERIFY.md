# Phase 605 — CPRS Cover Sheet Orders Recovery — VERIFY

## Verification Steps

1. Confirm Docker prerequisites:
   - `docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "vehu|ve-platform-db"`
2. Start the API with `.env.local` loaded and confirm clean startup logs.
3. Log in with `PRO1234 / PRO1234!!` and call:
   - `GET /vista/cprs/orders-summary?dfn=46`
4. Verify the route returns live output with `rpcUsed:["ORWORB UNSIG ORDERS"]`
   and either unsigned orders or a truthful empty result.
5. Open the CPRS chart cover sheet for patient DFN 46 and verify the orders
   card shows `No unsigned orders` only for live empty responses and shows the
   pending badge/message if the route is unavailable.
6. Run TypeScript validation for touched frontend code.
7. Run `scripts/verify-latest.ps1`.

## Acceptance Criteria

- Cover sheet orders summary no longer silently collapses route failure into an empty state.
- Live empty order summaries render the correct empty-state copy.
- Pending badge/modal wiring is used for actual unavailable states.
- TypeScript passes and repo verification remains green.
