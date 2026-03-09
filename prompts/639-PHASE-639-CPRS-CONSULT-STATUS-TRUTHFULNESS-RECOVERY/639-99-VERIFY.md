# Phase 639 - VERIFY - CPRS Consult Status Truthfulness Recovery

## Verification Steps

1. Open `/cprs/chart/46/consults` as clinician and confirm the empty state still shows `No consults on file` without any false pending banner.
2. Open `/cprs/chart/69/consults` and confirm the consult list renders clinician-readable statuses instead of raw VistA codes.
3. Use the filter dropdown on `/cprs/chart/69/consults` and verify:
   - `All Consults` shows every consult row
   - `Complete` shows completed or discontinued consults based on normalized live status
   - `Pending` only shows consults whose normalized category is still pending
4. Select a real consult and verify the detail pane still loads live `ORQQCN DETAIL` text.
5. Probe `GET /vista/consults?dfn=69` directly and confirm the API now includes readable `status` plus preserved raw code metadata.

## Acceptance Criteria

1. The Consults panel no longer shows raw status codes like `c` or `dc` as clinician-facing labels.
2. The `Pending` and `Complete` filters work against live VistA consult data.
3. `GET /vista/consults/detail` remains unchanged and truthful.
4. Empty-state behavior for patients with no consults remains correct.