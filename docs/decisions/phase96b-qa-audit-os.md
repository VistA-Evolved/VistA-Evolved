# ADR: Phase 96B — QA/Audit OS v1.1

**Status:** Accepted  
**Date:** 2025-01-20  
**Decision Makers:** Engineering Team

## Context

VistA-Evolved lacked a unified QA infrastructure that could:

1. Trace all RPC calls with timing and PHI-safe metadata
2. Define clinical workflows as declarative JSON (not imperative test code)
3. Detect dead clicks automatically via Playwright crawling
4. Provide a central dashboard for QA visibility

Existing infrastructure (AsyncLocalStorage, X-Request-Id, Playwright config)
provided a foundation but no unified QA surface.

## Decision

Implement QA/Audit OS v1.1 with:

### 1. RPC Trace Ring Buffer

- In-memory ring buffer (max 5000 entries, FIFO eviction)
- PHI-safe: DUZ hashed, first param redacted, SSNs stripped
- Aggregates: top RPCs by count, avg/p95 duration, error rate
- Integrates with existing AsyncLocalStorage requestId

### 2. QA Flow Catalog

- 15 declarative JSON flow definitions in `config/qa-flows/`
- Covers: system health, auth, clinical reads, RCM CRUD, evidence, audit
- Three priority levels: smoke (always), regression (CI), deep (manual)
- Runner with variable substitution, step extraction, assertions

### 3. Test/QA Routes

- All routes under `/qa/` prefix
- **Guarded**: Only available when `NODE_ENV=test` or `QA_ROUTES_ENABLED=true`
- AUTH_RULES: "none" (own guard) — no session requirement
- Endpoints: traces, flows, results, dead-clicks, status

### 4. Playwright Specs

- `phase-replay.spec.ts`: Replays QA flows against API
- `dead-click-crawler.spec.ts`: Crawls admin pages, detects dead clicks

### 5. Admin UI

- QA Dashboard at `/cprs/admin/qa-dashboard`
- 4 tabs: RPC Traces, QA Flows, Flow Results, Dead Clicks

## Consequences

- **Positive:** Unified QA surface, declarative flows, automated dead-click detection
- **Negative:** QA routes must be explicitly enabled (not default-on)
- **Note:** RPC trace buffer is in-memory, resets on restart (intentional)

## File Inventory

| File                                                | Purpose                      |
| --------------------------------------------------- | ---------------------------- |
| `apps/api/src/qa/types.ts`                          | Type definitions             |
| `apps/api/src/qa/rpc-trace.ts`                      | RPC trace ring buffer        |
| `apps/api/src/qa/flow-catalog.ts`                   | Flow catalog loader + runner |
| `apps/api/src/qa/index.ts`                          | Module barrel                |
| `apps/api/src/routes/qa-routes.ts`                  | QA REST endpoints            |
| `config/qa-flows/*.json`                            | 15 flow definitions          |
| `apps/web/e2e/phase-replay.spec.ts`                 | Playwright phase replay      |
| `apps/web/e2e/dead-click-crawler.spec.ts`           | Dead-click crawler           |
| `apps/web/src/app/cprs/admin/qa-dashboard/page.tsx` | QA dashboard UI              |
