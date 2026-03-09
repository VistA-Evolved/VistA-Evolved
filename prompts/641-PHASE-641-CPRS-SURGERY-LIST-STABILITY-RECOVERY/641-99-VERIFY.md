# Phase 641 - VERIFY - CPRS Surgery List Stability Recovery

## Verification Steps

1. Open `/cprs/chart/69/surgery` as clinician.
2. Confirm the left table initially shows the four real surgical cases from `GET /vista/surgery?dfn=69`.
3. Select case `10021`.
4. Confirm the right pane shows the truthful surgery detail-unavailable error from Phase 640.
5. Confirm the left table still shows the original four surgery rows and does not collapse to `No surgical cases on file` while the case remains selected.
6. Confirm `/cprs/chart/46/surgery` still shows the genuine empty state.

## Acceptance Criteria

1. Selecting a surgery case no longer collapses a populated case list into an empty-state row.
2. The truthful Phase 640 surgery detail error remains visible for failing cases.
3. Genuine empty patients still show `No surgical cases on file`.