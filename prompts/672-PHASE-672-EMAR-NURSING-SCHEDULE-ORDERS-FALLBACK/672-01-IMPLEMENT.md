# Phase 672 - eMAR Nursing Schedule Orders Fallback

## Goal
Repair the clinician-facing MAR workflow when the VEHU lane returns no rows from `ORWPS ACTIVE` even though active medication orders are still visible in CPRS Orders.

## Implementation Steps
1. Verify the live defect with patient DFN `46` in both the chart Nursing MAR tab and the API route `GET /emar/schedule?dfn=46`.
2. Preserve the primary VistA-first read path through `ORWPS ACTIVE`.
3. When `ORWPS ACTIVE` returns an empty list, reuse live active medication orders from the CPRS orders RPC flow instead of returning a false empty MAR.
4. Use the existing medication-order inference signals already proven in the orders route so the fallback remains grounded in VistA data.
5. Derive schedule metadata heuristically from order text only when BCMA timing data is unavailable, and label the response clearly as heuristic.
6. Keep `rpcUsed` truthful by listing every fallback RPC actually called.
7. Avoid fake due times or fake administration history.
8. Keep the patch minimal and scoped to the eMAR schedule read path.

## Files Touched
- `apps/api/src/routes/emar/index.ts`
- `ops/summary.md`
- `prompts/672-PHASE-672-EMAR-NURSING-SCHEDULE-ORDERS-FALLBACK/672-01-IMPLEMENT.md`
- `prompts/672-PHASE-672-EMAR-NURSING-SCHEDULE-ORDERS-FALLBACK/672-99-VERIFY.md`

## Notes
- This phase fixes read-side clinician truthfulness only; BCMA write/logging still depends on unavailable PSB RPCs in the sandbox.
- The fallback must show what Orders already proves exists, not invent medications.