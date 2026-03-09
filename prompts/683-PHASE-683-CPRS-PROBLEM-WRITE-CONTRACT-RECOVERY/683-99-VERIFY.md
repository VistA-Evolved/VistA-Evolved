# Phase 683 - VERIFY: CPRS Problem Write Contract Recovery

## Verification Steps
1. Confirm Docker prerequisites are healthy for `vehu` and `ve-platform-db`.
2. Confirm API health at `http://127.0.0.1:3001/health` with `ok:true` and healthy platform PG.
3. Authenticate with `PRO1234 / PRO1234!!` and call `POST /vista/cprs/problems/add` using DFN 46 and a live lexicon-backed diagnosis.
4. Verify the HTTP response only reports `mode: real` if VEHU accepted the write and returned a real success payload.
5. Re-read the problem list and confirm the newly filed problem appears truthfully in API output.
6. Exercise the Problems tab in the browser and confirm the add workflow reports the same real-vs-fallback state as the API.
7. Run targeted diagnostics on modified files.

## Acceptance Criteria
- The route no longer uses the known-wrong positional `ORQQPL ADD SAVE` contract.
- Real VistA problem writes, if achieved, are proven with live VEHU data and follow-up readback.
- If VEHU still blocks the write, the response explains the remaining blocker truthfully without fake success.
- Browser and API outcomes match.
- Runbook and ops artifacts reflect the verified live posture.

## Files Touched
- apps/api/src/routes/cprs/wave2-routes.ts
- apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx
- docs/runbooks/vista-rpc-add-problem.md
- ops/summary.md
- ops/notion-update.json
