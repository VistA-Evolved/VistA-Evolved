# Phase 606 — CPRS Cover Sheet Cache Truthfulness Recovery — VERIFY

## Verification Steps

1. Confirm Docker prerequisites remain healthy:
   - `vehu`
   - `ve-platform-db`
2. Run targeted TypeScript verification for `apps/web`.
3. If the API was restarted for live checks, verify:
   - `GET /health`
   - `GET /vista/ping`
4. Authenticate with the clinician sandbox account and call representative cover-sheet routes for DFN 46:
   - `GET /vista/notes?dfn=46`
   - `GET /vista/labs?dfn=46`
   - `GET /vista/problems?dfn=46`
   - `GET /vista/medications?dfn=46`
5. Confirm the recovered cover-sheet cards now have action-registry coverage for pending modal wiring.
6. Regenerate phase metadata after adding Phase 606.
7. Run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-latest.ps1`.

## Acceptance Criteria

- Cache-backed cover sheet cards no longer silently render false empty-state copy when their backing fetch fails.
- `useDataCache()` preserves per-domain fetch metadata that the UI can consume without breaking existing data consumers.
- The cover sheet reuses the established pending badge/modal UX for affected cards.
- Cover-sheet action metadata is complete for the recovered cards.
- Live Wave 1 routes used for verification return real VistA-backed responses for DFN 46.
- Repo verification remains green after the Phase 606 closeout.

## Files Touched

- prompts/606-PHASE-606-CPRS-COVERSHEET-CACHE-TRUTHFULNESS-RECOVERY/606-01-IMPLEMENT.md
- prompts/606-PHASE-606-CPRS-COVERSHEET-CACHE-TRUTHFULNESS-RECOVERY/606-99-VERIFY.md
- apps/web/src/stores/data-cache.tsx
- apps/web/src/components/cprs/panels/CoverSheetPanel.tsx
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/phase56-wave1-layout.md
- ops/summary.md
- ops/notion-update.json