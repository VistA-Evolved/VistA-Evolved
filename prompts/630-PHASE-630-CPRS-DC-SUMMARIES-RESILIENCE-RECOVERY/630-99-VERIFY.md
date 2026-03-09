# Phase 630 - CPRS D/C Summaries Resilience Recovery - Verify

## Verification target

Ensure the D/C Summaries tab uses the resilient TIU route path and names the actual TIU RPC contract in frontend pending metadata.

## Required checks

1. `GET /vista/dc-summaries?dfn=46` uses `TIU DOCUMENTS BY CONTEXT` via the resilient wrapper.
2. D/C summary route failures return `ok:false`, `status:"request-failed"`, and a pending target naming `TIU DOCUMENTS BY CONTEXT`.
3. `GET /vista/tiu-text?id=...` uses the resilient wrapper rather than raw broker calls.
4. `dcSummaries` fallback targets in the web data cache name `TIU DOCUMENTS BY CONTEXT`, not `ORQQCN DCSUM`.
5. The D/C Summaries panel no longer shows a stale request-failed banner when the live route is actually returning `ok:true` with an empty result.