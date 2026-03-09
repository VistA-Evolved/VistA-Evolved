# Phase 672 - eMAR Nursing Schedule Orders Fallback Verify

## Verification Steps
1. Confirm Docker and API health before test execution.
2. Log in with `PRO1234 / PRO1234!!` against the running API.
3. Call `GET /emar/schedule?dfn=46` before and after the patch and compare the returned count.
4. Verify the post-patch response still includes `ok:true`, `source:"vista"`, and truthful `rpcUsed` values.
5. Verify the response includes medication rows derived from the active CPRS order feed when `ORWPS ACTIVE` is empty.
6. Confirm the heuristic warning remains explicit that real BCMA timing still requires `PSB MED LOG`.
7. Open the CPRS chart Nursing MAR tab for DFN `46` and confirm the active medication now renders instead of the empty-state message.
8. Confirm no fake administration history is introduced.

## Acceptance Criteria
- `GET /emar/schedule?dfn=46` returns at least one medication row for the known active medication patient.
- `rpcUsed` includes the fallback CPRS order RPCs when the fallback path is exercised.
- The Nursing MAR tab no longer tells the clinician there are no active medications for DFN `46`.
- The route remains VistA-backed and does not fabricate timing or history.
- The BCMA/PSB limitation messaging remains explicit and truthful.

## Files Touched
- `apps/api/src/routes/emar/index.ts`
- `ops/summary.md`

## Evidence
- Live API response for `GET /emar/schedule?dfn=46`
- Live browser proof from the Nursing MAR tab for DFN `46`