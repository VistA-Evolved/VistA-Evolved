# Phase 664 - CPRS Reports Empty Viewer Truthfulness Recovery

## Goal
Recover a clinician-visible Reports defect where selecting a live report can leave the viewer blank even though the panel implies a report is loaded.

## Problem Statement
The Reports panel calls `GET /vista/reports/text` and treats any `ok:true` response as displayable text.
For some live report definitions, including the `Imaging` report under Dept. of Defense Reports, VistA currently returns `ok:true` with an empty string body.
The panel then renders an empty `<pre>` block with no explanation.
That is not truthful UI behavior because the clinician cannot distinguish between loading, a rendering bug, and an intentionally empty report.

## Implementation Steps
1. Confirm the live `Imaging` report definition and response shape from `/vista/reports` and `/vista/reports/text`.
2. Patch `apps/web/src/components/cprs/panels/ReportsPanel.tsx` so blank or whitespace-only `text` payloads render a clear empty-state explanation.
3. Preserve existing behavior for non-empty report text, local-only report messaging, and request failures.
4. Update ops tracking artifacts for this recovery step.

## Files Touched
- `prompts/664-PHASE-664-CPRS-REPORTS-EMPTY-VIEWER-TRUTHFULNESS-RECOVERY/664-01-IMPLEMENT.md`
- `prompts/664-PHASE-664-CPRS-REPORTS-EMPTY-VIEWER-TRUTHFULNESS-RECOVERY/664-99-VERIFY.md`
- `apps/web/src/components/cprs/panels/ReportsPanel.tsx`
- `ops/summary.md`
- `ops/notion-update.json`