# Phase 48 Summary — Observability + Incident-Ready Runtime

## What Changed

### A: Centralized PHI Redaction (`phi-redaction.ts`)
- Single source of truth for all PHI/PII/credential field blocklists
- 17 credential fields, 24 PHI fields, 7 inline regex patterns
- `redactPhi()`, `sanitizeForAudit()`, `classifyField()` exports
- Logger now imports from phi-redaction.ts (no more scattered blocklists)

### B: RCM + Connector Metrics (6 new Prometheus metrics)
- `rcm_claims_total` (Gauge, by status)
- `rcm_pipeline_depth` (Gauge, by stage)
- `rcm_connector_call_duration_seconds` (Histogram)
- `rcm_connector_calls_total` (Counter, by outcome)
- `rcm_connector_health` (Gauge, 1=up/0=down)
- `unified_audit_entries_total` (Gauge, by source)

### C: Trace ID propagation
- Already wired from Phase 36 (OTel trace/span IDs in log entries)
- `withTraceId()` helper for audit detail enrichment
- Connector spans instrumented via connector-resilience.ts

### D: Connector Circuit Breakers (`connector-resilience.ts`)
- Per-connector CB FSM (closed -> open -> half-open)
- Configurable: `RCM_CB_THRESHOLD`, `RCM_CB_RESET_MS`, `RCM_CONNECTOR_RETRIES`
- Exponential backoff retry (base 2s)
- Prometheus metrics per connector call
- Admin endpoints: GET /admin/connector-cbs, POST /admin/connector-cb/reset

### E: Unified Audit Stream (`unified-audit.ts`)
- Single query across 3 audit stores (immutable, imaging, RCM)
- `queryUnifiedAudit()` with filters (sources, actionPrefix, actor, since, limit)
- `getUnifiedAuditStats()` returns combined stats
- Endpoints: GET /audit/unified, GET /audit/unified/stats

### F: Documentation
- `docs/runbooks/observability.md` — full metrics, logging, tracing reference
- `docs/runbooks/incident-response.md` — SEV levels, 5 common scenarios, correlation
- `docs/runbooks/log-redaction-policy.md` — PHI classification, enforcement, CI gate

### CI Lint Gate (`scripts/check-phi-fields.ts`)
- Scans all .ts source files for log calls with blocked field names
- Exit code 1 on violations

## Files Created (7)
- `apps/api/src/lib/phi-redaction.ts`
- `apps/api/src/lib/unified-audit.ts`
- `apps/api/src/rcm/connectors/connector-resilience.ts`
- `scripts/check-phi-fields.ts`
- `docs/runbooks/observability.md`
- `docs/runbooks/incident-response.md`
- `docs/runbooks/log-redaction-policy.md`

## Files Modified (3)
- `apps/api/src/telemetry/metrics.ts` — 6 new RCM/connector/audit metrics
- `apps/api/src/lib/logger.ts` — imports from phi-redaction.ts
- `apps/api/src/index.ts` — 5 new Phase 48 routes

## How to Test

```powershell
# 1. TypeScript check
cd apps/api ; pnpm exec tsc --noEmit

# 2. Unit tests
cd apps/api ; pnpm exec vitest run

# 3. PHI lint gate
npx tsx scripts/check-phi-fields.ts

# 4. API endpoints (requires server running)
curl http://127.0.0.1:3001/audit/unified
curl http://127.0.0.1:3001/audit/unified/stats
curl http://127.0.0.1:3001/admin/connector-cbs
curl http://127.0.0.1:3001/metrics/prometheus | grep rcm_
```

## Verification
- tsc --noEmit: CLEAN
- vitest: 5/7 test files pass (2 integration test files need running API -- same as before)
- 184 tests total: 147 pass, 21 ECONNREFUSED (integration), 16 skipped

## Follow-ups
- Wire `redactPhi()` into all 3 audit store `sanitizeDetail()` implementations
- Add periodic connector health polling (background timer)
- Create Phase 48 verifier script
- Wire `rcmPipelineDepth` gauge to `getPipelineStats()` on an interval
