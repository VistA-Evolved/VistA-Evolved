# Phase 726 - Full Truth And UX Audit - VERIFY 92

## Verification Steps
1. Confirm `vehu` and `ve-platform-db` are healthy on the canonical stack.
2. Confirm `http://127.0.0.1:3001/health` returns `ok: true` and `http://127.0.0.1:3001/vista/ping` returns `ok: true`.
3. Open the canonical frontend and navigate to `/cprs/chart/46/cover` in an authenticated browser session.
4. Verify the chart shell loads the correct patient banner for DFN `46` and exposes live chart navigation instead of a placeholder shell.
5. Corroborate the chart shell using authenticated API fetches for the live chart baseline routes (`allergies`, `problems`, `vitals`, `medications`, `notes`, `labs`, `appointments`, `reminders`).
6. Switch between at least the cover sheet and one additional chart tab to prove tab navigation and panel rendering are live and not decorative.
7. If any truth defect is found, fix it at the source and re-run the browser proof plus the corroborating API fetches.
8. Update the Phase 726 browser audit artifact and ops records only after the chart shell is truthfully browser-proven.

## Acceptance Criteria
1. `/cprs/chart/46/cover` is browser-proven on the canonical stack with the correct patient context.
2. At least one additional chart tab is browser-proven through real navigation.
3. Any browser-visible chart-shell defect found during the pass is fixed at the root cause and re-proven.
4. Phase 726 artifacts and ops records are updated only with evidence-backed chart-shell findings.