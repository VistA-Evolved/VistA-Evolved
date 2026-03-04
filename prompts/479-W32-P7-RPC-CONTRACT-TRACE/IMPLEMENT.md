# Phase 479 — W32-P7: RPC Contract Trace Recorder

## Goal

Create a contract trace recording system that captures RPC call sequences
for workflows, enables golden baseline comparison, and provides a CI-ready
comparison script.

## Implementation Steps

1. **Create `apps/api/src/qa/rpc-contract-trace.ts`**:
   - `TraceSession` type: workflow-scoped RPC call sequence
   - `startTraceSession()` / `recordTraceEntry()` / `endTraceSession()`
   - File I/O: write JSONL to `data/rpc-traces/`, save golden to `data/rpc-traces/golden/`
   - `compareTraces()`: positional diff (same RPC names, order, success pattern)
   - `WORKFLOW_TEMPLATES`: 3 pre-defined workflows (patient-search, note-create-sign, order-place)

2. **Export from `apps/api/src/qa/index.ts`** barrel module.

3. **Add routes to `apps/api/src/routes/qa-routes.ts`**:
   - `GET /qa/contract-traces` — list workflows, sessions, goldens
   - `POST /qa/contract-traces/sessions` — start session
   - `POST /qa/contract-traces/sessions/:id/entry` — record entry
   - `POST /qa/contract-traces/sessions/:id/end` — end + optional golden save
   - `GET /qa/contract-traces/sessions/:id` — get session detail
   - `POST /qa/contract-traces/sessions/:id/compare` — compare against golden

4. **Create `scripts/rpc-contract-compare.mjs`** — offline CI comparator:
   - `--list`: list golden baselines
   - `--all`: compare all workflows with traces
   - `<workflow>`: compare specific workflow
   - Exit 0 on pass, 1 on fail, 2 on missing golden

## Files Changed

- `apps/api/src/qa/rpc-contract-trace.ts` — new (core module)
- `apps/api/src/qa/index.ts` — added exports
- `apps/api/src/routes/qa-routes.ts` — added 6 contract trace endpoints
- `scripts/rpc-contract-compare.mjs` — new (CI script)

## No PHI

All params sanitized. DUZ hashed. DFN redacted. Timing-only metadata in traces.
