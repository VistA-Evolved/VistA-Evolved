# Phase 478 — W32-P6: NOTES

## Decisions
- Reused existing `capabilities.ts` route file rather than creating a new route file
- The `/vista/capabilities` endpoint requires session auth (inherits from `/vista/` catch-all)
- Snapshot script uses `fetch()` (Node 18+ built-in) — no npm dependencies
- Timestamped archives allow comparing capability changes across VistA updates

## Risks
- Snapshot script requires a running API with VistA connected
- Cookie-based auth may be awkward for CI; future: add API key or service auth

## Follow-ups
- Wire snapshot into CI to detect capability regressions
- Add diff tool to compare two snapshot files
