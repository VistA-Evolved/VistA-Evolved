# Phase 650 - CPRS Surgery Primary-Case Fallback Recovery (IMPLEMENT)

## User Request

Continue the clinician chart audit until the CPRS UI behaves truthfully and completely against live VistA data. Fix the next clinician-visible surgery gap instead of leaving a partial fallback that only works for linked document rows.

## Implementation Steps

1. Inventory the existing Surgery detail recovery logic in `apps/api/src/server/inline-routes.ts` and the CPRS Surgery panel behavior in `apps/web/src/components/cprs/panels/SurgeryPanel.tsx`.
2. Reproduce the live VEHU failure with DFN `69`, where the primary case row `10021` loads from `ORWSR LIST` but `GET /vista/surgery/detail?id=10021&dfn=69` returns `Surgery detail unavailable` because `ORWSR ONECASE` throws a VistA runtime error.
3. Confirm that the linked document rows for the same case (`3572`, `3571`, `3570`) resolve real operative text and detailed display through `ORWSR ONECASE`, `TIU GET RECORD TEXT`, and `TIU DETAILED DISPLAY`.
4. Patch the surgery detail fallback so a failing primary case header forces a clean broker reconnect before re-probing the linked surgery document rows from `ORWSR LIST`.
5. Keep the fix minimal and grounded. Do not fabricate operative content or suppress the original VistA runtime failure when no linked row can actually recover the case.
6. Update the relevant runbook plus ops artifacts only after live verification proves the primary case now resolves through the linked surgery document path.

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are healthy before editing.
2. Confirm `/health` and `/vista/ping` are healthy before live-testing the recovery.
3. Validate the touched API file with workspace diagnostics.
4. Login with the VEHU clinician account and call `GET /vista/surgery?dfn=69`.
5. Call `GET /vista/surgery/detail?id=10021&dfn=69` and confirm it now returns `ok:true` with `resolvedFromId` pointing at a linked document row.
6. Confirm the response includes `rpcUsed` entries for `ORWSR ONECASE`, `ORWSR LIST`, `TIU GET RECORD TEXT`, and `TIU DETAILED DISPLAY` when the linked TIU note resolves.
7. Verify in the browser that selecting the primary surgery case row surfaces the resolved operative note text instead of the red unavailable banner.

## Files Touched

- `apps/api/src/server/inline-routes.ts`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `ops/summary.md`
- `ops/notion-update.json`
- `prompts/650-PHASE-650-CPRS-SURGERY-PRIMARY-CASE-FALLBACK-RECOVERY/650-01-IMPLEMENT.md`
- `prompts/650-PHASE-650-CPRS-SURGERY-PRIMARY-CASE-FALLBACK-RECOVERY/650-99-VERIFY.md`