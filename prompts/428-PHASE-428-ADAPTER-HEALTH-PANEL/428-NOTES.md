# Phase 428 Notes

## Decisions
- No new API routes needed -- existing `/api/adapters/health` and `/vista/runtime-matrix` suffice
- Panel placed under admin sidebar as standalone page (not a tab within modules page)
- Follows established admin page layout conventions (cprs.module.css, tabs, status badges)
- 30s auto-refresh matches typical health monitoring intervals
- RPC Coverage tab has all/available/missing filter for quick triage
