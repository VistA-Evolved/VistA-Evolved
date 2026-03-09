# Phase 650 - CPRS Surgery Primary-Case Fallback Recovery (VERIFY)

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy.
2. Confirm the API returns `ok:true` from `/health` and `/vista/ping`.
3. Validate the touched surgery route file with editor diagnostics.
4. Login with the VEHU clinician account and fetch `GET /vista/surgery?dfn=69`.
5. Fetch `GET /vista/surgery/detail?id=10021&dfn=69` and confirm the primary case no longer returns the `ORWSR ONECASE` runtime error banner path.
6. Confirm the response returns `ok:true`, a linked-note `noteId`, non-empty `text`, and grounded `rpcUsed` entries.
7. Confirm the Surgery panel for `/cprs/chart/69/surgery` shows the resolved operative report when selecting `LEFT INGUINAL HERNIA REPAIR WITH MESH`.
8. Confirm the panel still remains truthful for cases that genuinely have no linked TIU note.

## Acceptance Criteria

- The primary surgery case row can recover through a linked document row when the case-header `ORWSR ONECASE` call throws a VEHU runtime error.
- The surgery detail route reconnects cleanly before re-probing sibling document rows.
- Operative report text and detailed display are shown for the recovered case through live TIU RPCs.
- No synthetic surgery detail or fake operative text is introduced.