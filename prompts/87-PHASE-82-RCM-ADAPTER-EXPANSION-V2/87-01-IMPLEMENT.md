# Phase 82 -- IMPLEMENT -- RCM Adapter Expansion v2

## Mission
Harden RCM platform for enterprise readiness:
- Payer registry tenant-scoped configuration
- Clearinghouse connector posture (honest state, no fake claims)
- Eligibility/status polling jobs with audit + rate limits
- Denial queue workflow scaffold with pendingTargets
- Connector state dashboard (real health, not fake results)

## Inventory (existing from Phases 38-69)
- 63 API files, ~13K lines, 100+ endpoints, 14 UI tabs
- PayerAdapter interface (eligibility, status, submit, denial)
- 10 connectors + 3 adapters (sandbox, x12, philhealth)
- InMemoryJobQueue with retry/backoff/DLQ
- PollingScheduler with rate limiting
- Eligibility + claim status pollers
- Workqueue store with priority + assignment

## What Phase 82 adds
1. `rcm-ops-dashboard.ts` -- new route file for ops-level queue + connector state endpoints
2. Tenant-scoped payer config helpers
3. Connector state normalization (pending/connected/degraded/disconnected)
4. Job audit integration (appendRcmAudit on every job complete/fail)
5. Denial queue scaffold with pendingTargets for each denied claim
6. Enhanced UI: connector state cards, queue depth gauges, denial queue with honest pending
7. E2E tests + verifier (75+ gates)

## Files touched
- apps/api/src/rcm/rcm-ops-routes.ts (NEW)
- apps/api/src/rcm/jobs/job-audit-bridge.ts (NEW)
- apps/api/src/rcm/connectors/connector-state.ts (NEW)
- apps/api/src/rcm/denial/denial-queue.ts (NEW)
- apps/web/src/app/cprs/admin/rcm/page.tsx (MODIFIED)
- apps/api/src/index.ts (MODIFIED -- register new routes)
- scripts/verify-phase82-rcm-adapter.ps1 (NEW)
- apps/api/e2e/rcm-ops.spec.ts (NEW)
