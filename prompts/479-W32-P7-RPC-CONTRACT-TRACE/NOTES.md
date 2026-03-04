# Phase 479 — W32-P7: NOTES

## Decisions

- Built on top of existing Phase 96B RPC trace buffer, not replacing it
- Contract traces are workflow-scoped (session model) vs ring buffer (all calls)
- JSONL format chosen for append-friendly, line-diffable traces
- Comparison ignores timing (VistA response times vary) — only checks RPC sequence
- Golden traces stored in `data/rpc-traces/golden/` (committed to repo)
- QA routes guard applies (NODE_ENV=test or QA_ROUTES_ENABLED=true)

## Risks

- Golden traces require VistA running to generate initially
- Golden baselines may need updating when VistA version changes (intentional drift)

## Follow-ups

- Auto-record golden traces during CI against known VistA instance
- Add `--update-golden` flag to comparison script
- Hook into webhook for VistA upgrade notifications
