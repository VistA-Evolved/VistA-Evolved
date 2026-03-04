# Phase 96B — QA/Audit OS v1.1

**Prompt ref:** `prompts/101-PHASE-96B-QA-AUDIT-OS/96B-01-IMPLEMENT.md`

## User Request

Implement QA/Audit OS v1.1:

- RPC trace ring buffer with AsyncLocalStorage integration
- Test diagnostic routes (**test** NODE_ENV guard)
- QA flow catalog (15 JSON clinical workflow definitions)
- Playwright phase-replay spec + dead-click crawler enhanced spec
- Admin QA dashboard UI
- Verify script + docs

## Inventory

### Existing Infrastructure

- `apps/api/src/lib/logger.ts` — AsyncLocalStorage with requestId
- `apps/api/src/middleware/security.ts` — X-Request-Id + X-Trace-Id
- `apps/api/src/telemetry/` — OTel tracing + metrics + spans
- `apps/web/playwright.config.ts` — 19 spec files, 3 projects
- `apps/web/e2e/` — existing Playwright specs

### Files to Create

1. `apps/api/src/qa/rpc-trace.ts` — RPC trace ring buffer
2. `apps/api/src/qa/flow-catalog.ts` — QA flow catalog loader
3. `apps/api/src/qa/types.ts` — QA types
4. `apps/api/src/qa/index.ts` — QA module barrel
5. `apps/api/src/routes/qa-routes.ts` — Test/QA diagnostic routes
6. `config/qa-flows/` — 15 JSON flow definitions
7. `apps/web/e2e/phase-replay.spec.ts` — Phase replay Playwright spec
8. `apps/web/e2e/dead-click-crawler.spec.ts` — Enhanced dead-click crawler
9. `apps/web/src/app/cprs/admin/qa-dashboard/page.tsx` — QA dashboard UI
10. `scripts/verify-phase96b-qa-audit.ps1` — Verifier
11. `docs/decisions/phase96b-qa-audit-os.md` — ADR
12. `docs/runbooks/qa-audit-os.md` — Runbook

### Files to Modify

- `apps/api/src/index.ts` — register QA routes
- `apps/web/src/app/cprs/admin/layout.tsx` — add QA Dashboard nav

## Non-Negotiable Constraints

1. RPC trace ring buffer max 5000 entries, FIFO eviction
2. Test routes only available when NODE_ENV === 'test' or QA_ROUTES_ENABLED === 'true'
3. No PHI in trace entries — DFN hashed, patient names stripped
4. QA flows are declarative JSON — no imperative code in flow definitions
5. Dead-click crawler must detect onClick handlers that do nothing
