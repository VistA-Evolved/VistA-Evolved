# Phase 708 - CPRS Lab Acknowledge Dialog Truth Recovery

## User Request
- Continue the live clinician audit.
- Keep the UI, backend, and VistA behavior truthful and production-grade.
- Use VistA first and remove user-facing wording drift when the runtime contract has already improved.

## Implementation Steps
1. Confirm the existing lab acknowledge route contract remains the source of truth: real `ORWLRR ACK` when available and server-side draft fallback when the write cannot complete live.
2. Update the standalone CPRS lab acknowledge dialog so its success state no longer claims acknowledgements were stored locally when the route actually returns `mode: "draft"` from the server.
3. Keep the success styling and interaction model unchanged apart from the truth-copy correction.
4. Update the CPRS parity closure runbook so the Labs truth contract explicitly covers the standalone acknowledge dialog wording.
5. Update ops artifacts to record the copy-level truth recovery and the live verification already established for the route.

## Files Touched
- apps/web/src/components/cprs/dialogs/AcknowledgeLabDialog.tsx
- docs/runbooks/cprs-parity-closure-phase14.md
- ops/summary.md
- ops/notion-update.json