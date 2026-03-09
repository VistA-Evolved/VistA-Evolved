# Phase 694 - CPRS Tasks Reply Action Truth Recovery

## User Request
- Continue the live clinician audit until the CPRS/web experience is truthful, production-grade, and VistA-first.
- Fix real user-visible defects instead of speculative gaps.

## Implementation Steps
1. Inventory the Tasks inline reply workflow and confirm the current Send Reply action contract.
2. Verify live that opening a patient message reply composer exposes an enabled Send Reply button while the reply textarea is blank.
3. Confirm the handler blocks and only reports missing reply text after the click.
4. Patch the reply action gating so Send Reply stays disabled until trimmed reply text is present.
5. Preserve the existing submit-time validation as a defensive fallback.
6. Keep the change minimal and limited to action truthfulness.
7. Update runbook and ops artifacts to record the Tasks reply gating contract.
8. Re-verify in the browser and run frontend compile validation.

## Files Touched
- apps/web/src/components/cprs/panels/MessagingTasksPanel.tsx
- docs/runbooks/cprs-parity-closure-phase14.md
- ops/summary.md
- ops/notion-update.json

## Verification Notes
- Live page: /cprs/chart/46/tasks
- Live defect proof: opening Reply for a patient message exposed an enabled Send Reply button while the reply textarea was blank.
- Relevant message used for proof: Rate limit proof 7.