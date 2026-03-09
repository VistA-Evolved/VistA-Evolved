# Phase 642 - VERIFY - CPRS Reports Local-Only Truthfulness Recovery

## Verification Steps

1. Open `/cprs/chart/46/reports` as clinician.
2. Select a normal live report such as `Lab Status` with `One Week` and confirm report text still loads through `ORWRP REPORT TEXT`.
3. Select `Procedures (local only)` or `Surgery (local only)` and confirm the viewer shows a clear local-only explanation instead of blank text.
4. Call `GET /vista/reports/text?dfn=46&id=19` directly and confirm the response is a structured local-only result, not `ok:true` with empty text.
5. Confirm the grouped report tree and imaging widget behavior remain unchanged.

## Acceptance Criteria

1. Local-only report entries no longer masquerade as successful live-text reports.
2. Real VistA-backed report text routes still return `ok:true` for supported reports.
3. The Reports panel presents a truthful clinician-facing explanation for local-only entries.