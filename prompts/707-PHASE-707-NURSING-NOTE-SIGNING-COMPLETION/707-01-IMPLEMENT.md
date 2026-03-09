# Phase 707 - Nursing Note Signing Completion

## User Request
- Continue the live clinician audit.
- Keep the UI, backend, and VistA behavior truthful and production-grade.
- Use VistA first and complete real missing workflows instead of leaving artificial deferrals.

## Implementation Steps
1. Confirm Docker, API, and VistA connectivity remain healthy before editing and verification.
2. Reuse the existing TIU sign workflow already implemented elsewhere in the repo instead of inventing a parallel signing path.
3. Update the standalone nursing note create route so it can optionally sign the TIU note immediately when an electronic signature code is provided.
4. Update the standalone nursing UI to collect an optional electronic signature code and clearly reflect whether the note was created only or created and signed.
5. Preserve truthful fallback behavior when TIU note creation or signing cannot complete in the sandbox.
6. Update nursing runbooks and ops artifacts to document the new live behavior and remaining constraints.

## Files Touched
- apps/api/src/routes/nursing/index.ts
- apps/web/src/app/cprs/nursing/page.tsx
- docs/runbooks/nursing-flowsheets.md
- docs/runbooks/nursing-grounding.md
- ops/summary.md
- ops/notion-update.json
