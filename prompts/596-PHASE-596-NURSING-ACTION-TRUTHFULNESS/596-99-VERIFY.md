# Phase 596 - Nursing Action Truthfulness Verify

## Verification Steps

1. Confirm `vehu` and `ve-platform-db` are running and healthy.
2. Start the API with `npx tsx --env-file=.env.local src/index.ts` and confirm `/health` returns `ok:true`.
3. Authenticate with the live API using the VEHU programmer account and capture the returned CSRF token.
4. Call `/vista/nursing/tasks?dfn=46` and confirm it returns a truthful ORWPS-derived task response instead of an unsupported placeholder.
5. Call `/emar/schedule?dfn=46` and `/vista/nursing/mar?dfn=46` and confirm both remain truthful about empty medication posture for this patient.
6. Call `POST /emar/barcode-scan` with a CSRF token and confirm the response reflects the live fallback posture rather than a transport/auth error.
7. Re-run the latest repo verification script and confirm the metadata change does not regress readiness.

## Acceptance Criteria

1. Nursing task, MAR, and administration actions in the action registry reflect the live route wiring and truthful RPC posture.
2. The eMAR runbook matches the actual chart-embedded nursing behavior and current CSRF-backed manual test flow.
3. Ops artifacts record the metadata correction so another engineer can follow the provenance.
4. Live verification remains reproducible against VEHU with DFN 46.

## Files Touched

- prompts/596-PHASE-596-NURSING-ACTION-TRUTHFULNESS/596-01-IMPLEMENT.md
- prompts/596-PHASE-596-NURSING-ACTION-TRUTHFULNESS/596-99-VERIFY.md
- apps/web/src/actions/actionRegistry.ts
- docs/runbooks/emar-bcma.md
- ops/summary.md
- ops/notion-update.json
