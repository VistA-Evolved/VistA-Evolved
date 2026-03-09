# Phase 683 - CPRS Problem Write Contract Recovery

## User Request
- Continue until the clinician-facing UI is fully working from the end-user perspective.
- Stay VistA-first, use live VEHU verification, and recover any workflow that still degrades to draft or pending when it should write to VistA.

## Problem Statement
- Live browser testing on `/cprs/chart/46/problems` showed `+ New Problem` -> `Save Problem` returns `Problem saved as local draft (VistA sync pending).`
- Direct API verification confirmed `POST /vista/cprs/problems/add` still returns `mode: draft` even though `ORQQPL ADD SAVE` exists in VEHU.
- File 8994 metadata and live ORQQPL1 source show the current route is using the wrong parameter contract.

## Implementation Steps
1. Inventory the current CPRS problem add UI, API route, runbook, and previous Phase 599 recovery notes.
2. Probe the live VEHU routine contract for `ORQQPL ADD SAVE`, including `ORQQPL1` and `GMPLSAVE`, to confirm the correct literal and LIST parameters.
3. Update the active CPRS problem-add route to use the proven contract and pooled/session-safe RPC calling instead of the current positional fallback pattern.
4. Preserve truthful fallback behavior only for genuinely failing cases; do not report `mode: real` unless VEHU actually files the problem.
5. Update any affected clinician UI messaging if the backend contract changes shape.

## Files Touched
- apps/api/src/routes/cprs/wave2-routes.ts
- apps/web/src/components/cprs/dialogs/AddProblemDialog.tsx
- docs/runbooks/vista-rpc-add-problem.md
- ops/summary.md
- ops/notion-update.json
