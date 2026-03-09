# Phase 719 — IMPLEMENT: CPRS Inbox Notification Parse Recovery

## User Request

Continue the live CPRS audit and recover real user-facing defects so the built
product is truthful, VistA-first, and production-usable.

## Implementation Steps

1. Reproduce the inbox notification defect in the live clinician browser flow.
2. Inspect the `/vista/inbox` payload and the `ORWORB FASTUSER` parsing logic.
3. Correct the API parsing so raw caret-delimited notification payloads are
   converted into clinician-readable summaries.
4. Ensure `patientDfn` is only exposed when it is actually numeric so the UI
   does not render a fake `Open Chart` target from a timestamp.
5. Preserve the existing route contract for inbox items.
6. Re-run diagnostics, restart the API if needed, and re-verify the browser.

## Files Touched

- `apps/api/src/routes/inbox.ts`
- `docs/runbooks/vista-rpc-phase13-operationalization.md`
- `ops/summary.md`
- `ops/notion-update.json`