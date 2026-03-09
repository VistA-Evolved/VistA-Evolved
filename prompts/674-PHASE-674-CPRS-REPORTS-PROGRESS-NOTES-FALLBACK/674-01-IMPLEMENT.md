# Phase 674 - CPRS Reports Progress Notes Fallback

## Goal
Recover the live Reports workflow when the `Progress Notes` report loads from the tree but `ORWRP REPORT TEXT` returns an empty payload for DFN 46 in the VEHU lane.

## Problem Statement
The Reports tree correctly exposes the live `Progress Notes` entry (`id=OR_PN`) from `ORWRP REPORT LISTS`.
Selecting that entry currently calls `GET /vista/reports/text?dfn=46&id=OR_PN`.
The live response is `ok:true` with an empty `text` field, so the UI shows the generic empty-report message even though the same patient has live TIU note documents and readable TIU note text.
That is not an acceptable clinician workflow because the report selection looks successful while hiding real patient note content that already exists elsewhere in the chart.

## Implementation Steps
1. Preserve `ORWRP REPORT TEXT` as the primary Reports text contract.
2. Confirm the live `Progress Notes` report definition and the blank `ORWRP REPORT TEXT` response for DFN 46.
3. Patch `apps/api/src/server/inline-routes.ts` so `GET /vista/reports/text` detects the `OR_PN` blank-report case and falls back to live TIU note documents using `TIU DOCUMENTS BY CONTEXT` and `TIU GET RECORD TEXT`.
4. Return explicit fallback provenance in the route response so the UI stays truthful about which VistA sources produced the displayed report.
5. Update the reports runbook and ops summary with the verified VEHU behavior and recovery contract.

## Files Touched
- `prompts/674-PHASE-674-CPRS-REPORTS-PROGRESS-NOTES-FALLBACK/674-01-IMPLEMENT.md`
- `prompts/674-PHASE-674-CPRS-REPORTS-PROGRESS-NOTES-FALLBACK/674-99-VERIFY.md`
- `apps/api/src/server/inline-routes.ts`
- `docs/runbooks/vista-rpc-phase12-parity.md`
- `ops/summary.md`